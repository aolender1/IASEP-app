document.addEventListener("DOMContentLoaded", function() {
    const clienteInput = document.getElementById('cliente');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirDatosExcelButton = document.getElementById('subirDatosExcel'); // Nuevo botón
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle'); // Interruptor de tema
    const mostrarNumeroCliente = document.getElementById('mostrar-numero-cliente');

    const data = []; // Array para almacenar los datos ingresados (Deposito)
    let baseDatos = []; // Array para almacenar los datos de la base de datos
    let nuevosClientes = []; // Array para almacenar clientes agregados manualmente
    let currentIndex = -1;

    // Obtener elementos del modal
    const modalManual = document.getElementById('modalManual');
    const agregarManualButton = document.getElementById('agregarManual');
    const spanCerrar = document.getElementsByClassName('close')[0];
    const formManual = document.getElementById('formManual');

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
                    alert('No se encontró ningún nombre coincidente en la lista.');
                    mostrarNumeroCliente.textContent = '';
                    mostrarNumeroCliente.classList.remove('visible');
                }
            }
        }
    });

    // Event listener para la tecla 'Enter' en el input 'clienteInput'
    clienteInput.addEventListener('keypress', function(event) {
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
    document.addEventListener('click', function(e) {
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
    importeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir envío del formulario si lo hubiera
            guardarDatos();
        }
    });

    // Event listener para el botón 'CARGAR'
    cargarButton.addEventListener('click', guardarDatos);

    // Event listener para el botón 'Crear Excel'
    crearExcelButton.addEventListener('click', function() {
        if (data.length === 0) {
            alert('No hay datos para crear el Excel.');
            return;
        }
        crearExcel();
    });

    // Event listener para el botón 'Subir Datos en Excel'
    subirDatosExcelButton.addEventListener('click', function() {
        fileInput.click(); // Abrir el diálogo de selección de archivo Excel
    });

    // Event listener para el botón 'Agregar Clientes Manualmente'
    agregarManualButton.addEventListener('click', function() {
        modalManual.style.display = 'block';
        formManual.reset(); // Resetear el formulario
    });

    // Event listener para el cierre del modal (cuando se hace clic en la x o fuera del modal)
    spanCerrar.addEventListener('click', function() {
        modalManual.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target == modalManual) {
            modalManual.style.display = 'none';
        }
    });

    // Event listener para el cambio en el input de archivo
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0]; // Obtener el primer archivo seleccionado
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Obtener la hoja "base-de-datos"
                const sheetName = "base-de-datos";
                if (!workbook.Sheets[sheetName]) {
                    alert(`La hoja "${sheetName}" no fue encontrada en el archivo Excel.`);
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // Verificar que las columnas existen
                if (!jsonData.length || !jsonData[0].ID || !jsonData[0].NOMBRE || !jsonData[0].NUMERO) {
                    alert(`La hoja "${sheetName}" debe contener las columnas ID, NOMBRE y NUMERO.`);
                    return;
                }

                cargarClientesDesdeExcel(jsonData);
                alert('Datos cargados correctamente desde Excel.');
            };
            reader.readAsArrayBuffer(file); // Leer el contenido del archivo como ArrayBuffer
        }
    });

    // Función para guardar los datos ingresados desde el formulario principal
    function guardarDatos() {
        const nombre = clienteInput.value.trim();
        const importe = parseFloat(importeInput.value.replace('$', '').replace(',', '')); // Convertir a float

        if (!nombre) {
            alert('Por favor ingrese un nombre válido.');
            return;
        }

        // Buscar el número de afiliado correspondiente al nombre
        const clienteEncontrado = baseDatos.find(cliente => cliente.NOMBRE.toLowerCase() === nombre.toLowerCase());
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

    // Función para guardar los datos ingresados desde el formulario manual  
formManual.addEventListener('submit', function(event) {  
    event.preventDefault(); // Prevenir el envío por defecto  
    
    const nombreManual = document.getElementById('clienteManual').value.trim();  
    const afiliadoManual = document.getElementById('afiliadoManual').value.trim();  
    const importeManual = parseFloat(document.getElementById('importeManual').value.replace('$', '').replace(',', ''));  
    
    // Validación de los campos  
    if (!nombreManual || !afiliadoManual || isNaN(importeManual)) {  
      alert('Por favor, complete todos los campos correctamente.');  
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
    tablaBody.innerHTML = ''; // Limpiar la tabla
  
    // Calcular el total de importes y actualizar el mensaje de total a cobrar
    let totalImporte = data.reduce((sum, item) => sum + item.importe, 0);
    let totalCobrar = totalImporte * 0.125;
    document.getElementById('totalAmount').textContent = `Importe total a cobrar: $${totalCobrar.toFixed(2)}`;
  
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
  
      // Crear la etiqueta <img> para el SVG del botón
      const imgEliminar = document.createElement('img');
      imgEliminar.src = 'assets/delete-icon.svg'; // Ruta al archivo SVG
      imgEliminar.alt = 'Eliminar';
      imgEliminar.classList.add('icon-eliminar');
  
      btnEliminar.appendChild(imgEliminar);
  
      // Establecer el evento para eliminar la factura
      btnEliminar.addEventListener('click', function() {
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

        // Crear un nuevo workbook y agregar las hojas
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, hojaBaseDatos, "base-de-datos");
        XLSX.utils.book_append_sheet(workbook, hojaDatos, "Datos");
        if (hojaNuevosClientes) {
            XLSX.utils.book_append_sheet(workbook, hojaNuevosClientes, "Nuevos Clientes");
        }

        // Escribir el workbook a una cadena binaria
        const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

        // Convertir la cadena binaria a un Blob
        const blob = new Blob([s2ab(excelBinary)], { type: "application/octet-stream" });

        // Crear un enlace para descargar el archivo
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "datos.xlsx";
        link.click();
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