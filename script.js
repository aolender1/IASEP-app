// Cargar datos de la farmacia desde Neon al iniciar
document.addEventListener('DOMContentLoaded', async function () {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userEmail = sessionStorage.getItem('userEmail');
    if (isLoggedIn && userEmail) {
        // Los datos se cargan usando la función global de neon-config.js
        await cargarDatosFarmacia();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const clienteInput = document.getElementById('cliente');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirDatosExcelButton = document.getElementById('subirDatosExcel'); // Nuevo botón
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle'); // Interruptor de tema
    const mostrarNumeroCliente = document.getElementById('mostrar-numero-cliente');
    const btnDictado = document.getElementById('btnDictado'); // Botón de dictado
    const btnDictadoManual = document.getElementById('btnDictadoManual'); // Botón de dictado manual

    // --- VARIABLES Y LÓGICA DE DICTADO POR VOZ ---
    let dictationActive = false;
    let dictationSource = 'MAIN'; // 'MAIN' o 'MANUAL'
    let dictationState = 'INACTIVO'; // CLIENTE, IMPORTE, MANUAL_CLIENTE, MANUAL_AFILIADO, MANUAL_IMPORTE
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
                mostrarNumeroCliente.textContent = `Número: ${selected.NUMERO}`;
                mostrarNumeroCliente.classList.add('visible');
                suggestionsContainer.style.display = 'none';

                dictationState = 'IMPORTE';
                importeInput.focus();

                // Extraer posible número que se dijo en la misma oración, ej: "elguero teresa treinta mil"
                let posibleImporte = Array.from(transcript.matchAll(/\d+/g)).join('');
                if (posibleImporte) {
                    // Si dijo números, procesarlos de inmediato
                    procesarTranscripcionImporte(transcript);
                } else {
                    mostrarNotificacion('Cliente Seleccionado', `${selected.NOMBRE}\n\nDiga el importe...`, 'success');
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

    function showSuggestionsForVoice(clientesList) {
        suggestionsContainer.innerHTML = '';
        clientesList.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = cliente.NOMBRE;
            suggestionItem.addEventListener('click', (event) => {
                event.stopPropagation();
                clienteInput.value = cliente.NOMBRE;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                mostrarNumeroCliente.textContent = `Número: ${cliente.NUMERO}`;
                mostrarNumeroCliente.classList.add('visible');
                importeInput.focus();
                if (dictationActive) {
                    dictationState = 'IMPORTE';
                    mostrarNotificacion('Cliente Seleccionado', `${cliente.NOMBRE}\n\nDiga el importe...`, 'success');
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
            if (clienteInput.value.trim() !== '' && importeInput.value.trim() !== '') {
                guardarDatos();
                if (dictationActive) {
                    dictationState = 'CLIENTE';
                    dictationFilteredClientes = baseDatos;
                    mostrarNotificacion('Registro Exitoso', 'Datos guardados.\n\nDiga el nombre del próximo cliente.', 'success');
                }
            } else {
                mostrarNotificacion('Aviso', 'Falta el nombre o el importe.', 'error');
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
        baseDatos = clientesData; // Actualizar el array baseDatos
        console.log("Carga de clientes completada desde Excel:", baseDatos);
    }

    // Función para mostrar sugerencias
    function showSuggestions(value) {
        suggestionsContainer.innerHTML = '';
        const filteredClientes = baseDatos.filter(cliente =>
            cliente.NOMBRE.toLowerCase().includes(value.toLowerCase())
        );

        filteredClientes.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = cliente.NOMBRE;
            suggestionItem.addEventListener('click', (event) => {
                event.stopPropagation();
                clienteInput.value = cliente.NOMBRE;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                mostrarNumeroCliente.textContent = `Número: ${cliente.NUMERO}`;
                mostrarNumeroCliente.classList.add('visible');
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

    // Event listener para cambios en el input 'clienteInput'
    clienteInput.addEventListener('input', function () {
        const value = this.value;
        currentIndex = -1; // Reiniciar el índice actual al cambiar la entrada
        if (value) {
            showSuggestions(value);
        } else {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!suggestionsContainer.contains(e.target) && e.target !== clienteInput) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });

    // Event listener para teclas en el input 'clienteInput'
    clienteInput.addEventListener('keydown', function (event) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

        if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevenir scroll por defecto
            currentIndex = (currentIndex + 1) % suggestions.length; // Mover hacia abajo en la lista
            highlightSuggestion(suggestions);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevenir scroll por defecto
            currentIndex = (currentIndex - 1 + suggestions.length) % suggestions.length; // Mover hacia arriba en la lista
            highlightSuggestion(suggestions);
        } else if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir envío del formulario
            if (currentIndex >= 0 && currentIndex < suggestions.length) {
                clienteInput.value = suggestions[currentIndex].textContent;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                const clienteSeleccionado = baseDatos.find(c => c.NOMBRE === suggestions[currentIndex].textContent);
                if (clienteSeleccionado) {
                    mostrarNumeroCliente.textContent = `Número: ${clienteSeleccionado.NUMERO}`;
                    mostrarNumeroCliente.classList.add('visible');
                }
                importeInput.focus();
            } else {
                const inputValue = clienteInput.value.toLowerCase();
                const filteredClientes = baseDatos.filter(cliente =>
                    cliente.NOMBRE.toLowerCase().includes(inputValue)
                );

                if (filteredClientes.length > 0) {
                    clienteInput.value = filteredClientes[0].NOMBRE;
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                    const primerCliente = filteredClientes[0];
                    mostrarNumeroCliente.textContent = `Número: ${primerCliente.NUMERO}`;
                    mostrarNumeroCliente.classList.add('visible');
                    importeInput.focus();
                } else {
                    mostrarNotificacion('Aviso', 'No se encontró ningún nombre coincidente en la lista.', 'error');
                    mostrarNumeroCliente.textContent = '';
                    mostrarNumeroCliente.classList.remove('visible');
                }
            }
        }
    });

    // Event listener para la tecla 'Enter' en el input 'clienteInput'
    clienteInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const inputValue = clienteInput.value.toLowerCase();
            const filteredClientes = baseDatos.filter(cliente =>
                cliente.NOMBRE.toLowerCase().includes(inputValue)
            );

            if (filteredClientes.length > 0) {
                clienteInput.value = filteredClientes[0].NOMBRE;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                const primerCliente = filteredClientes[0];
                mostrarNumeroCliente.textContent = `Número: ${primerCliente.NUMERO}`;
                mostrarNumeroCliente.classList.add('visible');
                importeInput.focus();
            } else {
                alert('No se encontró ningún nombre coincidente en la lista.');
                mostrarNumeroCliente.textContent = '';
                mostrarNumeroCliente.classList.remove('visible');
            }
        }
    });

    // Limpiar el div al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!suggestionsContainer.contains(e.target) && e.target !== clienteInput) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            mostrarNumeroCliente.textContent = '';
            mostrarNumeroCliente.classList.remove('visible');
        }
    });

    // Función para resaltar la sugerencia actual
    function highlightSuggestion(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.remove('highlighted'); // Remover resalto de todas las sugerencias
            if (index === currentIndex) {
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
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

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
                mostrarNotificacion('Exito!', 'Datos cargados correctamente desde Excel.', 'success');
            };
            reader.readAsArrayBuffer(file); // Leer el contenido del archivo como ArrayBuffer
        }
    });

    // Función para guardar los datos ingresados desde el formulario principal
    function guardarDatos() {
        const nombre = clienteInput.value.trim();
        const importe = parseFloat(importeInput.value.replace('$', '').replace(',', '')); // Convertir a float

        if (!nombre) {
            mostrarNotificacion('Aviso', 'Por favor ingrese un nombre válido.', 'error');
            return;
        }

        // Buscar el número de afiliado correspondiente al nombre
        const clienteEncontrado = baseDatos.find(cliente => cliente.NOMBRE.toLowerCase() === nombre.toLowerCase());
        if (!clienteEncontrado) {
            mostrarNotificacion('Aviso', 'Cliente no encontrado en la lista de afiliados.', 'error');
            return;
        }

        const afiliado = clienteEncontrado.NUMERO;

        console.log('Nombre:', nombre, 'Afiliado:', afiliado, 'Importe:', importe);

        if (nombre && !isNaN(importe)) {
            data.push({ nombre, afiliado, importe });
            console.log('Datos guardados:', data);
            actualizarTabla();
            // Limpiar los inputs después de guardar
            clienteInput.value = '';
            importeInput.value = '';
            // Focar nuevamente en el input 'cliente'
            clienteInput.focus();
        } else {
            console.log('Validación fallida');
            mostrarNotificacion('Aviso', 'Por favor ingrese un nombre y un importe válido.', 'error');
        }
    }

    // Función para guardar los datos ingresados desde el formulario manual  
    formManual.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevenir el envío por defecto  

        const nombreManual = document.getElementById('clienteManual').value.trim();
        const afiliadoManual = document.getElementById('afiliadoManual').value.trim();
        const importeManual = parseFloat(document.getElementById('importeManual').value.replace('$', '').replace(',', ''));

        // Validación de los campos  
        if (!nombreManual || !afiliadoManual || isNaN(importeManual)) {
            mostrarNotificacion('Aviso', 'Por favor, complete todos los campos correctamente.', 'error');
            return;
        }

        // Agregar al array principal 'data' para almacenar la factura  
        data.push({ nombre: nombreManual, afiliado: afiliadoManual, importe: importeManual });

        // Agregar al array 'nuevosClientes' solo si el cliente no existe previamente  
        if (!baseDatos.some(c => c.NOMBRE.toLowerCase() === nombreManual.toLowerCase()) &&
            !nuevosClientes.some(c => c.Cliente.toLowerCase() === nombreManual.toLowerCase())) {
            nuevosClientes.push({ Cliente: nombreManual, Afiliado: afiliadoManual });
        }

        console.log('Datos manuales guardados:', data);
        console.log('Nuevos Clientes:', nuevosClientes);

        actualizarTabla();

        // Limpiar los campos del formulario para ingresar otro cliente  
        formManual.reset();

        // Focar nuevamente en el primer input del formulario manual  
        document.getElementById('clienteManual').focus();
    });

    // Función para actualizar la tabla con los datos
    function actualizarTabla() {
        const tablaBody = document.getElementById('tabla-body');
        const emptyState = document.getElementById('emptyState');
        const registrosCount = document.getElementById('registrosCount');
        tablaBody.innerHTML = ''; // Limpiar la tabla

        // Calcular el total de importes y actualizar el mensaje de total a cobrar
        let totalImporte = data.reduce((sum, item) => sum + item.importe, 0);
        let totalCobrar = (totalImporte * 100 / 75) * 0.125;

        // Actualizar el nuevo elemento de total
        const totalAmountValue = document.getElementById('totalAmountValue');
        if (totalAmountValue) {
            totalAmountValue.textContent = `$${totalCobrar.toFixed(2)}`;
        }

        // Actualizar contador de registros
        if (registrosCount) {
            registrosCount.textContent = `${data.length} Registro${data.length !== 1 ? 's' : ''}`;
        }

        // Mostrar u ocultar estado vacío
        if (emptyState) {
            emptyState.style.display = data.length === 0 ? 'flex' : 'none';
        }

        let count = data.length; // Contador que inicia con el total de facturas

        // Iterar sobre 'data' desde el último hacia el primero
        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];
            const row = tablaBody.insertRow();

            // Nueva celda para el número de factura
            const cellCount = row.insertCell(0);
            // Las demás celdas se desplazarán una posición a la derecha
            const cellNombre = row.insertCell(1);
            const cellImporte = row.insertCell(2);
            const cellAcciones = row.insertCell(3); // Celda para el botón de eliminación

            cellCount.textContent = count;
            count--;

            cellNombre.textContent = item.nombre;
            cellImporte.textContent = '$' + item.importe.toFixed(2);

            // Crear el botón de eliminación
            const btnEliminar = document.createElement('button');
            btnEliminar.classList.add('btn-eliminar');
            btnEliminar.setAttribute('aria-label', 'Eliminar registro'); // Accesibilidad

            // Crear SVG inline para el icono de eliminar
            btnEliminar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-eliminar">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>`;

            // Establecer el evento para eliminar la factura
            btnEliminar.addEventListener('click', function () {
                eliminarRegistro(item);
            });

            cellAcciones.appendChild(btnEliminar);
        }
    }

    // Función para eliminar un registro del array 'data' y actualizar la tabla
    function eliminarRegistro(item) {
        const index = data.indexOf(item);
        if (index > -1) {
            // Confirmación antes de eliminar
            const confirmacion = confirm('¿Estás seguro de que deseas eliminar este registro?');
            if (confirmacion) {
                data.splice(index, 1); // Eliminar el elemento del array

                // Si el cliente está en 'nuevosClientes', eliminarlo de ahí también
                const indexNuevo = nuevosClientes.findIndex(c => c.Cliente === item.nombre && c.Afiliado === item.afiliado);
                if (indexNuevo > -1) {
                    nuevosClientes.splice(indexNuevo, 1);
                }

                actualizarTabla(); // Actualizar la tabla
            }
        }
    }

    // Función para crear el archivo Excel
    function crearExcel() {
        // Combinar baseDatos con nuevosClientes para crear 'base-de-datos'
        const combinedClientes = [...baseDatos, ...nuevosClientes.map(c => ({
            ID: "", // Placeholder, se asignará después
            NOMBRE: c.Cliente,
            NUMERO: c.Afiliado
        }))];

        // Ordenar alfabéticamente por NOMBRE
        combinedClientes.sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE));

        // Asignar IDs secuenciales
        combinedClientes.forEach((cliente, index) => {
            cliente.ID = index + 1;
        });

        // Crear una hoja "base-de-datos"
        const hojaBaseDatos = XLSX.utils.json_to_sheet(combinedClientes, { header: ["ID", "NOMBRE", "NUMERO"] });
        XLSX.utils.sheet_add_aoa(hojaBaseDatos, [["ID", "NOMBRE", "NUMERO"]], { origin: "A1" });

        // Preparar la hoja "Datos" con ORDEN, NOMBRE, AFILIADO e IMPORTE
        // Aquí usamos 'data' que contiene las entradas cargadas en la sesión actual
        // Ordenamos alfabéticamente por NOMBRE
        const datosOrdenados = [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Añadir la columna 'ORDEN'
        const datosConOrden = datosOrdenados.map((item, index) => ({
            ORDEN: index + 1,
            NOMBRE: item.nombre,
            AFILIADO: item.afiliado,
            IMPORTE: item.importe
        }));

        // Crear una hoja "Datos"
        const hojaDatos = XLSX.utils.json_to_sheet(datosConOrden, { header: ["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE"] });
        XLSX.utils.sheet_add_aoa(hojaDatos, [["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE"]], { origin: "A1" });

        // Crear una hoja "Nuevos Clientes" si hay nuevos clientes
        let hojaNuevosClientes = null;
        if (nuevosClientes.length > 0) {
            // Sort 'nuevosClientes' alfabéticamente por Cliente
            const nuevosClientesOrdenados = [...nuevosClientes].sort((a, b) => a.Cliente.localeCompare(b.Cliente));

            // Crear la hoja de trabajo para nuevos clientes
            hojaNuevosClientes = XLSX.utils.json_to_sheet(nuevosClientesOrdenados, { header: ["Cliente", "Afiliado"] });
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
});