/**
 * ScannerService - Asistente de Extracción Inteligente para IASEP Farmacia
 * - Escaneo instantáneo de QR AFIP en Tickets
 * - Extracción por Visión con Google Gemini (Modelos Flash-Lite y Flash)
 * - Manejo de Cámara Web / Móvil con compresión client-side
 */

const ScannerService = (function () {
    // Modelos soportados ordenados por prioridad (mayor cuota / velocidad primero)
    const SUPPORTED_MODELS = [
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Recomendado - 500 RPD / 15 RPM)' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (500 RPD / 15 RPM)' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }
    ];

    let currentStream = null;
    let barcodeDetectorInstance = null;

    // Inicializar BarcodeDetector nativo si el navegador lo soporta
    if ('BarcodeDetector' in window) {
        try {
            barcodeDetectorInstance = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        } catch (e) {
            console.warn('BarcodeDetector no pudo ser inicializado:', e);
        }
    }

    /**
     * Obtener clave de API de Gemini guardada
     */
    function getApiKey() {
        return localStorage.getItem('gemini_api_key') || '';
    }

    /**
     * Guardar clave de API de Gemini
     */
    function setApiKey(key) {
        if (key) {
            localStorage.setItem('gemini_api_key', key.trim());
        } else {
            localStorage.removeItem('gemini_api_key');
        }
    }

    /**
     * Obtener modelo seleccionado o el predeterminado
     */
    function getSelectedModel() {
        return localStorage.getItem('gemini_selected_model') || 'gemini-3.5-flash-lite';
    }

    /**
     * Guardar modelo preferido
     */
    function setSelectedModel(modelId) {
        localStorage.setItem('gemini_selected_model', modelId);
    }

    /**
     * Decodificar Base64 seguro para URLs
     */
    function decodeBase64Safe(str) {
        // Reemplazar caracteres URL safe
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Rellenar con '=' faltantes si es necesario
        while (base64.length % 4) {
            base64 += '=';
        }
        try {
            return decodeURIComponent(escape(atob(base64)));
        } catch (e) {
            return atob(base64);
        }
    }

    /**
     * Parsea un texto de QR buscando el estándar de AFIP
     * Formato: https://www.afip.gob.ar/fe/qr/?p=BASE64
     */
    function parseAfipQr(qrText) {
        if (!qrText || typeof qrText !== 'string') return null;

        try {
            let pParam = null;
            if (qrText.includes('?p=') || qrText.includes('&p=')) {
                const match = qrText.match(/[?&]p=([^&#]+)/);
                if (match && match[1]) {
                    pParam = match[1];
                }
            } else if (qrText.startsWith('{') && qrText.endsWith('}')) {
                // Ya es un JSON directo
                const json = JSON.parse(qrText);
                if (json.importe !== undefined) {
                    return {
                        success: true,
                        importe: parseFloat(json.importe),
                        fecha: json.fecha,
                        cuit: json.cuit,
                        raw: json
                    };
                }
            }

            if (pParam) {
                const decodedJson = decodeBase64Safe(pParam);
                const json = JSON.parse(decodedJson);
                if (json && json.importe !== undefined) {
                    return {
                        success: true,
                        importe: parseFloat(json.importe),
                        fecha: json.fecha,
                        cuit: json.cuit,
                        nroCmp: json.nroCmp,
                        raw: json
                    };
                }
            }

            // Si es un número puro o formato de importe
            const numMatch = qrText.match(/TOTAL\s*[:$]?\s*([0-9.,]+)/i);
            if (numMatch) {
                const clean = numMatch[1].replace(/\./g, '').replace(',', '.');
                const val = parseFloat(clean);
                if (!isNaN(val)) return { success: true, importe: val };
            }
        } catch (error) {
            console.warn('Error al decodificar QR AFIP:', error);
        }

        return null;
    }

    /**
     * Comprime y redimensiona una imagen antes de enviarla a Gemini
     * para reducir el tiempo de subida a menos de 200ms
     */
    function optimizeImageForAI(imageElementOrCanvas, maxWidth = 1280) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            let width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.videoWidth || imageElementOrCanvas.width;
            let height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.videoHeight || imageElementOrCanvas.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageElementOrCanvas, 0, 0, width, height);

            // Exportar a base64 JPEG calidad 0.85
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            // Extraer solo la parte base64 sin el encabezado data:image/jpeg;base64,
            const base64Data = dataUrl.split(',')[1];
            resolve({ dataUrl, base64Data });
        });
    }

    /**
     * Llama a la API de Gemini con fallback inteligente de modelos
     */
    async function callGeminiVision(base64Image, promptText, preferredModel = null) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('No se ha configurado la API Key de Google Gemini. Ve a Configuración ⚙️ para ingresarla.');
        }

        const modelToUse = preferredModel || getSelectedModel();
        // Generar lista de modelos para intentar (el elegido primero, luego los demás)
        const modelsToTry = [
            modelToUse,
            ...SUPPORTED_MODELS.map(m => m.id).filter(id => id !== modelToUse)
        ];

        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [
                        {
                            parts: [
                                { text: promptText },
                                {
                                    inline_data: {
                                        mime_type: 'image/jpeg',
                                        data: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        response_mime_type: 'application/json',
                        temperature: 0.1
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    const errMsg = errJson.error ? errJson.error.message : response.statusText;
                    console.warn(`Error con modelo ${model} (${response.status}): ${errMsg}`);
                    lastError = new Error(`Modelo ${model}: ${errMsg}`);
                    // Si es rate limit (429) o modelo no encontrado (404), intentar el siguiente
                    if (response.status === 429 || response.status === 404) {
                        continue;
                    }
                    throw lastError;
                }

                const data = await response.json();
                const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textResponse) {
                    throw new Error('La respuesta de Gemini no contiene datos de texto.');
                }

                // Parsear respuesta JSON
                const parsed = JSON.parse(textResponse);
                return {
                    success: true,
                    data: parsed,
                    modelUsed: model
                };
            } catch (err) {
                lastError = err;
                console.warn(`Fallo con ${model}, evaluando fallback...`, err);
            }
        }

        throw lastError || new Error('No se pudo procesar la imagen con ningún modelo de Gemini.');
    }

    /**
     * Extrae datos de la receta médica IASEP (Afiliado y Troqueles de Medicamentos)
     */
    async function extractRecipeData(imageSource) {
        const { base64Data, dataUrl } = await optimizeImageForAI(imageSource);

        const prompt = `Observa atentamente esta foto del RECETARIO OFICIAL I.A.S.E.P. (Obra Social de Formosa).
Debes extraer con máxima exactitud los siguientes campos:
1. "APELLIDO Y NOMBRE" del afiliado (aparece en el casillero superior impreso por computadora, por ejemplo: "OLMEDO ERIS RAMON." o "ALMIRON ANTONIO ADRIAN"). Excluye leyendas secundarias como "Municipalidad de Ibarreta" o "Ministerio de Educación".
2. "NUMERO DE CARNET" o número de afiliado (aparece en el casillero debajo del nombre, típicamente con formato con guiones como "3-18437877-00" o "3-24651376-00"). Excluye campos adyacentes como "Sexo:" o "Edad:".
3. "PRODUCTOS" (Medicamentos facturados): Observa prioritariamente los troqueles adhesivos rectangulares pegados en la parte inferior del recetario (generalmente sobre el cartel de advertencia o recuadro inferior, cada uno tiene código de barras y texto del laboratorio). Extrae cada medicamento en formato limpio: "Nombre Dosis x Cantidad comp" (por ejemplo: "Corbis 10 x 60 comp", "Pampar 20 x 30 comp", "Turbulina 20 x 30 comp"). Si no hay troqueles pegados, busca los medicamentos en el cuerpo de prescripción o déjalo como lista vacía [].

Responde estrictamente un JSON válido con esta estructura:
{
  "nombre": "APELLIDO Y NOMBRE EN MAYUSCULAS",
  "afiliado": "NUMERO-DE-AFILIADO",
  "productos": [
    "Corbis 10 x 60 comp",
    "Pampar 20 x 30 comp",
    "Turbulina 20 x 30 comp"
  ]
}`;

        const result = await callGeminiVision(base64Data, prompt);
        const rawProds = result.data?.productos;
        let prodsList = [];
        if (Array.isArray(rawProds)) {
            prodsList = rawProds.map(p => String(p).trim()).filter(p => p.length > 0);
        } else if (typeof rawProds === 'string' && rawProds.trim()) {
            prodsList = rawProds.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        }

        return {
            ...result,
            nombre: (result.data?.nombre || '').toUpperCase().trim(),
            afiliado: (result.data?.afiliado || '').trim(),
            productos: prodsList,
            productosStr: prodsList.join(', '),
            previewUrl: dataUrl
        };
    }

    /**
     * Extrae importe total y productos de un ticket fiscal de farmacia (fallback cuando no hay QR)
     */
    async function extractTicketData(imageSource) {
        const { base64Data, dataUrl } = await optimizeImageForAI(imageSource);

        const prompt = `Observa este ticket fiscal de farmacia.
Debes extraer:
1. "TOTAL": El importe final a abonar (por ejemplo: "TOTAL 82486,80" o "TOTAL 113575,81"). Extrae el número decimal estándar con punto (ej: 82486.80).
2. "PRODUCTOS": Los medicamentos facturados que aparecen listados en las líneas de compra (por ejemplo: "Corbis 10 x 60 comp", "Pampar 20 x 30 comp", "Turbulina 20 x 30 comp"). Omite líneas de 'BONIF.' o bonificación.

Responde estrictamente un JSON válido:
{
  "importe": 82486.80,
  "productos": [
    "Corbis 10 x 60 comp",
    "Pampar 20 x 30 comp",
    "Turbulina 20 x 30 comp"
  ]
}`;

        const result = await callGeminiVision(base64Data, prompt);
        let rawImp = result.data?.importe;
        let importeNum = null;
        if (typeof rawImp === 'number') {
            importeNum = rawImp;
        } else if (typeof rawImp === 'string') {
            importeNum = parseFloat(rawImp.replace('$', '').replace(/\./g, '').replace(',', '.').trim());
        }

        const rawProds = result.data?.productos;
        let prodsList = [];
        if (Array.isArray(rawProds)) {
            prodsList = rawProds.map(p => String(p).trim()).filter(p => p.length > 0);
        } else if (typeof rawProds === 'string' && rawProds.trim()) {
            prodsList = rawProds.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        }

        return {
            ...result,
            importe: isNaN(importeNum) ? null : importeNum,
            productos: prodsList,
            productosStr: prodsList.join(', '),
            previewUrl: dataUrl
        };
    }

    /**
     * Iniciar cámara del dispositivo
     */
    async function startCamera(videoElement, facingMode = 'environment') {
        stopCamera();

        const constraints = {
            video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoElement) {
                videoElement.srcObject = currentStream;
                await videoElement.play();
            }
            return true;
        } catch (err) {
            console.error('Error al iniciar cámara:', err);
            // Fallback a cualquier cámara disponible
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoElement) {
                    videoElement.srcObject = currentStream;
                    await videoElement.play();
                }
                return true;
            } catch (fallbackErr) {
                throw new Error('No se pudo acceder a la cámara. Verifique los permisos en el navegador.');
            }
        }
    }

    /**
     * Detener la cámara activa
     */
    function stopCamera(videoElement = null) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        if (videoElement) {
            videoElement.srcObject = null;
        }
    }

    /**
     * Escanear código QR en un fotograma de video
     */
    async function scanQrFromVideo(videoElement) {
        if (!videoElement || videoElement.readyState < 2) return null;

        // 1. Intentar con BarcodeDetector nativo
        if (barcodeDetectorInstance) {
            try {
                const barcodes = await barcodeDetectorInstance.detect(videoElement);
                if (barcodes && barcodes.length > 0) {
                    for (const barcode of barcodes) {
                        const parsed = parseAfipQr(barcode.rawValue);
                        if (parsed) return parsed;
                    }
                }
            } catch (e) {
                // continuar con fallback
            }
        }

        // 2. Fallback con jsQR si está disponible en la página
        if (window.jsQR) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
                const parsed = parseAfipQr(code.data);
                if (parsed) return parsed;
            }
        }

        return null;
    }

    /**
     * Probar conexión con la API Key de Gemini
     */
    async function testApiKey(apiKey, modelId = null) {
        if (!apiKey) return { success: false, message: 'La clave no puede estar vacía.' };
        const model = modelId || getSelectedModel();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Responde estrictamente: {"status":"ok"}' }] }],
                    generationConfig: { response_mime_type: 'application/json' }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: err.error?.message || `Error HTTP ${response.status}`
                };
            }

            return {
                success: true,
                message: `¡Conexión exitosa con el modelo ${model}!`
            };
        } catch (e) {
            return {
                success: false,
                message: e.message || 'Error de red al conectar con Google AI Studio.'
            };
        }
    }

    return {
        SUPPORTED_MODELS,
        getApiKey,
        setApiKey,
        getSelectedModel,
        setSelectedModel,
        parseAfipQr,
        optimizeImageForAI,
        extractRecipeData,
        extractTicketData,
        startCamera,
        stopCamera,
        scanQrFromVideo,
        testApiKey
    };
})();
