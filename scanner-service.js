/**
 * ScannerService - Asistente de Extracción Inteligente para IASEP Farmacia
 * - Escaneo instantáneo de QR AFIP en Tickets
 * - Extracción por Visión con Google Gemini (Modelos Flash-Lite y Flash)
 * - Manejo de Cámara Web / Móvil con compresión client-side
 */

const ScannerService = (function () {
    // Modelos soportados (OpenRouter y Gemini Flash-Lite de máxima velocidad y menor latencia)
    const SUPPORTED_MODELS = [
        { id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek V4.1 Flash 1017 (OpenRouter - Ultra Rápido)', provider: 'openrouter' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Google AI Studio)', provider: 'gemini' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Google AI Studio)', provider: 'gemini' }
    ];

    let currentStream = null;
    let cameraSessionToken = 0;
    let barcodeDetectorInstance = null;

    // Inicializar BarcodeDetector nativo de forma segura según los formatos soportados
    if ('BarcodeDetector' in window) {
        if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
            window.BarcodeDetector.getSupportedFormats().then(supported => {
                const desired = ['qr_code', 'code_128', 'ean_13'].filter(f => supported.includes(f));
                if (desired.length > 0) {
                    barcodeDetectorInstance = new window.BarcodeDetector({ formats: desired });
                }
            }).catch(() => {
                try {
                    barcodeDetectorInstance = new window.BarcodeDetector({ formats: ['qr_code'] });
                } catch (e) { }
            });
        } else {
            try {
                barcodeDetectorInstance = new window.BarcodeDetector({ formats: ['qr_code'] });
            } catch (e) { }
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
     * Obtener clave de API de OpenRouter guardada
     */
    function getOpenRouterApiKey() {
        return localStorage.getItem('openrouter_api_key') || '';
    }

    /**
     * Guardar clave de API de OpenRouter
     */
    function setOpenRouterApiKey(key) {
        if (key) {
            localStorage.setItem('openrouter_api_key', key.trim());
        } else {
            localStorage.removeItem('openrouter_api_key');
        }
    }

    /**
     * Identificar el proveedor (openrouter o gemini) de un modelo
     */
    function getModelProvider(modelId) {
        const found = SUPPORTED_MODELS.find(m => m.id === modelId);
        return found ? found.provider : (modelId && modelId.startsWith('deepseek') ? 'openrouter' : 'gemini');
    }

    /**
     * Obtener modelo seleccionado o el predeterminado
     */
    function getSelectedModel() {
        const stored = localStorage.getItem('gemini_selected_model');
        if (stored && SUPPORTED_MODELS.some(m => m.id === stored)) {
            return stored;
        }
        return 'deepseek/deepseek-v4.1-flash-1017';
    }

    /**
     * Guardar modelo preferido
     */
    function setSelectedModel(modelId) {
        localStorage.setItem('gemini_selected_model', modelId);
    }

    /**
     * Estandariza un número de carnet IASEP al formato oficial canónico D-DDDDDDDD-DD (13 caracteres)
     * Ejemplos:
     * - "31843787700"   -> "3-18437877-00"
     * - "3-18437877-00" -> "3-18437877-00"
     * - "10823028600"   -> "1-08230286-00"
     * - "1823028600"    -> "1-08230286-00"
     */
    function formatCarnetIasep(val) {
        if (!val) return '';
        let str = val.toString().trim().replace(/[.,\-_/]+$/, '').trim();
        // Si ya cumple exactamente con la norma D-DDDDDDDD-DD (13 caracteres)
        if (/^\d-\d{8}-\d{2}$/.test(str)) {
            return str;
        }

        // Extraer únicamente los dígitos numéricos
        const digits = str.replace(/\D/g, '');

        // 11 dígitos: 1 de plan + 8 de DNI + 2 de parentesco
        if (digits.length === 11) {
            return `${digits.charAt(0)}-${digits.slice(1, 9)}-${digits.slice(9, 11)}`;
        }

        // 10 dígitos: 1 de plan + 7 de DNI + 2 de parentesco (se rellena DNI con 0 adelante)
        if (digits.length === 10) {
            return `${digits.charAt(0)}-0${digits.slice(1, 8)}-${digits.slice(8, 10)}`;
        }

        // Formato con guiones parciales o espacios: ej "3-1843787700" o "3 18437877 00" o "3-8230286-00"
        const m = str.match(/^(\d)[-\s]+(\d{7,8})[-\s]+(\d{1,2})$/);
        if (m) {
            const plan = m[1];
            const dni = m[2].padStart(8, '0');
            const parentesco = m[3].padStart(2, '0');
            return `${plan}-${dni}-${parentesco}`;
        }

        return str;
    }

    if (typeof window !== 'undefined') {
        window.formatCarnetIasep = formatCarnetIasep;
    }

    /**
     * Decodificar Base64 seguro para URLs con soporte UTF-8 completo
     */
    function decodeBase64Safe(str) {
        let clean = str;
        try {
            clean = decodeURIComponent(clean);
        } catch (e) { }
        let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        try {
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            try {
                return decodeURIComponent(escape(atob(base64)));
            } catch (err) {
                return atob(base64);
            }
        }
    }

    function extractNumericImporte(raw) {
        if (typeof raw === 'number' && !isNaN(raw)) return raw;
        if (typeof raw === 'string') {
            const clean = raw.trim().replace(/[^0-9.,]/g, '');
            if (clean.includes(',') && clean.includes('.')) {
                const n = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(n)) return n;
            } else if (clean.includes(',')) {
                const n = parseFloat(clean.replace(',', '.'));
                if (!isNaN(n)) return n;
            } else {
                const n = parseFloat(clean);
                if (!isNaN(n)) return n;
            }
        }
        return null;
    }

    /**
     * Parsea un texto de QR buscando el estándar de AFIP / ARCA y controladores fiscales
     * Formatos oficiales: https://www.afip.gob.ar/fe/qr/?p=BASE64, https://www.arca.gob.ar/fe/qr/?p=BASE64,
     * URLs con parámetros directos, JSON directo o cadenas delimitadas.
     */
    function parseAfipQr(qrText) {
        if (!qrText || typeof qrText !== 'string') return null;

        try {
            const cleanText = qrText.trim();

            // 1. AFIP / ARCA estándar en Base64 con parámetro ?p= o &p= (case-insensitive)
            let pParam = null;
            const pMatch = cleanText.match(/[?&]p=([^&#\s]+)/i);
            if (pMatch && pMatch[1]) {
                pParam = pMatch[1];
            } else if (cleanText.startsWith('http') && (cleanText.includes('afip.gob.ar') || cleanText.includes('arca.gob.ar'))) {
                const qIdx = cleanText.indexOf('?');
                if (qIdx !== -1) {
                    const query = cleanText.substring(qIdx + 1);
                    if (!query.includes('=')) {
                        pParam = query;
                    }
                }
            }

            if (pParam) {
                let decodedJson = decodeBase64Safe(pParam);
                if (!decodedJson.includes('{')) {
                    try { decodedJson = decodeBase64Safe(decodeURIComponent(pParam)); } catch (e) { }
                }
                if (decodedJson.includes('{')) {
                    try {
                        const start = decodedJson.indexOf('{');
                        const end = decodedJson.lastIndexOf('}');
                        const json = JSON.parse(decodedJson.substring(start, end + 1));
                        const rawImp = json.importe !== undefined ? json.importe : (json.impTotal !== undefined ? json.impTotal : (json.total !== undefined ? json.total : json.monto));
                        const num = extractNumericImporte(rawImp);
                        if (num !== null) {
                            return {
                                success: true,
                                importe: num,
                                fecha: json.fecha,
                                cuit: json.cuit,
                                nroCmp: json.nroCmp,
                                raw: json
                            };
                        }
                    } catch (errJson) {
                        console.warn('Error al parsear JSON de QR Base64:', errJson);
                    }
                }
            }

            // 2. Parámetros directos en URL (ej: cae.aspx?cuit=...&importe=73382.89 o &total=...)
            if (qrText.includes('?') || qrText.includes('&')) {
                const urlParamMatch = qrText.match(/[?&](?:importe|total|monto|imp|impTotal)=([0-9.,]+)/i);
                if (urlParamMatch && urlParamMatch[1]) {
                    const num = extractNumericImporte(urlParamMatch[1]);
                    if (num !== null && num > 0) {
                        return { success: true, importe: num, raw: qrText };
                    }
                }
            }

            // 3. Cadena Base64 directa
            if (qrText.startsWith('ey') || qrText.startsWith('ew')) {
                try {
                    const decodedJson = decodeBase64Safe(qrText);
                    if (decodedJson.includes('{')) {
                        const json = JSON.parse(decodedJson);
                        const rawImp = json.importe !== undefined ? json.importe : (json.impTotal !== undefined ? json.impTotal : (json.total !== undefined ? json.total : json.monto));
                        const num = extractNumericImporte(rawImp);
                        if (num !== null) {
                            return {
                                success: true,
                                importe: num,
                                fecha: json.fecha,
                                cuit: json.cuit,
                                nroCmp: json.nroCmp,
                                raw: json
                            };
                        }
                    }
                } catch (e) { }
            }

            // 4. JSON plano directo
            if (qrText.includes('{') && qrText.includes('}')) {
                const start = qrText.indexOf('{');
                const end = qrText.lastIndexOf('}');
                const json = JSON.parse(qrText.substring(start, end + 1));
                const rawImp = json.importe !== undefined ? json.importe : (json.impTotal !== undefined ? json.impTotal : (json.total !== undefined ? json.total : json.monto));
                const num = extractNumericImporte(rawImp);
                if (num !== null) {
                    return {
                        success: true,
                        importe: num,
                        fecha: json.fecha,
                        cuit: json.cuit,
                        nroCmp: json.nroCmp,
                        raw: json
                    };
                }
            }

            // 5. Valores delimitados por barras o punto y coma (Controladores Fiscales tradicionales)
            if (qrText.includes('|') || qrText.includes(';')) {
                const parts = qrText.split(/[|;]/);
                for (const part of parts) {
                    if (/^\d{1,9}[.,]\d{2}$/.test(part.trim())) {
                        const num = extractNumericImporte(part.trim());
                        if (num !== null && num > 0) return { success: true, importe: num, raw: qrText };
                    }
                }
            }

            // 6. Texto con patrón TOTAL / IMPORTE / MONTO
            const numMatch = qrText.match(/(?:TOTAL|IMPORTE|MONTO)\s*[:=]?\s*[$]?\s*([0-9.,]+)/i);
            if (numMatch) {
                const num = extractNumericImporte(numMatch[1]);
                if (num !== null) return { success: true, importe: num, raw: qrText };
            }
        } catch (error) {
            console.warn('Error al decodificar QR AFIP:', error, qrText);
        }

        return null;
    }

    function processLoadedElement(element, maxDimension) {
        const canvas = document.createElement('canvas');
        let width = element.naturalWidth || element.videoWidth || element.width || 1080;
        let height = element.naturalHeight || element.videoHeight || element.height || 1440;

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(element, 0, 0, width, height);

        // Exportar a base64 JPEG calidad 0.70 (~80-100 KB, sube en <150ms en 4G)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
        const base64Data = dataUrl.split(',')[1];
        // Liberar inmediatamente memoria GPU/backing-store del canvas (crítico en móviles PWA)
        canvas.width = 0;
        canvas.height = 0;
        return { dataUrl, base64Data };
    }

    /**
     * Comprime y redimensiona una imagen antes de enviarla a Gemini
     * Acepta VideoElement, ImageElement, CanvasElement o DataURL string
     */
    function optimizeImageForAI(imageSource, maxDimension = 1080) {
        return new Promise((resolve, reject) => {
            if (typeof imageSource === 'string') {
                const img = new Image();
                img.onload = () => resolve(processLoadedElement(img, maxDimension));
                img.onerror = (e) => reject(new Error('Error al cargar imagen en memoria'));
                img.src = imageSource;
                return;
            }
            resolve(processLoadedElement(imageSource, maxDimension));
        });
    }

    /**
     * Sanitiza y parsea respuestas JSON devueltas por modelos de IA
     */
    function parseJsonResponseSafe(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Respuesta vacía del modelo de IA.');
        }
        let clean = text.trim();
        // Eliminar bloques de código markdown ```json ... ``` o ``` ... ```
        if (clean.startsWith('```')) {
            clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        // Buscar el primer '{' y último '}' si aún hay texto alrededor
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(clean);
    }

    /**
     * Llama a la API de OpenRouter con una o múltiples imágenes (visión multimodal OpenAI-compatible)
     */
    async function callOpenRouterVisionMulti(base64ImagesArray, promptText, model = 'deepseek/deepseek-v4.1-flash-1017') {
        const apiKey = getOpenRouterApiKey();
        if (!apiKey) {
            throw new Error('No se ha configurado la API Key de OpenRouter. Ve a Configuración ⚙️ para ingresarla.');
        }

        const content = [{ type: 'text', text: promptText }];
        for (let i = 0; i < base64ImagesArray.length; i++) {
            const b64 = base64ImagesArray[i];
            const imgUrl = (typeof b64 === 'string' && b64.startsWith('data:')) ? b64 : `data:image/jpeg;base64,${b64}`;
            if (base64ImagesArray.length > 1) {
                content.push({
                    type: 'text',
                    text: i === 0 ? '--- IMAGEN 1: RECETARIO OFICIAL IASEP ---' : '--- IMAGEN 2: TICKET FISCAL ---'
                });
            }
            content.push({
                type: 'image_url',
                image_url: {
                    url: imgUrl
                }
            });
        }

        const payload = {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ],
            temperature: 0.1,
            max_tokens: 3500,
            reasoning: { effort: 'low' },
            response_format: { type: 'json_object' }
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin || 'https://iasep.farmacia',
                'X-Title': 'IASEP Farmacia App'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            const errMsg = errJson.error?.message || response.statusText;
            if (response.status === 401) {
                throw new Error('Clave de API de OpenRouter inválida o no autorizada (401). Verifica tu clave en Configuración ⚙️');
            }
            if (response.status === 402) {
                throw new Error('Saldo insuficiente en tu cuenta de OpenRouter (402). Por favor recarga créditos en openrouter.ai');
            }
            if (response.status === 429) {
                throw new Error('Límite de peticiones (Rate Limit) alcanzado en OpenRouter (429). Intenta nuevamente.');
            }
            throw new Error(`Error OpenRouter (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        let textResponse = choice?.message?.content;

        // Si content vino vacío pero hubo razonamiento, intentar extraer JSON del razonamiento
        if (!textResponse && choice?.message?.reasoning) {
            try {
                const parsedFromReasoning = parseJsonResponseSafe(choice.message.reasoning);
                return {
                    success: true,
                    data: parsedFromReasoning,
                    modelUsed: model
                };
            } catch (e) {
                // Continuar a la validación de error si no se pudo parsear
            }
        }

        if (!textResponse) {
            if (choice?.finish_reason === 'length') {
                throw new Error('El modelo de OpenRouter superó el límite de tokens durante el análisis visual. Por favor intenta nuevamente.');
            }
            throw new Error('La respuesta de OpenRouter no contiene texto.');
        }

        const parsed = parseJsonResponseSafe(textResponse);
        return {
            success: true,
            data: parsed,
            modelUsed: model
        };
    }

    /**
     * Llama a la API de Gemini con una o múltiples imágenes (visión multimodal nativa)
     */
    async function callGeminiVisionMulti(base64ImagesArray, promptText, preferredModel = null) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('No se ha configurado la API Key de Google Gemini. Ve a Configuración ⚙️ para ingresarla.');
        }

        const modelToUse = preferredModel || getSelectedModel();
        const geminiModels = SUPPORTED_MODELS.filter(m => m.provider === 'gemini').map(m => m.id);
        const modelsToTry = [
            modelToUse,
            ...geminiModels.filter(id => id !== modelToUse)
        ];

        let lastError = null;

        const parts = [{ text: promptText }];
        for (const b64 of base64ImagesArray) {
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: b64
                }
            });
        }

        for (const model of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{ parts }],
                    generationConfig: {
                        response_mime_type: 'application/json',
                        temperature: 0.1,
                        maxOutputTokens: 350
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

                const parsed = parseJsonResponseSafe(textResponse);
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
     * Enrutador unificado de visión AI: despacha a OpenRouter o Gemini según el modelo
     */
    async function callAIVisionMulti(base64ImagesArray, promptText, preferredModel = null) {
        const modelToUse = preferredModel || getSelectedModel();
        const provider = getModelProvider(modelToUse);
        if (provider === 'openrouter') {
            return callOpenRouterVisionMulti(base64ImagesArray, promptText, modelToUse);
        } else {
            return callGeminiVisionMulti(base64ImagesArray, promptText, modelToUse);
        }
    }

    /**
     * Llama al motor de visión con una sola imagen (wrapper retrocompatible)
     */
    async function callGeminiVision(base64Image, promptText, preferredModel = null) {
        return callAIVisionMulti([base64Image], promptText, preferredModel);
    }

    /**
     * Extrae datos de la receta médica IASEP (Afiliado y Troqueles de Medicamentos)
     */
    async function extractRecipeData(imageSource) {
        const { base64Data, dataUrl } = await optimizeImageForAI(imageSource);

        const prompt = `Observa atentamente esta foto del RECETARIO OFICIAL I.A.S.E.P. (Obra Social de Formosa).
Debes extraer con máxima exactitud únicamente los datos visibles en esta imagen:
1. "APELLIDO Y NOMBRE" del afiliado (aparece en el casillero superior impreso). IMPORTANTE: Remueve cualquier punto final o signo de puntuación al final del nombre. Excluye leyendas secundarias de organismo o empleador. Si no es legible, devuelve "".
2. "NUMERO DE CARNET" o número de afiliado (aparece en el casillero debajo del nombre, estrictamente en formato "D-DDDDDDDD-DD", ej. 1 dígito, guion, 8 dígitos, guion, 2 dígitos). Excluye campos adyacentes como "Sexo:" o "Edad:". Si no es legible, devuelve "".
3. "PRODUCTOS" (Medicamentos facturados): Observa prioritariamente los troqueles adhesivos rectangulares pegados en la parte inferior del recetario (con código de barras y texto del laboratorio). Extrae cada medicamento en formato limpio "Nombre Dosis x Cantidad comp". Si no hay troqueles pegados, busca los medicamentos en el cuerpo de prescripción o déjalo como lista vacía [].

IMPORTANTE: NUNCA inventes datos ni devuelvas textos de ejemplo si la imagen está borrosa, oscura o ilegible.

Responde estrictamente un JSON válido con esta estructura:
{
  "nombre": "APELLIDO NOMBRE",
  "afiliado": "0-00000000-00",
  "productos": []
}`;

        const result = await callGeminiVision(base64Data, prompt);
        const rawProds = result.data?.productos;
        let prodsList = [];
        if (Array.isArray(rawProds)) {
            prodsList = rawProds.map(p => String(p).trim()).filter(p => p.length > 0);
        } else if (typeof rawProds === 'string' && rawProds.trim()) {
            prodsList = rawProds.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        }

        let cleanNombre = (result.data?.nombre || '').toUpperCase().trim();
        // Quitar cualquier punto, coma o guión al final del nombre
        cleanNombre = cleanNombre.replace(/[.,\-_/]+$/, '').trim();

        let cleanAfiliado = formatCarnetIasep((result.data?.afiliado || '').trim());

        return {
            ...result,
            nombre: cleanNombre,
            afiliado: cleanAfiliado,
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
Debes extraer únicamente los datos visibles en esta imagen:
1. "TOTAL": El importe final a abonar (busca la línea 'TOTAL' o 'TOTAL $'). Extrae el número decimal estándar con punto (sin separador de miles). Si no es legible, devuelve null.
2. "PRODUCTOS": Los medicamentos facturados que aparecen listados en las líneas de compra. Omite líneas de 'BONIF.' o bonificación. Si no hay líneas legibles, devuelve [].

IMPORTANTE: NUNCA inventes datos ni devuelvas números de ejemplo si la imagen no es legible.

Responde estrictamente un JSON válido:
{
  "importe": null,
  "productos": []
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
     * Extrae datos combinados de RECETA y TICKET en UNA SOLA llamada a Gemini
     * (Optimización máxima: 50% menos peticiones y procesamiento conjunto)
     */
    async function extractCompleteRecipeAndTicket(recetaSource, ticketSource) {
        const [optReceta, optTicket] = await Promise.all([
            optimizeImageForAI(recetaSource),
            optimizeImageForAI(ticketSource)
        ]);

        const prompt = `Observa atentamente estas DOS imágenes:
IMAGEN 1: RECETARIO OFICIAL I.A.S.E.P. (Obra Social de Formosa).
Debes extraer únicamente lo visible en la IMAGEN 1:
1. "nombre": APELLIDO Y NOMBRE del afiliado en mayúsculas (casillero superior impreso). Quita cualquier punto final o signo de puntuación. Excluye leyendas de organismo/empleador. Si no es legible, devuelve "".
2. "afiliado": NUMERO DE CARNET / AFILIADO (debajo del nombre, formato "D-DDDDDDDD-DD"). Si no es legible, devuelve "".
3. "productos_receta": Medicamentos de los troqueles adhesivos pegados abajo o prescritos.

IMAGEN 2: TICKET FISCAL de la farmacia.
Debes extraer únicamente lo visible en la IMAGEN 2:
1. "importe": El importe TOTAL final a abonar (busca la línea 'TOTAL' o 'TOTAL $', como número decimal estándar con punto, sin separadores de miles). Si no es legible, devuelve null.
2. "productos_ticket": Medicamentos facturados en el ticket (omite líneas de 'BONIF.').

Combina todos los medicamentos de ambas imágenes en una sola lista limpia "productos" (o [] si no hay legibles).
IMPORTANTE: NUNCA inventes datos ni devuelvas valores de ejemplo si una imagen es borrosa, oscura o ilegible.

Responde estrictamente un JSON válido con esta estructura exacta:
{
  "nombre": "",
  "afiliado": "",
  "importe": null,
  "productos": []
}`;

        const result = await callAIVisionMulti([optReceta.base64Data, optTicket.base64Data], prompt);
        let cleanNombre = (result.data?.nombre || '').toUpperCase().trim().replace(/[.,\-_/]+$/, '').trim();
        let cleanAfiliado = formatCarnetIasep((result.data?.afiliado || '').trim());

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
            nombre: cleanNombre,
            afiliado: cleanAfiliado,
            importe: isNaN(importeNum) ? null : importeNum,
            productos: prodsList,
            productosStr: prodsList.join(', ')
        };
    }

    function stopTracks(stream) {
        if (stream && typeof stream.getTracks === 'function') {
            try {
                stream.getTracks().forEach(track => {
                    try { track.stop(); } catch (e) {}
                });
            } catch (e) {}
        }
    }

    function waitForVideoFrame(videoElement, timeoutMs = 1500) {
        if (!videoElement) return Promise.resolve();
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                clearInterval(poll);
                clearTimeout(timer);
                resolve();
            };
            const poll = setInterval(() => {
                if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    finish();
                }
            }, 50);
            const timer = setTimeout(finish, timeoutMs);
        });
    }

    /**
     * Verifica si el elemento de video tiene un stream en vivo con fotograma decodificado listo para capturar
     */
    function isVideoReady(videoElement) {
        if (!videoElement || !videoElement.srcObject) return false;
        if (videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) return false;
        if (typeof videoElement.srcObject.getVideoTracks === 'function') {
            const tracks = videoElement.srcObject.getVideoTracks();
            if (!tracks || tracks.length === 0 || !tracks.some(t => t.readyState === 'live')) {
                return false;
            }
        }
        return true;
    }

    /**
     * Captura un fotograma fresco del video en vivo y libera inmediatamente el canvas temporal
     */
    function captureFrame(videoElement, quality = 0.85) {
        if (!isVideoReady(videoElement)) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;
        return dataUrl;
    }

    /**
     * Iniciar cámara del dispositivo con protección contra carreras (race conditions) y fugas de stream
     */
    async function startCamera(videoElement, facingMode = 'environment') {
        stopCamera(videoElement);
        const myToken = ++cameraSessionToken;

        // Detectar si el dispositivo está en orientación vertical o es móvil
        const isPortrait = window.innerHeight > window.innerWidth || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        const videoConstraints = {
            facingMode: { ideal: facingMode }
        };

        if (isPortrait) {
            // En celulares en posición vertical, pedir resolución en formato vertical (3:4 / 9:16)
            videoConstraints.width = { ideal: 1080 };
            videoConstraints.height = { ideal: 1440 };
        } else {
            videoConstraints.width = { ideal: 1920 };
            videoConstraints.height = { ideal: 1080 };
        }

        const constraints = {
            video: videoConstraints,
            audio: false
        };

        let acquiredStream = null;
        try {
            acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.warn('Fallo con constraints ideales, reintentando con facingMode básico:', err);
            if (myToken !== cameraSessionToken) return false;
            try {
                acquiredStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: facingMode } },
                    audio: false
                });
            } catch (fallbackErr) {
                console.warn('Fallback a cualquier cámara disponible:', fallbackErr);
                if (myToken !== cameraSessionToken) return false;
                try {
                    acquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                } catch (finalErr) {
                    throw new Error('No se pudo acceder a la cámara. Verifique los permisos en el navegador.');
                }
            }
        }

        // Si mientras esperábamos getUserMedia el usuario cambió de paso o cerró el escáner, liberar inmediatamente
        if (myToken !== cameraSessionToken) {
            stopTracks(acquiredStream);
            return false;
        }

        currentStream = acquiredStream;

        if (videoElement) {
            videoElement.srcObject = currentStream;
            await videoElement.play();
            if (myToken !== cameraSessionToken) {
                stopCamera(videoElement);
                return false;
            }
            await waitForVideoFrame(videoElement, 1500);
            if (myToken !== cameraSessionToken) {
                stopCamera(videoElement);
                return false;
            }
        }
        return true;
    }

    /**
     * Detener la cámara activa y vaciar el buffer de fotogramas del elemento <video>
     */
    function stopCamera(videoElement = null) {
        cameraSessionToken++;
        if (currentStream) {
            stopTracks(currentStream);
            currentStream = null;
        }
        if (videoElement) {
            if (videoElement.srcObject) {
                stopTracks(videoElement.srcObject);
            }
            try {
                if (typeof videoElement.pause === 'function') videoElement.pause();
            } catch (e) {}
            videoElement.srcObject = null;
            try {
                if (typeof videoElement.removeAttribute === 'function') videoElement.removeAttribute('src');
                if (typeof videoElement.load === 'function') videoElement.load();
            } catch (e) {}
        }
    }

    /**
     * Escanear código QR en un fotograma de video
     */
    // Canvas reutilizables para escaneo QR sin memory leaks
    let qrCropCanvas = null;
    let qrCropCtx = null;
    let qrScanCanvas = null;
    let qrScanCtx = null;

    /**
     * Escanear código QR en un fotograma de video (optimizado para máxima nitidez en tickets)
     */
    async function scanQrFromVideo(videoElement) {
        if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth) return null;

        // 1. Intentar con BarcodeDetector nativo si el navegador lo soporta (aceleración por hardware)
        if (barcodeDetectorInstance) {
            try {
                const barcodes = await barcodeDetectorInstance.detect(videoElement);
                if (barcodes && barcodes.length > 0) {
                    for (const barcode of barcodes) {
                        const parsed = parseAfipQr(barcode.rawValue);
                        if (parsed && parsed.importe) return parsed;
                        return { success: true, qrRaw: barcode.rawValue, importe: null };
                    }
                }
            } catch (e) {
                // continuar con fallback
            }
        }

        // 2. Fallback con biblioteca jsQR
        const qrScanner = window.jsQR || (typeof jsQR !== 'undefined' ? jsQR : null);
        if (!qrScanner) return null;

        const vw = videoElement.videoWidth;
        const vh = videoElement.videoHeight;

        // PASO 1: Escaneo del centro/recuadro del ticket a alta resolución (mantiene nítidos los módulos del QR de AFIP)
        try {
            if (!qrCropCanvas) {
                qrCropCanvas = document.createElement('canvas');
                qrCropCtx = qrCropCanvas.getContext('2d', { willReadFrequently: true });
            }

            // Tomar 85% de ancho y 75% de alto en el centro (área donde el usuario coloca el ticket)
            const cropW = Math.round(vw * 0.85);
            const cropH = Math.round(vh * 0.75);
            const cropX = Math.round((vw - cropW) / 2);
            const cropY = Math.round((vh - cropH) / 2);

            // Escala a máx 640px para procesar en ~10-15ms sin perder contraste
            const maxCropDim = 640;
            let drawW = cropW;
            let drawH = cropH;
            if (drawW > maxCropDim || drawH > maxCropDim) {
                const scale = maxCropDim / Math.max(drawW, drawH);
                drawW = Math.round(drawW * scale);
                drawH = Math.round(drawH * scale);
            }

            if (qrCropCanvas.width !== drawW || qrCropCanvas.height !== drawH) {
                qrCropCanvas.width = drawW;
                qrCropCanvas.height = drawH;
            }

            qrCropCtx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, drawW, drawH);
            const cropImageData = qrCropCtx.getImageData(0, 0, drawW, drawH);

            const cropCode = qrScanner(cropImageData.data, drawW, drawH, {
                inversionAttempts: 'attemptBoth'
            });

            if (cropCode && cropCode.data) {
                const parsed = parseAfipQr(cropCode.data);
                if (parsed && parsed.importe) return parsed;
                return { success: true, qrRaw: cropCode.data, importe: null };
            }
        } catch (cropErr) {
            console.warn('Escaneo crop QR:', cropErr);
        }

        // PASO 2: Si el crop no detectó, escanear el fotograma completo
        try {
            if (!qrScanCanvas) {
                qrScanCanvas = document.createElement('canvas');
                qrScanCtx = qrScanCanvas.getContext('2d', { willReadFrequently: true });
            }

            const maxDim = 640;
            let targetW = vw;
            let targetH = vh;
            if (targetW > maxDim || targetH > maxDim) {
                const scale = maxDim / Math.max(targetW, targetH);
                targetW = Math.round(targetW * scale);
                targetH = Math.round(targetH * scale);
            }

            if (qrScanCanvas.width !== targetW || qrScanCanvas.height !== targetH) {
                qrScanCanvas.width = targetW;
                qrScanCanvas.height = targetH;
            }

            qrScanCtx.drawImage(videoElement, 0, 0, targetW, targetH);
            const fullImageData = qrScanCtx.getImageData(0, 0, targetW, targetH);

            const code = qrScanner(fullImageData.data, targetW, targetH, {
                inversionAttempts: 'attemptBoth'
            });

            if (code && code.data) {
                const parsed = parseAfipQr(code.data);
                if (parsed && parsed.importe) return parsed;
                return { success: true, qrRaw: code.data, importe: null };
            }
        } catch (fullErr) {
            console.warn('Escaneo full QR:', fullErr);
        }

        return null;
    }

    /**
     * Probar conexión con la API Key correspondiente según el modelo (OpenRouter o Gemini)
     */
    async function testApiKey(apiKey, modelId = null) {
        if (!apiKey) return { success: false, message: 'La clave no puede estar vacía.' };
        const model = modelId || getSelectedModel();
        const provider = getModelProvider(model);

        if (provider === 'openrouter') {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey.trim()}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin || 'https://iasep.farmacia',
                        'X-Title': 'IASEP Farmacia App'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'user', content: 'Responde estrictamente un JSON válido: {"status":"ok"}' }
                        ],
                        max_tokens: 350,
                        reasoning: { effort: 'low' },
                        response_format: { type: 'json_object' }
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        message: err.error?.message || `Error HTTP ${response.status} en OpenRouter`
                    };
                }

                return {
                    success: true,
                    message: `¡Conexión exitosa con OpenRouter (${model})!`
                };
            } catch (e) {
                return {
                    success: false,
                    message: e.message || 'Error de red al conectar con OpenRouter.'
                };
            }
        }

        // Caso Google Gemini:
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Responde estrictamente: {"status":"ok"}' }] }],
                    generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 50 }
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
        getOpenRouterApiKey,
        setOpenRouterApiKey,
        getModelProvider,
        getSelectedModel,
        setSelectedModel,
        parseAfipQr,
        optimizeImageForAI,
        callOpenRouterVisionMulti,
        callGeminiVisionMulti,
        callAIVisionMulti,
        extractRecipeData,
        extractTicketData,
        extractCompleteRecipeAndTicket,
        startCamera,
        stopCamera,
        isVideoReady,
        captureFrame,
        scanQrFromVideo,
        testApiKey,
        formatCarnetIasep
    };
})();

if (typeof window !== 'undefined') {
    window.ScannerService = ScannerService;
}
