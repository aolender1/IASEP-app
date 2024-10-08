document.addEventListener("DOMContentLoaded", function() {
    const clienteInput = document.getElementById('cliente');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirJSONButton = document.getElementById('subirJSON');
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle'); // Interruptor de tema

    const data = []; // Array para almacenar los datos ingresados
    let clientes = []; // Array global para almacenar los datos de los clientes
    let currentIndex = -1;

    // Función para cargar clientes desde JSON y actualizar el array global 'clientes'
    function cargarClientesDesdeJSON(clientesData) {
        console.log("Iniciando carga de clientes:", clientesData);
        clientes = clientesData; // Actualizar el array global clientes
        console.log("Carga de clientes completada:", clientes);
    }

    // Función para mostrar sugerencias
    function showSuggestions(value) {
        suggestionsContainer.innerHTML = ''; // Limpiar sugerencias anteriores
        const filteredClientes = clientes.filter(cliente =>
            cliente.NOMBRE.toLowerCase().includes(value.toLowerCase())
        );

        filteredClientes.forEach(cliente => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = cliente.NOMBRE;
            suggestionItem.addEventListener('click', () => {
                clienteInput.value = cliente.NOMBRE;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                // Mover el foco al siguiente input
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
    clienteInput.addEventListener('input', function() {
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
    document.addEventListener('click', function(e) {
        if (!suggestionsContainer.contains(e.target) && e.target !== clienteInput) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });

    // Event listener para teclas en el input 'clienteInput'
    clienteInput.addEventListener('keydown', function(event) {
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
                // Seleccionar la sugerencia resaltada
                clienteInput.value = suggestions[currentIndex].textContent;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                importeInput.focus(); // Mover el foco al input de importe
            } else {
                // Si no hay sugerencia resaltada, seleccionar el primer cliente coincidente
                const inputValue = clienteInput.value.toLowerCase();
                const filteredClientes = clientes.filter(cliente =>
                    cliente.NOMBRE.toLowerCase().includes(inputValue)
                );

                if (filteredClientes.length > 0) {
                    clienteInput.value = filteredClientes[0].NOMBRE; // Autocompletar al primer cliente coincidente
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                    importeInput.focus(); // Mover el foco al input de importe
                }
            }
        }
    });

    // Event listener para la tecla 'Enter' en el input 'clienteInput'
    clienteInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir envío del formulario

            const inputValue = clienteInput.value.toLowerCase();
            const filteredClientes = clientes.filter(cliente =>
                cliente.NOMBRE.toLowerCase().includes(inputValue)
            );

            if (filteredClientes.length > 0) {
                // Autocompletar al primer cliente coincidente
                clienteInput.value = filteredClientes[0].NOMBRE;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                importeInput.focus(); // Mover el foco al input de importe
            } else {
                // No se encontraron clientes coincidentes
                alert('No se encontró ningún nombre coincidente en la lista.');
            }
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
    importeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir envío del formulario si lo hubiera
            guardarDatos();
        }
    });

    // Event listener para el botón 'CARGAR'
    cargarButton.addEventListener('click', guardarDatos);

    // Event listener para el botón 'Crear EXCEL'
    crearExcelButton.addEventListener('click', function() {
        if (data.length === 0) {
            alert('No hay datos para crear el Excel.');
            return;
        }
        crearExcel();
    });

    // Event listener para el botón 'Subir JSON'
    subirJSONButton.addEventListener('click', function() {
        fileInput.click(); // Abrir el diálogo de selección de archivo JSON
    });

    // Event listener para el cambio en el input de archivo
    fileInput.addEventListener('change', function(event) {
        console.log("Archivo seleccionado");
        const file = event.target.files[0]; // Obtener el primer archivo seleccionado
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log("Archivo leído");
            const contenido = e.target.result;
            try {
                console.log("Contenido del archivo:", contenido);
                const json = JSON.parse(contenido);
                console.log("JSON parseado:", json);
                cargarClientesDesdeJSON(json); // Procesar el JSON
                alert('JSON cargado correctamente.');
            } catch (error) {
                console.error("Error al procesar JSON:", error);
                alert('Error al cargar el archivo JSON.');
            }
        };
        reader.readAsText(file); // Leer el contenido del archivo como texto
    });

    // Función para guardar los datos ingresados
    function guardarDatos() {
        const nombre = clienteInput.value.trim();
        const importe = parseFloat(importeInput.value.replace('$', '').replace(',', '')); // Convertir a float

        if (!nombre) {
            alert('Por favor ingrese un nombre válido.');
            return;
        }

        // Buscar el número de afiliado correspondiente al nombre
        const clienteEncontrado = clientes.find(cliente => cliente.NOMBRE.toLowerCase() === nombre.toLowerCase());
        if (!clienteEncontrado) {
            alert('Cliente no encontrado en la lista de afiliados.');
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
            alert('Por favor ingrese un nombre y un importe válido.');
        }
    }

    // Función para actualizar la tabla con los datos
    function actualizarTabla() {
        const tablaBody = document.getElementById('tabla-body');
        tablaBody.innerHTML = ''; // Limpiar la tabla

        // Iterar sobre el array 'data' desde el último hasta el primero
        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];
            const row = tablaBody.insertRow();

            const cellNombre = row.insertCell(0);
            const cellImporte = row.insertCell(1);
            const cellAcciones = row.insertCell(2); // Nueva celda para acciones

            cellNombre.textContent = item.nombre;
            cellImporte.textContent = '$' + item.importe.toFixed(2);

            // Crear el botón de eliminación utilizando una etiqueta <button> con una <img>
            const btnEliminar = document.createElement('button');
            btnEliminar.classList.add('btn-eliminar');
            btnEliminar.setAttribute('aria-label', 'Eliminar registro'); // Accesibilidad

            // Crear la etiqueta <img> para el SVG
            const imgEliminar = document.createElement('img');
            imgEliminar.src = 'assets/delete-icon.svg'; // Ruta al archivo SVG
            imgEliminar.alt = 'Eliminar';
            imgEliminar.classList.add('icon-eliminar');

            btnEliminar.appendChild(imgEliminar);

            // Añadir evento al botón para eliminar la fila
            btnEliminar.addEventListener('click', function() {
                eliminarRegistro(i);
            });

            cellAcciones.appendChild(btnEliminar);
        }
    }

    // Función para eliminar un registro del array 'data' y actualizar la tabla
    function eliminarRegistro(index) {
        if (index > -1 && index < data.length) {
            // Confirmación antes de eliminar
            const confirmacion = confirm('¿Estás seguro de que deseas eliminar este registro?');
            if (confirmacion) {
                data.splice(index, 1); // Eliminar el elemento del array
                localStorage.setItem('data', JSON.stringify(data)); // Actualizar almacenamiento si aplica
                actualizarTabla(); // Actualizar la tabla
            }
        }
    }

    // Función para crear el archivo Excel
    function crearExcel() {
        // Crear una copia de los datos y ordenarlos alfabéticamente por 'nombre'
        const datosOrdenados = [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Añadir la columna 'ORDEN'
        const datosConOrden = datosOrdenados.map((item, index) => ({
            ORDEN: index + 1,
            NOMBRE: item.nombre,
            AFILIADO: item.afiliado,
            IMPORTE: item.importe
        }));

        // Crear un nuevo workbook
        var workbook = XLSX.utils.book_new();

        // Crear una hoja de trabajo con las columnas deseadas
        var worksheet = XLSX.utils.json_to_sheet(datosConOrden, { header: ["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE"] });

        // Añadir encabezados personalizados (opcional)
        XLSX.utils.sheet_add_aoa(worksheet, [["ORDEN", "NOMBRE", "AFILIADO", "IMPORTE"]], { origin: "A1" });

        // Ajustar el orden de las columnas (opcional, ya que el header ya lo especifica)
        // También puedes agregar formatos si lo deseas

        // Añadir la hoja de trabajo al workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

        // Escribir el workbook a una cadena binaria
        var excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

        // Convertir la cadena binaria a un Blob
        var blob = new Blob([s2ab(excelBinary)], { type: "application/octet-stream" });

        // Crear un enlace para descargar el archivo
        var link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "datos.xlsx";
        link.click();
    }

    // Función para convertir una cadena a ArrayBuffer
    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i < s.length; i++) {
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
    }

    // Aplicar el tema guardado cuando la página carga
    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    } else {
        themeToggle.checked = false;
    }

    // Event listener para el interruptor de tema
    themeToggle.addEventListener('change', toggleTheme);
});