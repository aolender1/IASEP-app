// Identificador del operador o dispositivo móvil actual
function obtenerNombreOperador() {
    return localStorage.getItem('nombre_dispositivo') || (window.innerWidth <= 768 ? 'Celular 1' : 'Principal');
}
window.obtenerNombreOperador = obtenerNombreOperador;

// Cargar datos de la farmacia desde Neon al iniciar
document.addEventListener('DOMContentLoaded', async function () {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') || localStorage.getItem('isLoggedIn');
    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    if (isLoggedIn && userEmail) {
        await cargarDatosFarmacia();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const clienteInput = document.getElementById('cliente');
    const afiliadoInput = document.getElementById('afiliado');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsContainerAfiliado = document.getElementById('suggestions-container-afiliado');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirDatosExcelButton = document.getElementById('subirDatosExcel'); // Nuevo botón
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle'); // Interruptor de tema
    const btnDictado = document.getElementById('btnDictado'); // Botón de dictado cliente
    const btnDictadoAfiliado = document.getElementById('btnDictadoAfiliado'); // Botón de dictado afiliado
    const btnDictadoManual = document.getElementById('btnDictadoManual'); // Botón de dictado manual

    // --- VARIABLES Y LÓGICA DE DICTADO POR VOZ ---
    let dictationActive = false;
    let dictationSource = 'MAIN'; // 'MAIN', 'MAIN_AFILIADO' o 'MANUAL'
    let dictationState = 'INACTIVO'; // CLIENTE, AFILIADO, IMPORTE, MANUAL_CLIENTE, MANUAL_AFILIADO, MANUAL_IMPORTE
    let dictationFilteredClientes = [];
    let recognition = null;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'es-AR';

        recognition.onstart = function () {
            dictationActive = true;
            if (dictationSource === 'MAIN') {
                dictationState = 'CLIENTE';
                if (!baseDatos || baseDatos.length === 0) {
                    mostrarNotificacion('Advertencia', 'Por favor, cargue la base de Excel antes de usar el dictado o no encontrará los clientes.', 'error');
                }
                dictationFilteredClientes = baseDatos.length > 0 ? baseDatos : [];
                if (btnDictado) {
                    btnDictado.style.backgroundColor = '#ff4757';
                    btnDictado.style.color = '#ffffff';
                    btnDictado.style.borderColor = '#ff4757';
                    const offIcon = btnDictado.querySelector('.mic-off');
                    const onIcon = btnDictado.querySelector('.mic-on');
                    if (offIcon) offIcon.style.display = 'none';
                    if (onIcon) onIcon.style.display = 'block';
                }
                mostrarNotificacion('Dictado Activado', 'Diga el APELLIDO y NOMBRE del cliente.', 'success');
            } else if (dictationSource === 'MAIN_AFILIADO') {
                dictationState = 'AFILIADO';
                if (!baseDatos || baseDatos.length === 0) {
                    mostrarNotificacion('Advertencia', 'Por favor, cargue la base de Excel antes de usar el dictado.', 'error');
                }
                if (btnDictadoAfiliado) {
                    btnDictadoAfiliado.style.backgroundColor = '#ff4757';
                    btnDictadoAfiliado.style.color = '#ffffff';
                    btnDictadoAfiliado.style.borderColor = '#ff4757';
                    const offIcon = btnDictadoAfiliado.querySelector('.mic-off');
                    const onIcon = btnDictadoAfiliado.querySelector('.mic-on');
                    if (offIcon) offIcon.style.display = 'none';
                    if (onIcon) onIcon.style.display = 'block';
                }
                mostrarNotificacion('Dictado por N° Afiliado', 'Diga el NÚMERO DE AFILIADO (ej: uno guion cero ocho dos...).', 'success');
            } else if (dictationSource === 'MANUAL') {
                dictationState = 'MANUAL_CLIENTE';
                if (btnDictadoManual) {
                    btnDictadoManual.style.backgroundColor = '#ff4757';
                    btnDictadoManual.style.color = '#ffffff';
                    btnDictadoManual.style.borderColor = '#ff4757';
                    const offIcon = btnDictadoManual.querySelector('.mic-off');
                    const onIcon = btnDictadoManual.querySelector('.mic-on');
                    if (offIcon) offIcon.style.display = 'none';
                    if (onIcon) onIcon.style.display = 'block';
                }
                mostrarNotificacion('Dictado Manual', 'Diga el APELLIDO y NOMBRE del cliente nuevo.', 'success');
            }
        };

        recognition.onend = function () {
            if (dictationActive) {
                try {
                    recognition.start();
                } catch (e) {
                    apagarDictado();
                }
            } else {
                apagarDictado();
            }
        };

        recognition.onerror = function (event) {
            console.error('Error dictado:', event.error);
            if (event.error === 'not-allowed') {
                mostrarNotificacion('Error', 'Debe dar permisos de micrófono al navegador para usar esta función.', 'error');
                dictationActive = false;
                apagarDictado();
            }
        };

        recognition.onresult = function (event) {
            const current = event.resultIndex;
            let transcript = event.results[current][0].transcript.toLowerCase().trim();
            console.log("Dictado Transcripción:", transcript);
            procesarDictado(transcript);
        };
    }

    function apagarDictado() {
        dictationActive = false;
        dictationState = 'INACTIVO';
        dictationFilteredClientes = [];
        if (btnDictado) {
            btnDictado.style.backgroundColor = '';
            btnDictado.style.color = '';
            btnDictado.style.borderColor = '';
            const offIcon = btnDictado.querySelector('.mic-off');
            const onIcon = btnDictado.querySelector('.mic-on');
            if (offIcon) offIcon.style.display = 'block';
            if (onIcon) onIcon.style.display = 'none';
        }
        if (btnDictadoAfiliado) {
            btnDictadoAfiliado.style.backgroundColor = '';
            btnDictadoAfiliado.style.color = '';
            btnDictadoAfiliado.style.borderColor = '';
            const offIcon = btnDictadoAfiliado.querySelector('.mic-off');
            const onIcon = btnDictadoAfiliado.querySelector('.mic-on');
            if (offIcon) offIcon.style.display = 'block';
            if (onIcon) onIcon.style.display = 'none';
        }
        if (btnDictadoManual) {
            btnDictadoManual.style.backgroundColor = '';
            btnDictadoManual.style.color = '';
            btnDictadoManual.style.borderColor = '';
            const offIcon = btnDictadoManual.querySelector('.mic-off');
            const onIcon = btnDictadoManual.querySelector('.mic-on');
            if (offIcon) offIcon.style.display = 'block';
            if (onIcon) onIcon.style.display = 'none';
        }
        if (recognition) {
            try { recognition.stop(); } catch (e) { }
        }
    }

    if (btnDictado) {
        btnDictado.addEventListener('click', function (e) {
            e.preventDefault();
            if (!recognition) {
                mostrarNotificacion('Error', 'Su navegador no soporta el dictado por voz. Recomendamos usar Google Chrome o Microsoft Edge.', 'error');
                return;
            }
            if (dictationActive && dictationSource === 'MAIN') {
                apagarDictado();
            } else {
                dictationSource = 'MAIN';
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Error al iniciar dictado', e);
                }
            }
        });
    }

    if (btnDictadoAfiliado) {
        btnDictadoAfiliado.addEventListener('click', function (e) {
            e.preventDefault();
            if (!recognition) {
                mostrarNotificacion('Error', 'Su navegador no soporta el dictado por voz.', 'error');
                return;
            }
            if (dictationActive && dictationSource === 'MAIN_AFILIADO') {
                apagarDictado();
            } else {
                dictationSource = 'MAIN_AFILIADO';
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Error al iniciar dictado afiliado', e);
                }
            }
        });
    }

    if (btnDictadoManual) {
        btnDictadoManual.addEventListener('click', function (e) {
            e.preventDefault();
            if (!recognition) {
                mostrarNotificacion('Error', 'Su navegador no soporta el dictado por voz.', 'error');
                return;
            }
            if (dictationActive && dictationSource === 'MANUAL') {
                apagarDictado();
            } else {
                dictationSource = 'MANUAL';
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Error al iniciar dictado manual', e);
                }
            }
        });
    }

    function normalizeForSearch(text) {
        if (!text) return '';
        // Algoritmo de normalización fonética simplificado para español
        return text.toString().toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/H/g, '') // Quitar H muda
            .replace(/V/g, 'B') // V suena = B
            .replace(/Z|S/g, 'C') // Z, S suenan = C (simplificación fonética)
            .replace(/K|Q/g, 'C') // K, Q suenan = C
            .replace(/Y|LL/g, 'I') // Y, LL suenan = I
            .replace(/J/g, 'G') // J suena = G (simplif)
            .replace(/W/g, 'GU') // W suena = GU
            .replace(/(.)\1+/g, '$1') // Letras dobles repetidas reducirlas a una sola
            .trim();
    }

    function parseAndMatchAffiliateNumber(transcript) {
        let text = transcript.toLowerCase();
        text = text.replace(/guion|guión|barran|dash/g, '-');

        const mapNumeros = {
            'cero': '0', 'uno': '1', 'un': '1', 'una': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
            'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10', 'once': '11',
            'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15', 'dieciseis': '16',
            'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19',
            'veinte': '20', 'veintiuno': '21', 'veintidos': '22', 'veintidós': '22',
            'veintitres': '23', 'veintitrés': '23', 'veinticuatro': '24', 'veinticinco': '25',
            'veintiseis': '26', 'veintiséis': '26', 'veintisiete': '27', 'veintiocho': '28',
            'veintinueve': '29', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
            'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90'
        };

        for (let key in mapNumeros) {
            let regex = new RegExp('\\b' + key + '\\b', 'gi');
            text = text.replace(regex, mapNumeros[key]);
        }

        let digits = text.replace(/[^0-9]/g, '');

        let formatted = '';
        if (digits.length === 11) {
            formatted = `${digits[0]}-${digits.substring(1, 9)}-${digits.substring(9, 11)}`;
        } else if (text.includes('-')) {
            formatted = text.replace(/[^0-9\-]/g, '');
        }

        let client = null;
        if (baseDatos && baseDatos.length > 0) {
            if (formatted) {
                client = baseDatos.find(c => c.NUMERO === formatted);
            }
            if (!client && digits) {
                client = baseDatos.find(c => c.NUMERO.replace(/[^0-9]/g, '') === digits);
            }
        }

        return { formatted, digits, client };
    }

    function procesarDictado(transcript) {
        if (transcript.includes("cancelar") || transcript.includes("detener") || transcript.includes("parar dictado")) {
            apagarDictado();
            mostrarNotificacion('Dictado', 'Dictado desactivado.', 'success');
            return;
        }

        switch (dictationState) {
            case 'CLIENTE':
                procesarTranscripcionCliente(transcript);
                break;
            case 'AFILIADO':
                procesarTranscripcionAfiliado(transcript);
                break;
            case 'IMPORTE':
                procesarTranscripcionImporte(transcript);
                break;
            case 'MANUAL_CLIENTE':
                procesarTranscripcionManualCliente(transcript);
                break;
            case 'MANUAL_AFILIADO':
                procesarTranscripcionManualAfiliado(transcript);
                break;
            case 'MANUAL_IMPORTE':
                procesarTranscripcionManualImporte(transcript);
                break;
        }
    }

    function procesarTranscripcionManualCliente(transcript) {
        document.getElementById('clienteManual').value = transcript.toUpperCase();
        dictationState = 'MANUAL_AFILIADO';
        document.getElementById('afiliadoManual').focus();
        mostrarNotificacion('Cliente Capturado', `${transcript.toUpperCase()}\n\nDiga el número de afiliado (ej: 2 guion 0 6...).`, 'success');
    }

    function procesarTranscripcionManualAfiliado(transcript) {
        let nums = transcript.replace(/guion|guión|guían/g, '-').replace(/ cero/g, ' 0').replace(/^cero /, '0 ').replace(/ /g, ' ');
        const mapNumeros = {
            'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
            'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10', 'once': '11',
            'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15', 'dieciseis': '16',
            'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19',
            'veinte': '20', 'veintiuno': '21', 'veintidos': '22', 'veintidós': '22',
            'veintitres': '23', 'veintitrés': '23', 'veinticuatro': '24', 'veinticinco': '25',
            'veintiseis': '26', 'veintiséis': '26', 'veintisiete': '27', 'veintiocho': '28',
            'veintinueve': '29', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
            'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90'
        };
        for (let key in mapNumeros) {
            let regex = new RegExp('\\b' + key + '\\b', 'gi');
            nums = nums.replace(regex, mapNumeros[key]);
        }
        nums = nums.replace(/[^0-9\-]/g, '');

        if (nums) {
            // Verificar si tal vez dijeron números incompletos
            const inputAfil = document.getElementById('afiliadoManual');
            let currentVal = inputAfil.value;
            // Solo si agregamos a lo existente o lo sobreescribimos. 
            // Como este es continuo, puede que diga "dos guion cero seis" en un evento 
            // y luego "uno seis cero" en el próximo evento si no cambió de estado.
            // Para mantenerlo sencillo: se acumula hasta escuchar "importe", pero si 
            // detectamos un número grande, pasamos automático a importe o si dice una palabra clave
            // Mejor lo acumulamos manualmente:
            inputAfil.value = currentVal ? currentVal + nums : nums;

            // Evaluamos una heurística para pasar a importe: si la longitud total es >= 10 o dice "importe"
            if (inputAfil.value.length >= 12 || transcript.includes("importe") || transcript.includes("factura")) {
                dictationState = 'MANUAL_IMPORTE';
                document.getElementById('importeManual').focus();
                mostrarNotificacion('Afiliado Capturado', `${inputAfil.value}\n\nDiga el importe y luego "Cargar".`, 'success');
            } else {
                mostrarNotificacion('Capturando Afiliado', `Detectado: ${inputAfil.value}\n\nSiga dictando el número, o diga "Importe" para continuar.`, 'success');
            }
        } else if (transcript.includes("importe") || transcript.includes("factura")) {
            dictationState = 'MANUAL_IMPORTE';
            document.getElementById('importeManual').focus();
            mostrarNotificacion('Pasando a Importe', `Diga el importe y luego "Cargar".`, 'success');
        } else {
            mostrarNotificacion('Afiliado', 'No se entendió el número. Diga el número de afiliado con guiones.', 'error');
        }
    }

    function procesarTranscripcionManualImporte(transcript) {
        let hasCargar = false;
        let tClean = transcript;

        if (tClean.includes("cargar") || tClean.includes("carga")) {
            hasCargar = true;
            tClean = tClean.replace(/cargar/g, "").replace(/carga/g, "");
        }

        // Interpretar decimales orales
        tClean = tClean.replace(/ con /g, '.').replace(/ coma /g, '.').replace(/,/g, '.');
        tClean = tClean.replace(/ pesos/g, '');

        let digitsAndDots = tClean.replace(/[^0-9.]/g, '');

        if (digitsAndDots) {
            let parts = digitsAndDots.split('.');
            if (parts.length > 2) {
                let decimal = parts.pop();
                digitsAndDots = parts.join('') + '.' + decimal;
            }
            document.getElementById('importeManual').value = digitsAndDots;
        }

        if (hasCargar) {
            const cliente = document.getElementById('clienteManual').value.trim();
            const afiliado = document.getElementById('afiliadoManual').value.trim();
            const importe = document.getElementById('importeManual').value.trim();
            if (cliente !== '' && afiliado !== '' && importe !== '') {
                // Submit el formManual
                document.getElementById('formManual').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                if (dictationActive) {
                    dictationState = 'MANUAL_CLIENTE';
                    mostrarNotificacion('Registro Exitoso', 'Datos guardados.\n\nDiga el nombre del próximo cliente.', 'success');
                }
            } else {
                mostrarNotificacion('Aviso', 'Faltan campos por completar.', 'error');
            }
        } else if (digitsAndDots) {
            mostrarNotificacion('Monto', `Si es correcto diga "CARGAR".`, 'success');
        }
    }

    function procesarTranscripcionCliente(transcript) {
        if (!baseDatos || baseDatos.length === 0) {
            mostrarNotificacion('Advertencia', 'Cargue la base de datos de Excel primero.', 'error');
            return;
        }

        const parts = transcript.split(' ').filter(p => p.length > 2); // Evitar filtros por sílabas cortas
        let currentFilter = dictationFilteredClientes.length > 0 ? dictationFilteredClientes : baseDatos;

        for (let part of parts) {
            const normalizedPart = normalizeForSearch(part);
            const subFilter = currentFilter.filter(c => normalizeForSearch(c.NOMBRE).includes(normalizedPart));
            if (subFilter.length > 0) {
                currentFilter = subFilter; // Afinar la búsqueda
            }
        }

        if (currentFilter.length > 0) {
            dictationFilteredClientes = currentFilter;

            if (parts.length > 0) {
                clienteInput.value = transcript.toUpperCase();
                showSuggestionsForVoice(dictationFilteredClientes);
            }

            if (dictationFilteredClientes.length === 1) {
                const selected = dictationFilteredClientes[0];
                clienteInput.value = selected.NOMBRE;
                if (afiliadoInput) afiliadoInput.value = selected.NUMERO;
                suggestionsContainer.style.display = 'none';

                dictationState = 'IMPORTE';
                importeInput.focus();

                // Extraer posible número que se dijo en la misma oración, ej: "elguero teresa treinta mil"
                let posibleImporte = Array.from(transcript.matchAll(/\d+/g)).join('');
                if (posibleImporte) {
                    // Si dijo números, procesarlos de inmediato
                    procesarTranscripcionImporte(transcript);
                } else {
                    mostrarNotificacion('Cliente Seleccionado', `${selected.NOMBRE}\nAfiliado: ${selected.NUMERO}\n\nDiga el importe...`, 'success');
                }
            } else {
                mostrarNotificacion('Filtrando', `Quedan ${dictationFilteredClientes.length} coincidencias. Diga el nombre u otro apellido...`, 'success');
            }
        } else {
            mostrarNotificacion('Dictado', 'No se encontró en base de datos. Diga otro nombre.', 'error');
            dictationFilteredClientes = baseDatos; // Reiniciar filtro
            clienteInput.value = '';
        }
    }

    function procesarTranscripcionAfiliado(transcript) {
        if (!baseDatos || baseDatos.length === 0) {
            mostrarNotificacion('Advertencia', 'Cargue la base de datos de Excel primero.', 'error');
            return;
        }

        const { formatted, digits, client } = parseAndMatchAffiliateNumber(transcript);

        if (client) {
            if (afiliadoInput) afiliadoInput.value = client.NUMERO;
            if (clienteInput) clienteInput.value = client.NOMBRE;
            dictationState = 'IMPORTE';
            importeInput.focus();
            mostrarNotificacion('Cliente Seleccionado', `${client.NOMBRE}\nAfiliado: ${client.NUMERO}\n\nDiga el importe...`, 'success');
        } else if (formatted || digits) {
            const valToSet = formatted || digits;
            if (afiliadoInput) afiliadoInput.value = valToSet;
            mostrarNotificacion('Buscando Afiliado', `Número dictado: ${valToSet}. No se encontró coincidencia en la base de datos.`, 'error');
        } else {
            mostrarNotificacion('Dictado', 'No se reconocieron números. Vuelva a intentar dictar el número de afiliado.', 'error');
        }
    }

    function showSuggestionsForVoice(clientesList) {
        suggestionsContainer.innerHTML = '';
        clientesList.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = cliente.NOMBRE;
            suggestionItem.addEventListener('click', (event) => {
                event.stopPropagation();
                clienteInput.value = cliente.NOMBRE;
                if (afiliadoInput) afiliadoInput.value = cliente.NUMERO;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                importeInput.focus();
                if (dictationActive) {
                    dictationState = 'IMPORTE';
                    mostrarNotificacion('Cliente Seleccionado', `${cliente.NOMBRE}\nAfiliado: ${cliente.NUMERO}\n\nDiga el importe...`, 'success');
                }
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
        if (clientesList.length > 0) {
            suggestionsContainer.style.display = 'block';
        }
    }

    function procesarTranscripcionImporte(transcript) {
        let hasCargar = false;
        let tClean = transcript;

        if (tClean.includes("cargar") || tClean.includes("carga")) {
            hasCargar = true;
            tClean = tClean.replace(/cargar/g, "").replace(/carga/g, "");
        }

        // Interpretar decimales orales
        tClean = tClean.replace(/ con /g, '.').replace(/ coma /g, '.').replace(/,/g, '.');
        tClean = tClean.replace(/ pesos/g, '');

        let digitsAndDots = tClean.replace(/[^0-9.]/g, '');

        if (digitsAndDots) {
            // Arreglar separadores de miles dictados como punto
            let parts = digitsAndDots.split('.');
            if (parts.length > 2) {
                let decimal = parts.pop();
                digitsAndDots = parts.join('') + '.' + decimal;
            }
            importeInput.value = digitsAndDots;
        }

        if (hasCargar) {
            const hasClienteOrAfiliado = (clienteInput && clienteInput.value.trim() !== '') || (afiliadoInput && afiliadoInput.value.trim() !== '');
            const hasImporte = importeInput && importeInput.value.trim() !== '';

            if (hasClienteOrAfiliado && hasImporte) {
                guardarDatos();
                if (dictationActive) {
                    dictationState = 'CLIENTE';
                    dictationFilteredClientes = baseDatos;
                    mostrarNotificacion('Registro Exitoso', 'Datos guardados.\n\nDiga el nombre del próximo cliente o número de afiliado.', 'success');
                }
            } else {
                mostrarNotificacion('Aviso', 'Falta el nombre/afiliado o el importe.', 'error');
            }
        } else if (digitsAndDots) {
            mostrarNotificacion('Monto', `Si es correcto diga "CARGAR".`, 'success');
        }
    }
    // --- FIN VARIABLES Y LÓGICA DE DICTADO POR VOZ ---

    const data = []; // Array para almacenar los datos ingresados (Deposito)
    let baseDatos = []; // Array para almacenar los datos de la base de datos
    let nuevosClientes = []; // Array para almacenar clientes agregados manualmente
    let currentIndex = -1;

    // Cargar padrón de clientes desde cache local (para disponibilidad offline e instantánea)
    try {
        const cachedPadron = localStorage.getItem('clientes_padron');
        if (cachedPadron) {
            baseDatos = JSON.parse(cachedPadron);
            console.log(`Padrón cargado desde cache local: ${baseDatos.length} clientes.`);
        }
    } catch (e) {
        console.warn('Error al leer cache local de clientes:', e);
    }

    // Sincronizar clientes con Neon DB
    async function sincronizarClientesDesdeNeon() {
        const email = obtenerEmailUsuario();
        if (!email || typeof obtenerClientesFarmacia !== 'function') return;
        try {
            const clientesNeon = await obtenerClientesFarmacia(email);
            if (clientesNeon && clientesNeon.length > 0) {
                baseDatos = clientesNeon.map((c, i) => ({
                    ID: i + 1,
                    NOMBRE: (c.nombre || '').replace(/[.,\-_/]+$/, '').trim(),
                    NUMERO: typeof formatCarnetIasep === 'function' ? formatCarnetIasep(c.numero || '') : (c.numero || '').toString().trim(),
                    ES_NUEVO: c.es_nuevo
                }));
            }

            // También fusionar clientes que ya han sido registrados en comprobantes históricos de Neon
            try {
                let token = await obtenerTokenValido();
                if (token) {
                    let resRegs = await fetch(`${NEON_DATA_URL}registros?farmacia_email=eq.${encodeURIComponent(email)}&select=nombre,afiliado&limit=10000`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resRegs.ok) {
                        const pastClients = await resRegs.json();
                        pastClients.forEach(r => {
                            if (!r.nombre) return;
                            const rNombre = r.nombre.replace(/[.,\-_/]+$/, '').trim();
                            const rawAfil = (r.afiliado || '').toString().trim();
                            const rAfil = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(rawAfil) : rawAfil;
                            const yaExiste = baseDatos.some(b => {
                                const cleanB = (b.NUMERO || '').replace(/[^0-9]/g, '');
                                const cleanR = rAfil.replace(/[^0-9]/g, '');
                                return (cleanB && cleanR && cleanB === cleanR) || (b.NOMBRE && b.NOMBRE.toLowerCase() === rNombre.toLowerCase());
                            });
                            if (!yaExiste) {
                                baseDatos.push({
                                    ID: baseDatos.length + 1,
                                    NOMBRE: rNombre,
                                    NUMERO: rAfil,
                                    ES_NUEVO: false
                                });
                            }
                        });
                    }
                }
            } catch (errRegs) {
                console.warn('Complementando clientes de registros:', errRegs);
            }

            if (baseDatos.length > 0) {
                try {
                    localStorage.setItem('clientes_padron', JSON.stringify(baseDatos));
                } catch (e) {}
                console.log(`Padrón completo sincronizado con Neon DB: ${baseDatos.length} clientes.`);
            }
        } catch (err) {
            console.warn('Error al sincronizar clientes desde Neon:', err);
        }
    }
    sincronizarClientesDesdeNeon();

    // Obtener elementos del modal
    const modalManual = document.getElementById('modalManual');
    const agregarManualButton = document.getElementById('agregarManual');
    const spanCerrar = document.getElementsByClassName('close')[0];
    const formManual = document.getElementById('formManual');

    // ========== CREAR MODAL DE NOTIFICACI�N DIN�MICAMENTE ==========
    function crearModalNotificacion() {
        const modalHTML = `
            <div id="modalNotificacion" class="modal-notificacion">
                <div class="modal-notificacion-content">
                    <div class="modal-notificacion-icon" id="modalNotificacionIcon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-success">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-error" style="display: none;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h3 id="modalNotificacionTitulo">Exito!</h3>
                    <p id="modalNotificacionMensaje">Los datos se han cargado correctamente.</p>
                    <button class="boton-grande" id="modalNotificacionBtn">Aceptar</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('modalNotificacionBtn').addEventListener('click', cerrarModalNotificacion);
    }
    crearModalNotificacion();

    function mostrarNotificacion(titulo, mensaje, tipo) {
        tipo = tipo || 'success';
        const modal = document.getElementById('modalNotificacion');
        const iconSuccess = modal.querySelector('.icon-success');
        const iconError = modal.querySelector('.icon-error');
        document.getElementById('modalNotificacionTitulo').textContent = titulo;
        document.getElementById('modalNotificacionMensaje').textContent = mensaje;
        if (tipo === 'success') {
            iconSuccess.style.display = 'block';
            iconError.style.display = 'none';
        } else {
            iconSuccess.style.display = 'none';
            iconError.style.display = 'block';
        }
        modal.classList.add('show');
    }

    function cerrarModalNotificacion() {
        document.getElementById('modalNotificacion').classList.remove('show');
    }
    // ================================================================

    // Función para cargar clientes desde la hoja "base-de-datos" de Excel
    function cargarClientesDesdeExcel(clientesData) {
        console.log("Iniciando carga de clientes desde Excel:", clientesData);
        baseDatos = (clientesData || []).map((cliente, index) => {
            const rawNum = (cliente.NUMERO || cliente.numero || cliente.Afiliado || '').toString();
            return {
                ID: cliente.ID || index + 1,
                NOMBRE: (cliente.NOMBRE || cliente.nombre || cliente.Cliente || '').toString().trim(),
                NUMERO: typeof formatCarnetIasep === 'function' ? formatCarnetIasep(rawNum) : rawNum.trim(),
                ES_NUEVO: false
            };
        }).filter(c => c.NOMBRE.length > 0);
        console.log("Carga de clientes completada desde Excel:", baseDatos);
    }

    let currentIndexAfiliado = -1;

    // Función para mostrar sugerencias por Nombre
    function showSuggestions(value) {
        suggestionsContainer.innerHTML = '';
        if (!value || !baseDatos) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const query = value.toString().toLowerCase();
        const filteredClientes = baseDatos.filter(cliente => {
            if (!cliente || cliente.NOMBRE === undefined || cliente.NOMBRE === null) return false;
            return cliente.NOMBRE.toString().toLowerCase().includes(query);
        });

        filteredClientes.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            const nomStr = cliente.NOMBRE.toString();
            const numStr = (cliente.NUMERO || '').toString();
            suggestionItem.textContent = nomStr;
            suggestionItem.addEventListener('click', (event) => {
                event.stopPropagation();
                clienteInput.value = nomStr;
                if (afiliadoInput) afiliadoInput.value = numStr;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                importeInput.focus();
            });
            suggestionsContainer.appendChild(suggestionItem);
        });

        if (filteredClientes.length > 0) {
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Función para mostrar sugerencias por Número de Afiliado
    function showSuggestionsAfiliado(value) {
        if (!suggestionsContainerAfiliado) return;
        suggestionsContainerAfiliado.innerHTML = '';
        if (!value || !baseDatos) {
            suggestionsContainerAfiliado.style.display = 'none';
            return;
        }

        const query = value.toString().toLowerCase();
        const cleanVal = query.replace(/[^0-9]/g, '');

        const filteredClientes = baseDatos.filter(cliente => {
            if (!cliente || cliente.NUMERO === undefined || cliente.NUMERO === null) return false;
            const numStr = cliente.NUMERO.toString().toLowerCase();
            const cleanNum = numStr.replace(/[^0-9]/g, '');
            const nomStr = (cliente.NOMBRE || '').toString().toLowerCase();

            return numStr.includes(query) || (cleanVal.length > 0 && cleanNum.includes(cleanVal)) || nomStr.includes(query);
        });

        filteredClientes.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            const numStr = cliente.NUMERO.toString();
            const nomStr = (cliente.NOMBRE || '').toString();
            suggestionItem.textContent = `${numStr} — ${nomStr}`;
            suggestionItem.addEventListener('click', (event) => {
                event.stopPropagation();
                afiliadoInput.value = numStr;
                clienteInput.value = nomStr;
                suggestionsContainerAfiliado.innerHTML = '';
                suggestionsContainerAfiliado.style.display = 'none';
                importeInput.focus();
            });
            suggestionsContainerAfiliado.appendChild(suggestionItem);
        });

        if (filteredClientes.length > 0) {
            suggestionsContainerAfiliado.style.display = 'block';
        } else {
            suggestionsContainerAfiliado.style.display = 'none';
        }
    }

    // Event listener para cambios en el input 'clienteInput'
    clienteInput.addEventListener('input', function () {
        const value = this.value;
        currentIndex = -1; // Reiniciar el índice actual al cambiar la entrada
        if (value && value.trim()) {
            showSuggestions(value.trim());
        } else {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            if (afiliadoInput) afiliadoInput.value = '';
        }
    });

    clienteInput.addEventListener('focus', function () {
        const value = this.value;
        if (value && value.trim()) {
            showSuggestions(value.trim());
        }
    });

    clienteInput.addEventListener('change', function () {
        const inputValue = this.value.trim();
        if (inputValue && baseDatos.length > 0) {
            const match = baseDatos.find(c => c.NOMBRE && c.NOMBRE.toString().toLowerCase() === inputValue.toLowerCase()) ||
                baseDatos.find(c => c.NOMBRE && c.NOMBRE.toString().toLowerCase().includes(inputValue.toLowerCase()));
            if (match) {
                clienteInput.value = match.NOMBRE.toString();
                if (afiliadoInput) afiliadoInput.value = (match.NUMERO || '').toString();
            }
        }
    });

    clienteInput.addEventListener('blur', function () {
        const inputValue = this.value.trim();
        if (inputValue && (!afiliadoInput.value || afiliadoInput.value.trim() === '')) {
            const match = verificarAfiliadoEnBase(inputValue, '');
            if (match && match.NUMERO) {
                afiliadoInput.value = match.NUMERO.toString();
            }
        }
    });

    // Event listener para cambios en el input 'afiliadoInput'
    if (afiliadoInput) {
        afiliadoInput.addEventListener('input', function () {
            const value = this.value;
            currentIndexAfiliado = -1;
            if (value && value.trim()) {
                showSuggestionsAfiliado(value.trim());
            } else {
                if (suggestionsContainerAfiliado) {
                    suggestionsContainerAfiliado.innerHTML = '';
                    suggestionsContainerAfiliado.style.display = 'none';
                }
                clienteInput.value = '';
            }
        });

        afiliadoInput.addEventListener('focus', function () {
            const value = this.value;
            if (value && value.trim()) {
                showSuggestionsAfiliado(value.trim());
            }
        });

        afiliadoInput.addEventListener('blur', function () {
            const raw = this.value.trim();
            if (raw) {
                const formatted = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(raw) : raw;
                this.value = formatted;
                if (!clienteInput.value || clienteInput.value.trim() === '') {
                    const match = verificarAfiliadoEnBase('', formatted);
                    if (match && match.NOMBRE) {
                        clienteInput.value = match.NOMBRE.toString();
                    }
                }
            }
        });

        afiliadoInput.addEventListener('change', function () {
            const inputValue = this.value.trim();
            if (inputValue && baseDatos.length > 0) {
                const formatted = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(inputValue) : inputValue;
                this.value = formatted;
                const cleanVal = inputValue.replace(/[^0-9]/g, '');
                const match = baseDatos.find(c => c.NUMERO && c.NUMERO.toString() === formatted) ||
                    baseDatos.find(c => c.NUMERO && c.NUMERO.toString() === inputValue) ||
                    baseDatos.find(c => cleanVal && c.NUMERO && c.NUMERO.toString().replace(/[^0-9]/g, '') === cleanVal) ||
                    baseDatos.find(c => cleanVal && c.NUMERO && c.NUMERO.toString().replace(/[^0-9]/g, '').startsWith(cleanVal)) ||
                    baseDatos.find(c => c.NUMERO && c.NUMERO.toString().toLowerCase().includes(inputValue.toLowerCase()));
                if (match) {
                    afiliadoInput.value = match.NUMERO.toString();
                    clienteInput.value = (match.NOMBRE || '').toString();
                }
            }
        });

        afiliadoInput.addEventListener('keydown', function (event) {
            const suggestions = suggestionsContainerAfiliado ? suggestionsContainerAfiliado.querySelectorAll('.suggestion-item') : [];

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (suggestions.length > 0) {
                    currentIndexAfiliado = (currentIndexAfiliado + 1) % suggestions.length;
                    highlightSuggestion(suggestions, currentIndexAfiliado);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (suggestions.length > 0) {
                    currentIndexAfiliado = (currentIndexAfiliado - 1 + suggestions.length) % suggestions.length;
                    highlightSuggestion(suggestions, currentIndexAfiliado);
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (currentIndexAfiliado >= 0 && currentIndexAfiliado < suggestions.length) {
                    suggestions[currentIndexAfiliado].click();
                } else {
                    const inputValue = afiliadoInput.value.trim();
                    const cleanVal = inputValue.replace(/[^0-9]/g, '');
                    const match = baseDatos.find(cliente => {
                        if (!cliente || cliente.NUMERO === undefined || cliente.NUMERO === null) return false;
                        const numStr = cliente.NUMERO.toString();
                        const cleanNum = numStr.replace(/[^0-9]/g, '');
                        return numStr.toLowerCase().includes(inputValue.toLowerCase()) ||
                            (cleanVal && cleanNum === cleanVal) ||
                            (cleanVal && cleanNum.startsWith(cleanVal));
                    });

                    if (match) {
                        afiliadoInput.value = match.NUMERO.toString();
                        clienteInput.value = (match.NOMBRE || '').toString();
                        if (suggestionsContainerAfiliado) {
                            suggestionsContainerAfiliado.innerHTML = '';
                            suggestionsContainerAfiliado.style.display = 'none';
                        }
                        importeInput.focus();
                    } else if (inputValue) {
                        mostrarNotificacion('Aviso', 'No se encontró ningún número de afiliado coincidente en la lista.', 'error');
                    }
                }
            }
        });
    }

    // Event listener para teclas en el input 'clienteInput'
    clienteInput.addEventListener('keydown', function (event) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (suggestions.length > 0) {
                currentIndex = (currentIndex + 1) % suggestions.length;
                highlightSuggestion(suggestions, currentIndex);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (suggestions.length > 0) {
                currentIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
                highlightSuggestion(suggestions, currentIndex);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (currentIndex >= 0 && currentIndex < suggestions.length) {
                suggestions[currentIndex].click();
            } else {
                const inputValue = clienteInput.value.trim().toLowerCase();
                const filteredClientes = baseDatos.filter(cliente =>
                    cliente && cliente.NOMBRE && cliente.NOMBRE.toString().toLowerCase().includes(inputValue)
                );

                if (filteredClientes.length > 0) {
                    clienteInput.value = filteredClientes[0].NOMBRE.toString();
                    if (afiliadoInput) afiliadoInput.value = (filteredClientes[0].NUMERO || '').toString();
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                    importeInput.focus();
                } else if (inputValue) {
                    mostrarNotificacion('Aviso', 'No se encontró ningún nombre coincidente en la lista.', 'error');
                }
            }
        }
    });

    // Limpiar los divs de sugerencias al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (suggestionsContainer && !suggestionsContainer.contains(e.target) && e.target !== clienteInput) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
        if (suggestionsContainerAfiliado && !suggestionsContainerAfiliado.contains(e.target) && e.target !== afiliadoInput) {
            suggestionsContainerAfiliado.innerHTML = '';
            suggestionsContainerAfiliado.style.display = 'none';
        }
    });

    // Función para resaltar la sugerencia actual
    function highlightSuggestion(suggestions, idx) {
        const targetIdx = typeof idx === 'number' ? idx : currentIndex;
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.remove('highlighted'); // Remover resalto de todas las sugerencias
            if (index === targetIdx) {
                suggestion.classList.add('highlighted'); // Resaltar la sugerencia actual
            }
        });
    }

    // Event listener para la tecla 'Enter' en el input 'importeInput'
    importeInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir envío del formulario si lo hubiera
            guardarDatos();
        }
    });

    // Event listener para el botón 'CARGAR'
    cargarButton.addEventListener('click', guardarDatos);

    // Event listener para el botón 'Crear Excel'
    crearExcelButton.addEventListener('click', function () {
        if (data.length === 0) {
            mostrarNotificacion('Aviso', 'No hay datos para crear el Excel.', 'error');
            return;
        }
        crearExcel();
    });

    // Event listener para el botón 'Subir Datos en Excel'
    subirDatosExcelButton.addEventListener('click', function () {
        fileInput.click(); // Abrir el diálogo de selección de archivo Excel
    });

    // Event listener para el botón 'Agregar Clientes Manualmente'
    agregarManualButton.addEventListener('click', function () {
        modalManual.style.display = 'block';
        formManual.reset(); // Resetear el formulario
    });

    // Event listener para el cierre del modal (cuando se hace clic en la x o fuera del modal)
    spanCerrar.addEventListener('click', function () {
        modalManual.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target == modalManual) {
            modalManual.style.display = 'none';
        }
    });

    // Event listener para el cambio en el input de archivo
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0]; // Obtener el primer archivo seleccionado
        if (file) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const dataBuffer = new Uint8Array(e.target.result);
                const workbook = XLSX.read(dataBuffer, { type: 'array' });

                // Obtener la hoja "base-de-datos"
                const sheetName = "base-de-datos";
                if (!workbook.Sheets[sheetName]) {
                    mostrarNotificacion('Error', 'La hoja base-de-datos no fue encontrada en el archivo Excel.', 'error');
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // Verificar que las columnas existen
                if (!jsonData.length || !jsonData[0].ID || !jsonData[0].NOMBRE || !jsonData[0].NUMERO) {
                    mostrarNotificacion('Error', 'La hoja base-de-datos debe contener las columnas ID, NOMBRE y NUMERO.', 'error');
                    return;
                }

                cargarClientesDesdeExcel(jsonData);
                try {
                    localStorage.setItem('clientes_padron', JSON.stringify(baseDatos));
                } catch (errCache) {}
                mostrarNotificacion('¡Éxito!', `Se cargaron ${baseDatos.length} clientes. Sincronizando con la nube...`, 'success');

                const email = obtenerEmailUsuario();
                if (email && typeof sincronizarLoteClientesNeon === 'function') {
                    try {
                        const guardados = await sincronizarLoteClientesNeon(baseDatos, email, (actual, total) => {
                            console.log(`Subiendo clientes a Neon: ${actual}/${total}`);
                        }, true); // Limpiar y reemplazar padrón para reflejar eliminaciones
                        mostrarNotificacion('Nube Sincronizada', `${guardados} clientes guardados en la nube. ¡Ya están disponibles en tu celular!`, 'success');
                    } catch (syncErr) {
                        console.warn('Error sincronizando clientes con Neon:', syncErr);
                    }
                }
            };
            reader.readAsArrayBuffer(file); // Leer el contenido del archivo como ArrayBuffer
        }
    });

    // Función para guardar los datos ingresados desde el formulario principal
    async function guardarDatos() {
        const nombre = clienteInput ? clienteInput.value.trim() : '';
        const afiliadoVal = afiliadoInput ? afiliadoInput.value.trim() : '';
        const rawImporte = importeInput ? importeInput.value.replace('$', '').replace(',', '.').trim() : '';
        const importe = parseFloat(rawImporte);

        if (!nombre && !afiliadoVal) {
            mostrarNotificacion('Aviso', 'Por favor ingrese el nombre del cliente o el número de afiliado.', 'error');
            return;
        }

        const formattedAfil = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(afiliadoVal) : afiliadoVal;
        const clienteEncontrado = verificarAfiliadoEnBase(nombre, formattedAfil);

        const finalNombre = clienteEncontrado ? clienteEncontrado.NOMBRE.toString() : nombre;
        const finalAfiliado = clienteEncontrado ? clienteEncontrado.NUMERO.toString() : formattedAfil;

        if (!finalNombre) {
            mostrarNotificacion('Aviso', 'Por favor ingrese el nombre del cliente.', 'error');
            return;
        }

        if (isNaN(importe) || importe <= 0) {
            mostrarNotificacion('Aviso', 'Por favor ingrese un importe válido.', 'error');
            return;
        }

        // Guardar en Neon DB si hay lote activo
        let guardado = null;
        const loteActivo = getLoteActivo();
        const email = obtenerEmailUsuario();
        const operador = obtenerNombreOperador();
        const productosVal = document.getElementById('productos')?.value.trim() || '';

        if (loteActivo && loteActivo.id) {
            try {
                guardado = await guardarRegistroEnNeon({
                    lote_id: loteActivo.id,
                    farmacia_email: email,
                    nombre: finalNombre,
                    afiliado: finalAfiliado,
                    importe: importe,
                    productos: productosVal,
                    cargado_por: operador
                });
            } catch (err) {
                console.warn('No se pudo guardar en Neon, guardando local:', err);
            }
        }

        data.push({
            id: guardado ? guardado.id : undefined,
            nombre: finalNombre,
            afiliado: finalAfiliado,
            importe,
            productos: productosVal,
            cargado_por: operador
        });

        // Si es cliente nuevo que no estaba en baseDatos, registrarlo
        const existeEnBase = baseDatos.some(c => c.NOMBRE && c.NOMBRE.trim().toLowerCase() === finalNombre.toLowerCase());
        if (!existeEnBase) {
            if (!nuevosClientes.some(c => c.Cliente && c.Cliente.trim().toLowerCase() === finalNombre.toLowerCase())) {
                nuevosClientes.push({ Cliente: finalNombre, Afiliado: finalAfiliado });
            }
            baseDatos.push({
                ID: baseDatos.length + 1,
                NOMBRE: finalNombre,
                NUMERO: finalAfiliado,
                ES_NUEVO: true
            });
            try { localStorage.setItem('clientes_padron', JSON.stringify(baseDatos)); } catch (e) {}

            if (email && typeof guardarClienteEnNeon === 'function') {
                guardarClienteEnNeon({ nombre: finalNombre, numero: finalAfiliado, es_nuevo: true }, email).catch(console.warn);
            }
        }

        console.log('Datos guardados:', data);
        actualizarTabla();

        // Limpiar los inputs después de guardar
        clienteInput.value = '';
        if (afiliadoInput) afiliadoInput.value = '';
        importeInput.value = '';
        if (document.getElementById('productos')) document.getElementById('productos').value = '';
        clienteInput.focus();
        mostrarNotificacion('Éxito!', 'Registro guardado correctamente.', 'success');
    }

    // Función para guardar los datos ingresados desde el formulario manual  
    formManual.addEventListener('submit', async function (event) {
        event.preventDefault();

        const nombreManual = document.getElementById('clienteManual').value.trim();
        const afiliadoManual = document.getElementById('afiliadoManual').value.trim();
        const importeManual = parseFloat(document.getElementById('importeManual').value.replace('$', '').replace(',', ''));
        const productosManual = document.getElementById('productosManual')?.value.trim() || '';

        if (!nombreManual || !afiliadoManual || isNaN(importeManual)) {
            mostrarNotificacion('Aviso', 'Por favor, complete todos los campos correctamente.', 'error');
            return;
        }

        let guardado = null;
        const loteActivo = getLoteActivo();
        const email = obtenerEmailUsuario();
        const operador = obtenerNombreOperador();

        if (loteActivo && loteActivo.id) {
            try {
                guardado = await guardarRegistroEnNeon({
                    lote_id: loteActivo.id,
                    farmacia_email: email,
                    nombre: nombreManual,
                    afiliado: afiliadoManual,
                    importe: importeManual,
                    productos: productosManual,
                    cargado_por: operador
                });
            } catch (err) {
                console.warn('No se pudo guardar en Neon:', err);
            }
        }

        data.push({
            id: guardado ? guardado.id : undefined,
            nombre: nombreManual,
            afiliado: afiliadoManual,
            importe: importeManual,
            productos: productosManual,
            cargado_por: operador
        });

        const existeEnBaseManual = baseDatos.some(c => c.NOMBRE && c.NOMBRE.trim().toLowerCase() === nombreManual.toLowerCase());
        if (!existeEnBaseManual) {
            if (!nuevosClientes.some(c => c.Cliente && c.Cliente.trim().toLowerCase() === nombreManual.toLowerCase())) {
                nuevosClientes.push({ Cliente: nombreManual, Afiliado: afiliadoManual });
            }
            baseDatos.push({
                ID: baseDatos.length + 1,
                NOMBRE: nombreManual,
                NUMERO: afiliadoManual,
                ES_NUEVO: true
            });
            try { localStorage.setItem('clientes_padron', JSON.stringify(baseDatos)); } catch (e) {}

            if (email && typeof guardarClienteEnNeon === 'function') {
                guardarClienteEnNeon({ nombre: nombreManual, numero: afiliadoManual, es_nuevo: true }, email).catch(console.warn);
            }
        }

        actualizarTabla();
        formManual.reset();
        document.getElementById('clienteManual').focus();
        mostrarNotificacion('Éxito!', 'Cliente nuevo guardado correctamente.', 'success');
    });

    // Función para actualizar la tabla con los datos
    function actualizarTabla() {
        const tablaBody = document.getElementById('tabla-body');
        const emptyState = document.getElementById('emptyState');
        const registrosCount = document.getElementById('registrosCount');
        tablaBody.innerHTML = '';

        let totalImporte = data.reduce((sum, item) => sum + item.importe, 0);
        let totalCobrar = (totalImporte * 100 / 75) * 0.125;

        const totalAmountValue = document.getElementById('totalAmountValue');
        if (totalAmountValue) {
            totalAmountValue.textContent = `$${totalCobrar.toFixed(2)}`;
        }

        if (registrosCount) {
            registrosCount.textContent = `${data.length} Registro${data.length !== 1 ? 's' : ''}`;
        }

        if (emptyState) {
            emptyState.style.display = data.length === 0 ? 'flex' : 'none';
        }

        let count = data.length;

        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];
            const row = tablaBody.insertRow();

            const cellCount = row.insertCell(0);
            const cellNombre = row.insertCell(1);
            const cellAfiliado = row.insertCell(2);
            const cellImporte = row.insertCell(3);
            const cellProductos = row.insertCell(4);
            const cellCargadoPor = row.insertCell(5);
            const cellAcciones = row.insertCell(6);

            cellCount.textContent = count;
            count--;

            cellNombre.textContent = item.nombre;
            cellAfiliado.textContent = item.afiliado || '-';
            cellImporte.textContent = '$' + item.importe.toFixed(2);

            if (item.productos) {
                cellProductos.innerHTML = `<span class="producto-tag">${item.productos}</span>`;
            } else {
                cellProductos.textContent = '-';
            }

            // Mostrar el usuario que cargó el comprobante
            const usuarioAlias = item.cargado_por ? (item.cargado_por.includes('@') ? item.cargado_por.split('@')[0] : item.cargado_por) : 'Manual';
            cellCargadoPor.innerHTML = `<span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: var(--color-primary-light); color: var(--color-primary);">${usuarioAlias}</span>`;

            // Botón eliminar
            const btnEliminar = document.createElement('button');
            btnEliminar.classList.add('btn-eliminar');
            btnEliminar.setAttribute('aria-label', 'Eliminar registro');
            btnEliminar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-eliminar">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>`;

            btnEliminar.addEventListener('click', function () {
                eliminarRegistro(item);
            });

            cellAcciones.appendChild(btnEliminar);
        }
    }

    // Función para eliminar un registro del array 'data' y de Neon DB
    async function eliminarRegistro(item) {
        const index = data.indexOf(item);
        if (index > -1) {
            const confirmacion = confirm(`¿Estás seguro de que deseas eliminar el registro de ${item.nombre}?`);
            if (confirmacion) {
                if (item.id) {
                    try {
                        await eliminarRegistroDeNeon(item.id);
                    } catch (err) {
                        console.warn('Error al eliminar de Neon:', err);
                    }
                }
                data.splice(index, 1);

                const indexNuevo = nuevosClientes.findIndex(c => c.Cliente === item.nombre && c.Afiliado === item.afiliado);
                if (indexNuevo > -1) {
                    nuevosClientes.splice(indexNuevo, 1);
                }

                actualizarTabla();
                mostrarNotificacion('Eliminado', 'Registro eliminado.', 'success');
            }
        }
    }

    // Función para crear el archivo Excel
    function crearExcel() {
        // 1. Identificar clientes en los registros del lote activo
        const clientesEnLote = [];
        const mapaLote = new Map();
        data.forEach(item => {
            const k = (item.nombre || '').trim().toLowerCase();
            if (k && !mapaLote.has(k)) {
                mapaLote.set(k, { Cliente: item.nombre.trim(), Afiliado: (item.afiliado || '').toString().trim() });
                clientesEnLote.push({ Cliente: item.nombre.trim(), Afiliado: (item.afiliado || '').toString().trim() });
            }
        });

        // 2. Set de nombres del padrón base preexistente (sin contar los marcados como ES_NUEVO)
        const padronBaseMap = new Map();
        baseDatos.forEach(c => {
            if (!c || !c.NOMBRE) return;
            const k = c.NOMBRE.toString().trim().toLowerCase();
            if (!c.ES_NUEVO) {
                padronBaseMap.set(k, { NOMBRE: c.NOMBRE.toString().trim(), NUMERO: (c.NUMERO || '').toString().trim() });
            }
        });

        // 3. Determinar la lista completa de NUEVOS CLIENTES
        // Aquellos en nuevosClientes O aquellos en el lote que no estén en el padrón base
        const nuevosClientesMap = new Map();
        nuevosClientes.forEach(nc => {
            const k = (nc.Cliente || '').trim().toLowerCase();
            if (k && !padronBaseMap.has(k)) {
                nuevosClientesMap.set(k, { Cliente: nc.Cliente.trim(), Afiliado: (nc.Afiliado || '').toString().trim() });
            }
        });
        clientesEnLote.forEach(cl => {
            const k = cl.Cliente.toLowerCase();
            if (!padronBaseMap.has(k) && !nuevosClientesMap.has(k)) {
                nuevosClientesMap.set(k, { Cliente: cl.Cliente, Afiliado: cl.Afiliado });
            }
        });

        const listaNuevosFinal = Array.from(nuevosClientesMap.values()).sort((a, b) => a.Cliente.localeCompare(b.Cliente));

        // 4. Crear la hoja 'base-de-datos' con TODOS los clientes (padrón base + todos los nuevos)
        const todosClientesMap = new Map();
        baseDatos.forEach(c => {
            if (!c || !c.NOMBRE) return;
            const k = c.NOMBRE.toString().trim().toLowerCase();
            todosClientesMap.set(k, { NOMBRE: c.NOMBRE.toString().trim(), NUMERO: (c.NUMERO || '').toString().trim() });
        });
        listaNuevosFinal.forEach(nc => {
            const k = nc.Cliente.toLowerCase();
            if (!todosClientesMap.has(k)) {
                todosClientesMap.set(k, { NOMBRE: nc.Cliente, NUMERO: nc.Afiliado });
            }
        });
        clientesEnLote.forEach(cl => {
            const k = cl.Cliente.toLowerCase();
            if (!todosClientesMap.has(k)) {
                todosClientesMap.set(k, { NOMBRE: cl.Cliente, NUMERO: cl.Afiliado });
            }
        });

        const combinedClientes = Array.from(todosClientesMap.values()).sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE));
        combinedClientes.forEach((cliente, index) => {
            cliente.ID = index + 1;
        });

        // Crear una hoja "base-de-datos"
        const hojaBaseDatos = XLSX.utils.json_to_sheet(combinedClientes, { header: ["ID", "NOMBRE", "NUMERO"] });
        XLSX.utils.sheet_add_aoa(hojaBaseDatos, [["ID", "NOMBRE", "NUMERO"]], { origin: "A1" });

        // Preparar la hoja "Datos" con ORDEN, NOMBRE, AFILIADO, IMPORTE, PRODUCTOS y CARGADO POR
        const datosOrdenados = [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Añadir las columnas
        const datosConOrden = datosOrdenados.map((item, index) => ({
            ORDEN: index + 1,
            NOMBRE: item.nombre,
            AFILIADO: item.afiliado || '',
            IMPORTE: item.importe,
            PRODUCTOS: item.productos || '',
            "CARGADO POR": item.cargado_por || ''
        }));

        // Crear una hoja "Datos"
        const hojaDatos = XLSX.utils.json_to_sheet(datosConOrden, { header: ["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE", "PRODUCTOS", "CARGADO POR"] });
        XLSX.utils.sheet_add_aoa(hojaDatos, [["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE", "PRODUCTOS", "CARGADO POR"]], { origin: "A1" });

        // Crear una hoja "Nuevos Clientes" si hay nuevos clientes
        let hojaNuevosClientes = null;
        if (listaNuevosFinal.length > 0) {
            hojaNuevosClientes = XLSX.utils.json_to_sheet(listaNuevosFinal, { header: ["Cliente", "Afiliado"] });
            XLSX.utils.sheet_add_aoa(hojaNuevosClientes, [["Cliente", "Afiliado"]], { origin: "A1" });
        }

        // ========== DATOS PARA EL PDF ==========
        // Obtener datos de la farmacia desde Neon (cargados al inicio)
        const farmaciaInfo = getFarmaciaInfo() || {
            nombre: "FARMACIA - DATOS NO CONFIGURADOS",
            ubicacion: "Por favor configure sus datos en Neon"
        };

        // Preparar datos del reporte con columnas calculadas
        const datosReporte = datosOrdenados.map((item, index) => {
            const importeTotal = item.importe * 100 / 75;
            const cargoAfiliado = item.importe; // 75% - el importe original
            const cargoFarmacia = importeTotal * 0.125; // 12.5%
            const cargoObraSocial = importeTotal * 0.125; // 12.5%

            return {
                ORDEN: index + 1,
                "APELLIDO Y NOMBRE": item.nombre,
                "NUMERO DE AFILIADO": item.afiliado,
                "IMPORTE TOTAL": importeTotal,
                "CARGO DEL AFILIADO 75%": cargoAfiliado,
                "A CARGO DE LA FARMACIA 12,5%": cargoFarmacia,
                "A CARGO DE LA OBRA SOCIAL 12,5%": cargoObraSocial
            };
        });

        // Calcular totales
        const totales = datosReporte.reduce((acc, item) => {
            acc.importeTotal += item["IMPORTE TOTAL"];
            acc.cargoAfiliado += item["CARGO DEL AFILIADO 75%"];
            acc.cargoFarmacia += item["A CARGO DE LA FARMACIA 12,5%"];
            acc.cargoObraSocial += item["A CARGO DE LA OBRA SOCIAL 12,5%"];
            return acc;
        }, { importeTotal: 0, cargoAfiliado: 0, cargoFarmacia: 0, cargoObraSocial: 0 });

        // Crear un nuevo workbook y agregar las hojas
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, hojaBaseDatos, "base-de-datos");
        XLSX.utils.book_append_sheet(workbook, hojaDatos, "Datos");
        if (hojaNuevosClientes) {
            XLSX.utils.book_append_sheet(workbook, hojaNuevosClientes, "Nuevos Clientes");
        }

        // Generar nombre de archivo con formato IASEP-yyyy-mm-MONTH.xlsx
        const nombreArchivo = generarNombreArchivo('xlsx');

        // Escribir el workbook a una cadena binaria
        const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

        // Convertir la cadena binaria a un Blob
        const blob = new Blob([s2ab(excelBinary)], { type: "application/octet-stream" });

        // Crear un enlace para descargar el archivo
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.click();

        // También generar el PDF
        crearPDF(datosReporte, totales, farmaciaInfo);
    }

    // Función para generar el nombre del archivo con formato IASEP-yyyy-mm-MONTH.ext
    function generarNombreArchivo(extension) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const mesesEspanol = [
            'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
            'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
        ];
        const monthName = mesesEspanol[now.getMonth()];

        return "IASEP-" + year + "-" + month + "-" + monthName + "." + extension;
    }

    // Función para crear el PDF con logos
    async function crearPDF(datosReporte, totales, farmaciaInfo) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // ============ CONFIGURACIÓN DE LOGOS (MODIFICAR AQUÍ) ============
        // Formato: posX, posY, ancho, alto (todos en mm)
        // LOGO IZQUIERDO (farmacia)
        const logoLeftX = 10;      // Posición X
        const logoLeftY = 5;       // Posición Y
        const logoLeftWidth = 50;  // Ancho - MODIFICAR ESTE VALOR
        const logoLeftHeight = 50; // Alto - MODIFICAR ESTE VALOR

        // LOGO DERECHO (IASEP)
        const logoRightX = 220;    // Posición X
        const logoRightY = 5;      // Posición Y
        const logoRightWidth = 75; // Ancho - MODIFICAR ESTE VALOR
        const logoRightHeight = 50;// Alto - MODIFICAR ESTE VALOR
        // ==================================================================

        // Cargar imágenes como base64
        const imgLeftBase64 = await cargarImagenComoBase64('assets/iasep_img_left.png');
        const imgRightBase64 = await cargarImagenComoBase64('assets/iasep_img_right.png');

        // Agregar logo izquierdo
        if (imgLeftBase64) {
            doc.addImage(imgLeftBase64, 'PNG', logoLeftX, logoLeftY, logoLeftWidth, logoLeftHeight);
        }

        // Agregar logo derecho
        if (imgRightBase64) {
            doc.addImage(imgRightBase64, 'PNG', logoRightX, logoRightY, logoRightWidth, logoRightHeight);
        }

        // Encabezado con información de la farmacia
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(farmaciaInfo.nombre, 148, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(farmaciaInfo.ubicacion, 148, 28, { align: 'center' });

        // Título del reporte
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CARATULA DE PRESENTACION DE RECETAS', 148, 42, { align: 'center' });

        // Preparar datos para la tabla
        const tableData = datosReporte.map(item => [
            item.ORDEN,
            item["APELLIDO Y NOMBRE"],
            item["NUMERO DE AFILIADO"],
            formatearMoneda(item["IMPORTE TOTAL"]),
            formatearMoneda(item["CARGO DEL AFILIADO 75%"]),
            formatearMoneda(item["A CARGO DE LA FARMACIA 12,5%"]),
            formatearMoneda(item["A CARGO DE LA OBRA SOCIAL 12,5%"])
        ]);

        // Agregar fila de totales
        tableData.push([
            '',
            '',
            'Totales',
            formatearMoneda(totales.importeTotal),
            formatearMoneda(totales.cargoAfiliado),
            formatearMoneda(totales.cargoFarmacia),
            formatearMoneda(totales.cargoObraSocial)
        ]);

        // Crear tabla
        doc.autoTable({
            startY: 60, // MODIFICAR ESTE VALOR para mover la tabla más abajo
            head: [[
                'ORDEN',
                'APELLIDO Y NOMBRE',
                'NUMERO DE AFILIADO',
                'IMPORTE TOTAL',
                'CARGO DEL AFILIADO 75%',
                'A CARGO DE LA FARMACIA 12,5%',
                'A CARGO DE LA OBRA SOCIAL 12,5%'
            ]],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 10, // MODIFICAR ESTE VALOR para cambiar tamaño de fuente
                cellPadding: 2
            },
            headStyles: {
                fillColor: [70, 130, 180],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                // MODIFICAR cellWidth para ajustar ancho de cada columna
                0: { halign: 'center', cellWidth: 15 },  // ORDEN
                1: { cellWidth: 75 },                     // APELLIDO Y NOMBRE
                2: { halign: 'center', cellWidth: 40 },   // NUMERO DE AFILIADO
                3: { halign: 'right', cellWidth: 35 },    // IMPORTE TOTAL
                4: { halign: 'right', cellWidth: 35 },    // CARGO DEL AFILIADO
                5: { halign: 'right', cellWidth: 35 },    // A CARGO DE LA FARMACIA
                6: { halign: 'right', cellWidth: 35 }     // A CARGO DE LA OBRA SOCIAL
            },
            didParseCell: function (data) {
                // Estilo especial para la fila de totales
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        // Guardar PDF
        const nombreArchivoPDF = generarNombreArchivo('pdf');
        doc.save(nombreArchivoPDF);
    }

    // Función para cargar imagen como base64
    function cargarImagenComoBase64(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (e) {
                    console.error('Error al convertir imagen:', e);
                    resolve(null);
                }
            };
            img.onerror = function () {
                console.error('Error al cargar imagen:', url);
                resolve(null);
            };
            img.src = url;
        });
    }

    // Función para formatear moneda
    function formatearMoneda(valor) {
        return '$ ' + valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Función para convertir una cadena a ArrayBuffer
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    }

    // Función para alternar el tema
    function toggleTheme() {
        console.log('toggleTheme ejecutado');
        const body = document.body;
        body.classList.toggle('dark-theme');

        // Guardar la preferencia del usuario
        const isDarkTheme = body.classList.contains('dark-theme');
        localStorage.setItem('darkTheme', isDarkTheme);

        // Toggle icons visibility
        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            if (moonIcon && sunIcon) {
                moonIcon.style.display = isDarkTheme ? 'none' : 'block';
                sunIcon.style.display = isDarkTheme ? 'block' : 'none';
            }
        }
    }

    // Aplicar el tema guardado cuando la página carga
    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        // Toggle icons for dark theme
        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            if (moonIcon && sunIcon) {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            }
        }
    }

    // Event listener para el interruptor de tema (ahora es un botón)
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // =========================================================================
    // GESTIÓN DE LOTES EN NEON DB
    // =========================================================================
    const selectLote = document.getElementById('selectLote');
    const btnNuevoLote = document.getElementById('btnNuevoLote');
    const modalNuevoLote = document.getElementById('modalNuevoLote');
    const btnCerrarNuevoLote = document.getElementById('btnCerrarNuevoLote');
    const formNuevoLote = document.getElementById('formNuevoLote');

    async function cargarLotesDropdown() {
        if (!selectLote) return;
        const email = obtenerEmailUsuario();
        const lotes = await obtenerLotesFarmacia(email);
        selectLote.innerHTML = '';

        if (!lotes || lotes.length === 0) {
            const loteActivo = await obtenerLoteActivoOInicial(email);
            const opt = document.createElement('option');
            opt.value = loteActivo.id;
            opt.textContent = loteActivo.nombre;
            selectLote.appendChild(opt);
            return loteActivo;
        }

        const loteActivo = await obtenerLoteActivoOInicial(email);
        lotes.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.nombre;
            if (loteActivo && l.id === loteActivo.id) {
                opt.selected = true;
            }
            selectLote.appendChild(opt);
        });

        const indicador = document.getElementById('scannerLoteIndicador');
        if (indicador && loteActivo) {
            indicador.textContent = `Lote: ${loteActivo.nombre}`;
        }
        const confirmLote = document.getElementById('confirmLoteNombre');
        if (confirmLote && loteActivo) {
            confirmLote.textContent = loteActivo.nombre;
        }

        return loteActivo;
    }

    async function cargarRegistrosDeLoteActivo() {
        const lote = getLoteActivo();
        if (!lote || !lote.id) return;

        try {
            const regs = await obtenerRegistrosLote(lote.id);
            data.length = 0;
            regs.forEach(r => {
                data.push({
                    id: r.id,
                    nombre: r.nombre,
                    afiliado: r.afiliado,
                    importe: parseFloat(r.importe),
                    productos: r.productos || '',
                    cargado_por: r.cargado_por
                });
            });
            actualizarTabla();
        } catch (e) {
            console.warn('Error al sincronizar registros de Neon:', e);
        }
    }

    const btnEliminarLote = document.getElementById('btnEliminarLote');
    const modalEliminarLote = document.getElementById('modalEliminarLote');
    const btnCerrarEliminarLote = document.getElementById('btnCerrarEliminarLote');
    const btnCancelarEliminarLote = document.getElementById('btnCancelarEliminarLote');
    const btnConfirmarEliminarLote = document.getElementById('btnConfirmarEliminarLote');
    const lblNombreLoteAEliminar = document.getElementById('lblNombreLoteAEliminar');
    let loteIdAEliminar = null;

    if (btnNuevoLote) {
        btnNuevoLote.addEventListener('click', () => {
            if (modalNuevoLote) {
                modalNuevoLote.style.display = 'block';
                const inp = document.getElementById('inputNombreLote');
                if (inp) inp.focus();
            }
        });
    }

    if (btnCerrarNuevoLote) {
        btnCerrarNuevoLote.addEventListener('click', () => {
            if (modalNuevoLote) modalNuevoLote.style.display = 'none';
        });
    }

    const btnCancelarNuevoLote = document.getElementById('btnCancelarNuevoLote');
    if (btnCancelarNuevoLote) {
        btnCancelarNuevoLote.addEventListener('click', () => {
            if (modalNuevoLote) modalNuevoLote.style.display = 'none';
        });
    }

    if (formNuevoLote) {
        formNuevoLote.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('inputNombreLote');
            const nombre = input ? input.value.trim() : '';
            if (!nombre) return;

            try {
                const email = obtenerEmailUsuario();
                const nuevo = await crearLoteEnNeon(nombre, email);
                setLoteActivo(nuevo);
                await cargarLotesDropdown();
                await cargarRegistrosDeLoteActivo();
                if (modalNuevoLote) modalNuevoLote.style.display = 'none';
                formNuevoLote.reset();
                mostrarNotificacion('Lote Creado', `Se activó el lote "${nombre}".`, 'success');
            } catch (err) {
                mostrarNotificacion('Error', 'No se pudo crear el lote: ' + err.message, 'error');
            }
        });
    }

    if (btnEliminarLote) {
        btnEliminarLote.addEventListener('click', () => {
            const loteActivo = getLoteActivo();
            if (!loteActivo || !loteActivo.id) {
                mostrarNotificacion('Aviso', 'No hay ningún lote seleccionado para eliminar.', 'error');
                return;
            }
            loteIdAEliminar = loteActivo.id;
            if (lblNombreLoteAEliminar) {
                lblNombreLoteAEliminar.textContent = `"${loteActivo.nombre}"`;
            }
            if (modalEliminarLote) {
                modalEliminarLote.style.display = 'block';
            }
        });
    }

    if (btnCerrarEliminarLote) {
        btnCerrarEliminarLote.addEventListener('click', () => {
            if (modalEliminarLote) modalEliminarLote.style.display = 'none';
        });
    }
    if (btnCancelarEliminarLote) {
        btnCancelarEliminarLote.addEventListener('click', () => {
            if (modalEliminarLote) modalEliminarLote.style.display = 'none';
        });
    }

    if (btnConfirmarEliminarLote) {
        btnConfirmarEliminarLote.addEventListener('click', async () => {
            if (!loteIdAEliminar) return;
            btnConfirmarEliminarLote.disabled = true;
            btnConfirmarEliminarLote.textContent = 'Eliminando...';

            try {
                const loteActivo = getLoteActivo();
                const nombreEliminado = loteActivo ? loteActivo.nombre : '';
                await eliminarLoteEnNeon(loteIdAEliminar);
                localStorage.removeItem('lote_activo_id');
                loteActivoGlobal = null;

                if (modalEliminarLote) modalEliminarLote.style.display = 'none';
                await cargarLotesDropdown();
                await cargarRegistrosDeLoteActivo();
                mostrarNotificacion('Lote Eliminado', `El lote "${nombreEliminado}" fue eliminado correctamente.`, 'success');
            } catch (err) {
                console.error('Error al eliminar lote:', err);
                mostrarNotificacion('Error', 'No se pudo eliminar el lote: ' + err.message, 'error');
            } finally {
                btnConfirmarEliminarLote.disabled = false;
                btnConfirmarEliminarLote.textContent = 'Sí, Eliminar Lote';
                loteIdAEliminar = null;
            }
        });
    }

    if (selectLote) {
        selectLote.addEventListener('change', async () => {
            const selId = selectLote.value;
            const email = obtenerEmailUsuario();
            const lotes = await obtenerLotesFarmacia(email);
            const found = lotes.find(l => l.id == selId);
            if (found) {
                setLoteActivo(found);
                const indicador = document.getElementById('scannerLoteIndicador');
                if (indicador) indicador.textContent = `Lote: ${found.nombre}`;
                const confirmLote = document.getElementById('confirmLoteNombre');
                if (confirmLote) confirmLote.textContent = found.nombre;
                await cargarRegistrosDeLoteActivo();
                mostrarNotificacion('Lote Cambiado', `Ahora viendo "${found.nombre}".`, 'success');
            }
        });
    }

    // Inicializar lotes al cargar
    cargarLotesDropdown().then(() => {
        cargarRegistrosDeLoteActivo();
    });

    // Sincronización automática suave cada 15 segundos para trabajo multi-dispositivo
    setInterval(() => {
        if (!document.hidden && (!modalScanner || modalScanner.style.display !== 'block')) {
            cargarRegistrosDeLoteActivo();
        }
    }, 15000);

    // =========================================================================
    // CONFIGURACIÓN DE GEMINI IA
    // =========================================================================
    const btnAbrirConfigGemini = document.getElementById('btnAbrirConfigGemini');
    const modalGeminiConfig = document.getElementById('modalGeminiConfig');
    const btnCerrarConfigGemini = document.getElementById('btnCerrarConfigGemini');
    const formGeminiConfig = document.getElementById('formGeminiConfig');
    const cfgGeminiApiKey = document.getElementById('cfgGeminiApiKey');
    const cfgGeminiModel = document.getElementById('cfgGeminiModel');
    const cfgDispositivoNombre = document.getElementById('cfgDispositivoNombre');
    const btnProbarKeyGemini = document.getElementById('btnProbarKeyGemini');
    const cfgTestStatus = document.getElementById('cfgTestStatus');

    if (btnAbrirConfigGemini) {
        btnAbrirConfigGemini.addEventListener('click', () => {
            if (cfgGeminiApiKey) cfgGeminiApiKey.value = ScannerService.getApiKey();
            if (cfgGeminiModel) cfgGeminiModel.value = ScannerService.getSelectedModel();
            if (cfgDispositivoNombre) cfgDispositivoNombre.value = localStorage.getItem('nombre_dispositivo') || '';
            if (cfgTestStatus) cfgTestStatus.style.display = 'none';
            if (modalGeminiConfig) modalGeminiConfig.style.display = 'block';
        });
    }

    if (btnCerrarConfigGemini) {
        btnCerrarConfigGemini.addEventListener('click', () => {
            if (modalGeminiConfig) modalGeminiConfig.style.display = 'none';
        });
    }

    if (btnProbarKeyGemini) {
        btnProbarKeyGemini.addEventListener('click', async () => {
            const key = cfgGeminiApiKey.value.trim();
            const model = cfgGeminiModel.value;
            if (!key) {
                cfgTestStatus.style.display = 'block';
                cfgTestStatus.style.background = 'rgba(239, 68, 68, 0.15)';
                cfgTestStatus.style.color = 'var(--color-delete)';
                cfgTestStatus.textContent = 'Por favor ingresa la clave de API primero.';
                return;
            }

            btnProbarKeyGemini.disabled = true;
            btnProbarKeyGemini.textContent = 'Probando...';
            cfgTestStatus.style.display = 'block';
            cfgTestStatus.style.background = 'rgba(99, 102, 241, 0.15)';
            cfgTestStatus.style.color = 'var(--color-primary)';
            cfgTestStatus.textContent = 'Conectando con Google AI Studio...';

            const testRes = await ScannerService.testApiKey(key, model);
            btnProbarKeyGemini.disabled = false;
            btnProbarKeyGemini.textContent = 'Probar Conexión';

            if (testRes.success) {
                cfgTestStatus.style.background = 'rgba(16, 185, 129, 0.15)';
                cfgTestStatus.style.color = '#10b981';
                cfgTestStatus.textContent = testRes.message;
            } else {
                cfgTestStatus.style.background = 'rgba(239, 68, 68, 0.15)';
                cfgTestStatus.style.color = 'var(--color-delete)';
                cfgTestStatus.textContent = 'Error: ' + testRes.message;
            }
        });
    }

    if (formGeminiConfig) {
        formGeminiConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = cfgGeminiApiKey.value.trim();
            const model = cfgGeminiModel.value;
            ScannerService.setApiKey(key);
            ScannerService.setSelectedModel(model);

            if (cfgDispositivoNombre) {
                const disp = cfgDispositivoNombre.value.trim();
                if (disp) {
                    localStorage.setItem('nombre_dispositivo', disp);
                } else {
                    localStorage.removeItem('nombre_dispositivo');
                }
                actualizarNombreDispositivoUI();
            }

            // Sincronizar clave y modelo en la base de datos de Neon para que los celulares la obtengan automáticamente
            const guardadoDb = await guardarConfiguracionGeminiEnNeon(key, model);

            if (modalGeminiConfig) modalGeminiConfig.style.display = 'none';
            if (guardadoDb) {
                mostrarNotificacion('Configuración Guardada', `API Key sincronizada en la nube para ${model}.`, 'success');
            } else {
                mostrarNotificacion('Configuración Guardada', `Configuración guardada localmente para ${model}.`, 'success');
            }
        });
    }

    // =========================================================================
    // IDENTIFICACIÓN DEL DISPOSITIVO / OPERADOR MÓVIL
    // =========================================================================
    const btnConfigurarDispositivo = document.getElementById('btnConfigurarDispositivo');
    const lblNombreDispositivo = document.getElementById('lblNombreDispositivo');
    const modalDispositivo = document.getElementById('modalDispositivo');
    const btnCerrarModalDispositivo = document.getElementById('btnCerrarModalDispositivo');
    const btnCancelarModalDispositivo = document.getElementById('btnCancelarModalDispositivo');
    const formDispositivoModal = document.getElementById('formDispositivoModal');
    const inputModalNombreDispositivo = document.getElementById('inputModalNombreDispositivo');
    const btnCambiarDispositivoEnScan = document.getElementById('btnCambiarDispositivoEnScan');
    const lblDispositivoConfirm = document.getElementById('lblDispositivoConfirm');

    function actualizarNombreDispositivoUI() {
        const nombre = localStorage.getItem('nombre_dispositivo') || 'Celular 1';
        if (lblNombreDispositivo) lblNombreDispositivo.textContent = nombre;
        if (lblDispositivoConfirm) lblDispositivoConfirm.textContent = nombre;
        if (cfgDispositivoNombre) cfgDispositivoNombre.value = localStorage.getItem('nombre_dispositivo') || '';
    }
    actualizarNombreDispositivoUI();

    function abrirModalDispositivo() {
        if (inputModalNombreDispositivo) {
            inputModalNombreDispositivo.value = localStorage.getItem('nombre_dispositivo') || '';
        }
        if (modalDispositivo) modalDispositivo.style.display = 'block';
        if (inputModalNombreDispositivo) inputModalNombreDispositivo.focus();
    }

    if (btnConfigurarDispositivo) {
        btnConfigurarDispositivo.addEventListener('click', abrirModalDispositivo);
    }
    if (btnCambiarDispositivoEnScan) {
        btnCambiarDispositivoEnScan.addEventListener('click', abrirModalDispositivo);
    }
    if (btnCerrarModalDispositivo) {
        btnCerrarModalDispositivo.addEventListener('click', () => {
            if (modalDispositivo) modalDispositivo.style.display = 'none';
        });
    }
    if (btnCancelarModalDispositivo) {
        btnCancelarModalDispositivo.addEventListener('click', () => {
            if (modalDispositivo) modalDispositivo.style.display = 'none';
        });
    }
    if (formDispositivoModal) {
        formDispositivoModal.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = inputModalNombreDispositivo ? inputModalNombreDispositivo.value.trim() : '';
            if (val) {
                localStorage.setItem('nombre_dispositivo', val);
            } else {
                localStorage.removeItem('nombre_dispositivo');
            }
            actualizarNombreDispositivoUI();
            if (modalDispositivo) modalDispositivo.style.display = 'none';
            mostrarNotificacion('Dispositivo Configurado', `Operador activo: "${val || 'Predeterminado'}".`, 'success');
        });
    }

    // =========================================================================
    // LÓGICA DEL ASISTENTE DE ESCÁNER (DOBLE CAPTURA + 1 LLAMADA IA) - PWA MÓVIL
    // =========================================================================
    const btnAbrirScanner = document.getElementById('btnAbrirScanner');
    const modalScanner = document.getElementById('modalScanner');
    const btnCerrarScanner = document.getElementById('btnCerrarScanner');

    const stepPill1 = document.getElementById('stepPill1');
    const stepPill2 = document.getElementById('stepPill2');
    const stepPill3 = document.getElementById('stepPill3');
    const stepView1 = document.getElementById('stepView1');
    const stepView2 = document.getElementById('stepView2');
    const stepView3 = document.getElementById('stepView3');

    // Paso 1: Receta
    const videoReceta = document.getElementById('videoReceta');
    const cameraBoxReceta = document.getElementById('cameraBoxReceta');
    const actionsBarReceta = document.getElementById('actionsBarReceta');
    const btnCapturarReceta = document.getElementById('btnCapturarReceta');
    const btnSubirFotoReceta = document.getElementById('btnSubirFotoReceta');
    const fileInputReceta = document.getElementById('fileInputReceta');

    // Paso 2: Ticket
    const bannerRecetaLista = document.getElementById('bannerRecetaLista');
    const btnRehacerReceta = document.getElementById('btnRehacerReceta');
    const cameraBoxTicket = document.getElementById('cameraBoxTicket');
    const videoTicket = document.getElementById('videoTicket');
    const aiProcessingTicket = document.getElementById('aiProcessingTicket');
    const aiProcessingTitleTicket = document.getElementById('aiProcessingTitleTicket');
    const actionsBarTicket = document.getElementById('actionsBarTicket');
    const btnCapturarTicketTotal = document.getElementById('btnCapturarTicketTotal');
    const btnImporteManualTicket = document.getElementById('btnImporteManualTicket');
    const btnSubirFotoTicket = document.getElementById('btnSubirFotoTicket');
    const fileInputTicket = document.getElementById('fileInputTicket');
    const cardManualTicket = document.getElementById('cardManualTicket');
    const inputScanImporteManual = document.getElementById('inputScanImporteManual');
    const btnCancelarManualTicket = document.getElementById('btnCancelarManualTicket');
    const btnAvanzarConImporteManual = document.getElementById('btnAvanzarConImporteManual');

    // Paso 3: Confirmación
    const badgeAiModeloConfirm = document.getElementById('badgeAiModeloConfirm');
    const badgePadronReceta = document.getElementById('badgePadronReceta');
    const confirmNombre = document.getElementById('confirmNombre');
    const confirmAfiliado = document.getElementById('confirmAfiliado');
    const confirmImporte = document.getElementById('confirmImporte');
    const inputScanProductos = document.getElementById('inputScanProductos');
    const confirmCargoAfiliado = document.getElementById('confirmCargoAfiliado');
    const confirmCargoFarmacia = document.getElementById('confirmCargoFarmacia');
    const confirmCargoOS = document.getElementById('confirmCargoOS');
    const btnGuardarYSiguiente = document.getElementById('btnGuardarYSiguiente');
    const btnReintentarTodo = document.getElementById('btnReintentarTodo');
    const btnFinalizarScanner = document.getElementById('btnFinalizarScanner');

    // Variables en memoria para almacenar las imágenes antes del envío unificado
    let capturedRecetaSource = null;
    let capturedTicketSource = null;
    let currentScannerStep = 1;

    /**
     * Captura instantánea de un fotograma del video en memoria (sin retraso de red)
     */
    function captureVideoFrame(videoEl) {
        if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * Calcula y actualiza el desglose de liquidación (75% / 12.5% / 12.5%)
     */
    function actualizarDesgloseConfirmacion(importeVal) {
        const imp = typeof importeVal === 'number' ? importeVal : parseFloat(importeVal);
        if (!isNaN(imp) && imp > 0) {
            const totalCalculado = (imp * 100 / 75);
            if (confirmCargoAfiliado) confirmCargoAfiliado.textContent = `$${imp.toFixed(2)}`;
            if (confirmCargoFarmacia) confirmCargoFarmacia.textContent = `$${(totalCalculado * 0.125).toFixed(2)}`;
            if (confirmCargoOS) confirmCargoOS.textContent = `$${(totalCalculado * 0.125).toFixed(2)}`;
        } else {
            if (confirmCargoAfiliado) confirmCargoAfiliado.textContent = '$0.00';
            if (confirmCargoFarmacia) confirmCargoFarmacia.textContent = '$0.00';
            if (confirmCargoOS) confirmCargoOS.textContent = '$0.00';
        }
    }

    function extractDniCore(numStr) {
        if (!numStr) return '';
        const digits = numStr.toString().replace(/[^0-9]/g, '');
        if (digits.length >= 10) {
            // En formato carnet IASEP 3-XXXXXXXX-00 o 3XXXXXXXX00, el DNI son los dígitos centrales
            return digits.slice(1, -2);
        }
        return digits;
    }

    function normalizeClientName(str) {
        if (!str) return '';
        return str.toString().toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
            .replace(/[^A-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Verifica si el afiliado existe en el padrón local de la farmacia
     */
    function verificarAfiliadoEnBase(nombre, afiliado) {
        let encontrado = null;
        const normNombre = normalizeClientName(nombre);
        const fmtAfil = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(afiliado) : (afiliado || '').toString().trim();
        const cleanAfil = fmtAfil ? fmtAfil.toString().replace(/[^0-9]/g, '') : '';
        const dniAfil = extractDniCore(fmtAfil);

        if (baseDatos && baseDatos.length > 0) {
            // 1. Búsqueda directa por Carnet estándar D-DDDDDDDD-DD (más rápida y unívoca)
            if (fmtAfil) {
                encontrado = baseDatos.find(c => c && c.NUMERO && c.NUMERO === fmtAfil);
            }

            // 2. Búsqueda por dígitos limpios o núcleo de DNI
            if (!encontrado && (cleanAfil || dniAfil)) {
                encontrado = baseDatos.find(c => {
                    if (!c || c.NUMERO === undefined || c.NUMERO === null) return false;
                    const clean = c.NUMERO.toString().replace(/[^0-9]/g, '');
                    const dniClean = extractDniCore(c.NUMERO);
                    if (cleanAfil && clean && cleanAfil === clean) return true;
                    if (dniAfil && dniClean && dniAfil.length >= 6 && dniAfil === dniClean) return true;
                    if (dniAfil && clean && clean.length >= 6 && (clean === dniAfil || clean.includes(dniAfil))) return true;
                    if (cleanAfil && dniClean && dniClean.length >= 6 && cleanAfil.includes(dniClean)) return true;
                    return false;
                });
            }

            // 2. Búsqueda por Nombre normalizado
            if (!encontrado && normNombre) {
                encontrado = baseDatos.find(c => {
                    if (!c || !c.NOMBRE) return false;
                    const normC = normalizeClientName(c.NOMBRE);
                    if (normC === normNombre) return true;
                    // Coincidencia por palabras si tiene al menos apellido y nombre
                    const partsA = normNombre.split(' ').filter(p => p.length > 2);
                    const partsB = normC.split(' ').filter(p => p.length > 2);
                    if (partsA.length >= 2 && partsB.length >= 2) {
                        const coincideTodos = partsA.every(p => partsB.includes(p));
                        if (coincideTodos) return true;
                    }
                    return false;
                });
            }
        }

        if (badgePadronReceta) {
            if (encontrado) {
                badgePadronReceta.textContent = '✓ Afiliado en Padrón';
                badgePadronReceta.className = 'result-badge-padron match';
            } else {
                badgePadronReceta.textContent = 'ℹ️ Nuevo Afiliado';
                badgePadronReceta.className = 'result-badge-padron new';
            }
        }
        return encontrado;
    }

    /**
     * Transición entre los pasos del asistente
     */
    async function irAPaso(paso) {
        currentScannerStep = paso;

        if (stepPill1) stepPill1.classList.remove('active', 'done');
        if (stepPill2) stepPill2.classList.remove('active', 'done');
        if (stepPill3) stepPill3.classList.remove('active', 'done');

        if (paso === 1) {
            if (stepPill1) stepPill1.classList.add('active');
            if (stepView1) stepView1.style.display = 'flex';
            if (stepView2) stepView2.style.display = 'none';
            if (stepView3) stepView3.style.display = 'none';

            // Apagar cámara ticket y encender cámara receta
            ScannerService.stopCamera(videoTicket);
            try {
                await ScannerService.startCamera(videoReceta);
            } catch (err) {
                console.warn('Error al iniciar cámara de receta:', err);
            }
        } else if (paso === 2) {
            if (stepPill1) stepPill1.classList.add('done');
            if (stepPill2) stepPill2.classList.add('active');
            if (stepView1) stepView1.style.display = 'none';
            if (stepView2) stepView2.style.display = 'flex';
            if (stepView3) stepView3.style.display = 'none';

            // Ocultar card de manual y spinner al iniciar paso 2
            if (cardManualTicket) cardManualTicket.style.display = 'none';
            if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';

            // Apagar cámara receta y encender cámara ticket
            ScannerService.stopCamera(videoReceta);
            try {
                await ScannerService.startCamera(videoTicket);
            } catch (err) {
                console.warn('Error al iniciar cámara de ticket:', err);
            }
        } else if (paso === 3) {
            if (stepPill1) stepPill1.classList.add('done');
            if (stepPill2) stepPill2.classList.add('done');
            if (stepPill3) stepPill3.classList.add('active');
            if (stepView1) stepView1.style.display = 'none';
            if (stepView2) stepView2.style.display = 'none';
            if (stepView3) stepView3.style.display = 'flex';

            // Apagar ambas cámaras para ahorrar batería
            ScannerService.stopCamera(videoReceta);
            ScannerService.stopCamera(videoTicket);
        }
    }

    if (btnAbrirScanner) {
        btnAbrirScanner.addEventListener('click', async () => {
            if (!ScannerService.getApiKey()) {
                mostrarNotificacion('Configura tu API Key', 'Por favor ingresa tu API Key de Google Gemini en Configuración ⚙️ antes de escanear.', 'error');
                if (modalGeminiConfig) modalGeminiConfig.style.display = 'block';
                return;
            }

            modalScanner.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Resetear estado
            capturedRecetaSource = null;
            capturedTicketSource = null;
            if (cardManualTicket) cardManualTicket.style.display = 'none';
            if (inputScanImporteManual) inputScanImporteManual.value = '';
            if (confirmNombre) confirmNombre.value = '';
            if (confirmAfiliado) confirmAfiliado.value = '';
            if (confirmImporte) confirmImporte.value = '';
            if (inputScanProductos) inputScanProductos.value = '';
            actualizarDesgloseConfirmacion(0);

            irAPaso(1);
        });
    }

    if (btnCerrarScanner) {
        btnCerrarScanner.addEventListener('click', cerrarModalScanner);
    }
    if (btnFinalizarScanner) {
        btnFinalizarScanner.addEventListener('click', cerrarModalScanner);
    }

    function cerrarModalScanner() {
        ScannerService.stopCamera(videoReceta);
        ScannerService.stopCamera(videoTicket);
        capturedRecetaSource = null;
        capturedTicketSource = null;
        if (modalScanner) modalScanner.style.display = 'none';
        document.body.style.overflow = '';
        cargarRegistrosDeLoteActivo();
    }

    // --- PASO 1: Captura de Receta en Memoria (0s de espera, sin llamada a IA) ---
    if (btnCapturarReceta) {
        btnCapturarReceta.addEventListener('click', () => {
            const frame = captureVideoFrame(videoReceta);
            if (!frame) {
                mostrarNotificacion('Cámara', 'No se pudo capturar la imagen. Asegúrate de enfocar el recetario.', 'error');
                return;
            }
            capturedRecetaSource = frame;
            if (navigator.vibrate) {
                try { navigator.vibrate(60); } catch (e) {}
            }
            // Pasa directamente a Paso 2 (Ticket) de forma instantánea
            irAPaso(2);
        });
    }

    if (btnSubirFotoReceta) {
        btnSubirFotoReceta.addEventListener('click', () => {
            if (fileInputReceta) fileInputReceta.click();
        });
    }

    if (fileInputReceta) {
        fileInputReceta.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                capturedRecetaSource = evt.target.result;
                irAPaso(2);
            };
            reader.readAsDataURL(file);
        });
    }

    // --- PASO 2: Ticket (Foto con IA o Importe Manual) ---
    if (btnRehacerReceta) {
        btnRehacerReceta.addEventListener('click', () => {
            capturedRecetaSource = null;
            irAPaso(1);
        });
    }

    // Opción A: Tomar Foto Ticket y Analizar Ambos en 1 Sola Llamada a Gemini
    if (btnCapturarTicketTotal) {
        btnCapturarTicketTotal.addEventListener('click', async () => {
            if (!capturedRecetaSource) {
                mostrarNotificacion('Aviso', 'Falta la foto de la receta. Volviendo al Paso 1...', 'error');
                irAPaso(1);
                return;
            }

            const frame = captureVideoFrame(videoTicket);
            if (!frame) {
                mostrarNotificacion('Cámara', 'No se pudo capturar la imagen del ticket.', 'error');
                return;
            }
            capturedTicketSource = frame;

            // Detener cámara del ticket durante el análisis para liberar recursos
            ScannerService.stopCamera(videoTicket);

            // Mostrar indicador de análisis unificado
            if (aiProcessingTicket) aiProcessingTicket.style.display = 'flex';
            if (aiProcessingTitleTicket) {
                aiProcessingTitleTicket.textContent = `Analizando Receta y Ticket con ${ScannerService.getSelectedModel()}...`;
            }

            try {
                // 1 SOLA LLAMADA A GEMINI CON AMBAS IMÁGENES NATIVAS
                const res = await ScannerService.extractCompleteRecipeAndTicket(capturedRecetaSource, capturedTicketSource);
                if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';

                // Llenar campos de Confirmación (Paso 3)
                let nombreLimpio = (res.nombre || '').replace(/[.,\-_/]+$/, '').trim();
                let afiliadoLimpio = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(res.afiliado || '') : (res.afiliado || '').replace(/[.,\-_/]+$/, '').trim();
                const importeNum = (res.importe !== null && !isNaN(res.importe)) ? res.importe : null;

                // Enriquecer con los datos oficiales si coincide en el padrón
                const afiliadoPadron = verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                if (afiliadoPadron) {
                    if (afiliadoPadron.NUMERO) afiliadoLimpio = afiliadoPadron.NUMERO;
                    if (afiliadoPadron.NOMBRE) nombreLimpio = afiliadoPadron.NOMBRE;
                }

                if (confirmNombre) confirmNombre.value = nombreLimpio;
                if (confirmAfiliado) confirmAfiliado.value = afiliadoLimpio;
                if (confirmImporte) confirmImporte.value = importeNum !== null ? importeNum.toFixed(2) : '';
                if (inputScanProductos) inputScanProductos.value = res.productosStr || '';

                if (badgeAiModeloConfirm) {
                    badgeAiModeloConfirm.textContent = `🤖 ${res.modelUsed}`;
                }

                if (lblDispositivoConfirm) {
                    lblDispositivoConfirm.textContent = obtenerNombreOperador();
                }

                verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                actualizarDesgloseConfirmacion(importeNum || 0);

                if (navigator.vibrate) {
                    try { navigator.vibrate(100); } catch (e) {}
                }

                irAPaso(3);

                if (importeNum === null) {
                    mostrarNotificacion('Aviso', 'No se detectó el TOTAL en el ticket. Por favor ingrésalo en la casilla Total.', 'error');
                    if (confirmImporte) confirmImporte.focus();
                }
            } catch (err) {
                if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';
                mostrarNotificacion('Error en IA', err.message, 'error');
                irAPaso(3);
                if (confirmImporte) confirmImporte.focus();
            }
        });
    }

    if (btnSubirFotoTicket) {
        btnSubirFotoTicket.addEventListener('click', () => {
            if (fileInputTicket) fileInputTicket.click();
        });
    }

    if (fileInputTicket) {
        fileInputTicket.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (evt) => {
                capturedTicketSource = evt.target.result;
                ScannerService.stopCamera(videoTicket);

                if (aiProcessingTicket) aiProcessingTicket.style.display = 'flex';
                if (aiProcessingTitleTicket) {
                    aiProcessingTitleTicket.textContent = `Analizando con ${ScannerService.getSelectedModel()}...`;
                }

                try {
                    const res = await ScannerService.extractCompleteRecipeAndTicket(capturedRecetaSource, capturedTicketSource);
                    if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';

                    let nombreLimpio = (res.nombre || '').replace(/[.,\-_/]+$/, '').trim();
                    let afiliadoLimpio = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(res.afiliado || '') : (res.afiliado || '').replace(/[.,\-_/]+$/, '').trim();
                    const importeNum = (res.importe !== null && !isNaN(res.importe)) ? res.importe : null;

                    // Enriquecer con los datos oficiales si coincide en el padrón
                    const afiliadoPadron = verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                    if (afiliadoPadron) {
                        if (afiliadoPadron.NUMERO) afiliadoLimpio = afiliadoPadron.NUMERO;
                        if (afiliadoPadron.NOMBRE) nombreLimpio = afiliadoPadron.NOMBRE;
                    }

                    if (confirmNombre) confirmNombre.value = nombreLimpio;
                    if (confirmAfiliado) confirmAfiliado.value = afiliadoLimpio;
                    if (confirmImporte) confirmImporte.value = importeNum !== null ? importeNum.toFixed(2) : '';
                    if (inputScanProductos) inputScanProductos.value = res.productosStr || '';

                    if (badgeAiModeloConfirm) badgeAiModeloConfirm.textContent = `🤖 ${res.modelUsed}`;
                    if (lblDispositivoConfirm) lblDispositivoConfirm.textContent = obtenerNombreOperador();

                    verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                    actualizarDesgloseConfirmacion(importeNum || 0);

                    irAPaso(3);
                } catch (err) {
                    if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';
                    mostrarNotificacion('Error en IA', err.message, 'error');
                    irAPaso(3);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Opción B: Ingreso Manual de Ticket
    if (btnImporteManualTicket) {
        btnImporteManualTicket.addEventListener('click', () => {
            if (cardManualTicket) {
                const isHidden = cardManualTicket.style.display === 'none' || !cardManualTicket.style.display;
                cardManualTicket.style.display = isHidden ? 'block' : 'none';
                if (isHidden && inputScanImporteManual) {
                    inputScanImporteManual.focus();
                }
            }
        });
    }

    if (btnCancelarManualTicket) {
        btnCancelarManualTicket.addEventListener('click', () => {
            if (cardManualTicket) cardManualTicket.style.display = 'none';
        });
    }

    if (btnAvanzarConImporteManual) {
        btnAvanzarConImporteManual.addEventListener('click', async () => {
            const manualImp = parseFloat(inputScanImporteManual ? inputScanImporteManual.value : '');
            if (isNaN(manualImp) || manualImp <= 0) {
                mostrarNotificacion('Aviso', 'Por favor ingresa un importe válido para el ticket.', 'error');
                if (inputScanImporteManual) inputScanImporteManual.focus();
                return;
            }

            ScannerService.stopCamera(videoTicket);
            if (aiProcessingTicket) aiProcessingTicket.style.display = 'flex';
            if (aiProcessingTitleTicket) {
                aiProcessingTitleTicket.textContent = `Extrayendo datos de Receta con ${ScannerService.getSelectedModel()}...`;
            }

            try {
                // Al tener el importe manual, solo se procesa la receta con la IA
                const res = await ScannerService.extractRecipeData(capturedRecetaSource);
                if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';

                let nombreLimpio = (res.nombre || '').replace(/[.,\-_/]+$/, '').trim();
                let afiliadoLimpio = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(res.afiliado || '') : (res.afiliado || '').replace(/[.,\-_/]+$/, '').trim();

                // Enriquecer con los datos oficiales si coincide en el padrón
                const afiliadoPadron = verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                if (afiliadoPadron) {
                    if (afiliadoPadron.NUMERO) afiliadoLimpio = afiliadoPadron.NUMERO;
                    if (afiliadoPadron.NOMBRE) nombreLimpio = afiliadoPadron.NOMBRE;
                }

                if (confirmNombre) confirmNombre.value = nombreLimpio;
                if (confirmAfiliado) confirmAfiliado.value = afiliadoLimpio;
                if (confirmImporte) confirmImporte.value = manualImp.toFixed(2);
                if (inputScanProductos) inputScanProductos.value = res.productosStr || '';

                if (badgeAiModeloConfirm) badgeAiModeloConfirm.textContent = `🤖 ${res.modelUsed}`;
                if (lblDispositivoConfirm) lblDispositivoConfirm.textContent = obtenerNombreOperador();

                verificarAfiliadoEnBase(nombreLimpio, afiliadoLimpio);
                actualizarDesgloseConfirmacion(manualImp);

                irAPaso(3);
            } catch (err) {
                if (aiProcessingTicket) aiProcessingTicket.style.display = 'none';
                mostrarNotificacion('Error en Receta', err.message, 'error');
                if (confirmImporte) confirmImporte.value = manualImp.toFixed(2);
                actualizarDesgloseConfirmacion(manualImp);
                irAPaso(3);
            }
        });
    }

    // --- PASO 3: Confirmación y Guardado Rápido ---
    if (confirmImporte) {
        confirmImporte.addEventListener('input', () => {
            const imp = parseFloat(confirmImporte.value);
            actualizarDesgloseConfirmacion(imp);
        });
    }

    if (confirmNombre) {
        confirmNombre.addEventListener('input', () => {
            verificarAfiliadoEnBase(confirmNombre.value, confirmAfiliado ? confirmAfiliado.value : '');
        });
        confirmNombre.addEventListener('blur', () => {
            if (confirmNombre.value && (!confirmAfiliado.value || confirmAfiliado.value.trim() === '')) {
                const match = verificarAfiliadoEnBase(confirmNombre.value, '');
                if (match && match.NUMERO) {
                    confirmAfiliado.value = match.NUMERO;
                }
            }
        });
    }

    if (confirmAfiliado) {
        confirmAfiliado.addEventListener('input', () => {
            verificarAfiliadoEnBase(confirmNombre ? confirmNombre.value : '', confirmAfiliado.value);
        });
        confirmAfiliado.addEventListener('blur', () => {
            if (confirmAfiliado.value) {
                if (typeof formatCarnetIasep === 'function') {
                    confirmAfiliado.value = formatCarnetIasep(confirmAfiliado.value);
                }
                const match = verificarAfiliadoEnBase(confirmNombre ? confirmNombre.value : '', confirmAfiliado.value);
                if (match && match.NOMBRE && (!confirmNombre.value || confirmNombre.value.trim() === '')) {
                    confirmNombre.value = match.NOMBRE;
                }
            }
        });
    }

    if (btnReintentarTodo) {
        btnReintentarTodo.addEventListener('click', () => {
            capturedRecetaSource = null;
            capturedTicketSource = null;
            irAPaso(1);
        });
    }

    if (btnGuardarYSiguiente) {
        btnGuardarYSiguiente.addEventListener('click', async () => {
            const nombre = confirmNombre ? confirmNombre.value.replace(/[.,\-_/]+$/, '').trim() : '';
            const rawAfiliado = confirmAfiliado ? confirmAfiliado.value.replace(/[.,\-_/]+$/, '').trim() : '';
            const afiliado = typeof formatCarnetIasep === 'function' ? formatCarnetIasep(rawAfiliado) : rawAfiliado;
            const rawImporte = confirmImporte ? confirmImporte.value : '';
            const importe = parseFloat(rawImporte);
            const productos = inputScanProductos ? inputScanProductos.value.trim() : '';

            if (!nombre) {
                mostrarNotificacion('Aviso', 'Por favor ingresa el nombre del afiliado.', 'error');
                if (confirmNombre) confirmNombre.focus();
                return;
            }

            if (isNaN(importe) || importe <= 0) {
                mostrarNotificacion('Aviso', 'Por favor ingresa el total del ticket.', 'error');
                if (confirmImporte) confirmImporte.focus();
                return;
            }

            btnGuardarYSiguiente.disabled = true;
            btnGuardarYSiguiente.textContent = 'Guardando en Neon...';

            try {
                const loteActivo = getLoteActivo();
                const email = obtenerEmailUsuario();
                const operador = obtenerNombreOperador();
                let guardado = null;

                if (loteActivo && loteActivo.id) {
                    try {
                        guardado = await guardarRegistroEnNeon({
                            lote_id: loteActivo.id,
                            farmacia_email: email,
                            nombre,
                            afiliado,
                            importe,
                            productos,
                            cargado_por: operador
                        });
                    } catch (errNeon) {
                        console.warn('Error al guardar en Neon, guardando local:', errNeon);
                    }
                }

                data.push({
                    id: guardado ? guardado.id : undefined,
                    nombre,
                    afiliado,
                    importe,
                    productos,
                    cargado_por: operador
                });

                // Registrar en padrón local si es nuevo cliente
                const existeEnBase = baseDatos.some(c => c.NOMBRE && c.NOMBRE.trim().toLowerCase() === nombre.toLowerCase());
                if (!existeEnBase) {
                    if (!nuevosClientes.some(c => c.Cliente && c.Cliente.trim().toLowerCase() === nombre.toLowerCase())) {
                        nuevosClientes.push({ Cliente: nombre, Afiliado: afiliado });
                    }
                    baseDatos.push({
                        ID: baseDatos.length + 1,
                        NOMBRE: nombre,
                        NUMERO: afiliado,
                        ES_NUEVO: true
                    });
                    try { localStorage.setItem('clientes_padron', JSON.stringify(baseDatos)); } catch (e) {}

                    if (email && typeof guardarClienteEnNeon === 'function') {
                        guardarClienteEnNeon({ nombre, numero: afiliado, es_nuevo: true }, email).catch(console.warn);
                    }
                }

                actualizarTabla();
                mostrarNotificacion('Guardado', `Comprobante de ${nombre} registrado con éxito.`, 'success');

                // Limpiar formulario y variables en memoria
                capturedRecetaSource = null;
                capturedTicketSource = null;
                if (confirmNombre) confirmNombre.value = '';
                if (confirmAfiliado) confirmAfiliado.value = '';
                if (confirmImporte) confirmImporte.value = '';
                if (inputScanProductos) inputScanProductos.value = '';
                if (inputScanImporteManual) inputScanImporteManual.value = '';
                actualizarDesgloseConfirmacion(0);

                // Volver a Paso 1 inmediatamente para la siguiente receta
                irAPaso(1);
            } catch (e) {
                console.error('Error al guardar:', e);
                mostrarNotificacion('Error', 'No se pudo guardar: ' + e.message, 'error');
            } finally {
                btnGuardarYSiguiente.disabled = false;
                btnGuardarYSiguiente.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>GUARDAR Y SIGUIENTE RECETA</span>`;
            }
        });
    }
});