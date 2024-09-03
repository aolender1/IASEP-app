document.addEventListener("DOMContentLoaded", function() {
    const clienteInput = document.getElementById('cliente');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const clientesList = document.getElementById('clientes-list');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirJSONButton = document.getElementById('subirJSON');
    const fileInput = document.getElementById('fileInput');

    const data = []; // Array para almacenar los datos ingresados

    // Cargar clientes del archivo JSON
    function cargarClientesDesdeJSON(clientes) {
        console.log("Iniciando carga de clientes:", clientes);
        // Limpiar opciones existentes
        clientesList.innerHTML = '';
        // Crear lista de opciones para el autocompletado
        clientes.forEach(cliente => {
            console.log("Procesando cliente:", cliente);
            const option = document.createElement('option');
            option.value = cliente.NOMBRE;
            clientesList.appendChild(option);
        });
        console.log("Carga de clientes completada");
    }

    // Autocompletar el input de cliente
    clienteInput.addEventListener('input', function() {
        const inputValue = this.value.toLowerCase();
        const options = clientesList.childNodes;
        options.forEach(option => {
            if (inputValue.length > 0 && option.value.toLowerCase().includes(inputValue)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    });

    // Evento keypress para el input de cliente (al presionar Enter)
    clienteInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar que se envíe el formulario (si lo hubiera)
            
            const inputValue = this.value.toLowerCase();
            const options = clientesList.childNodes;
            let found = false;
            
            options.forEach(option => {
                if (!found && inputValue.length > 0 && option.value.toLowerCase().includes(inputValue)) {
                    this.value = option.value;
                    found = true;
                }
            });

            // Si se encontró un nombre, mover el foco al siguiente campo de entrada (importe)
            if (found) {
                importeInput.focus();
            } else {
                // Si no se encontró un nombre, mostrar un mensaje de error o tomar alguna otra acción
                alert('No se encontró ningún nombre coincidente en la lista.');
            }
        }
    });

    // Evento keypress para el input de "importe" (al presionar Enter)
    importeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar que se envíe el formulario (si lo hubiera)
            guardarDatos();
        }
    });

    // Evento click del botón "CARGAR"
    cargarButton.addEventListener('click', guardarDatos);

    // Evento click del botón "Crear Excel"
    crearExcelButton.addEventListener('click', function() {
        if (data.length === 0) {
            alert('No hay datos para crear el Excel.');
            return;
        }
        crearExcel();
    });

    // Evento click del botón "Subir JSON"
    subirJSONButton.addEventListener('click', function() {
        fileInput.click(); // Abrir el cuadro de diálogo para seleccionar un archivo JSON
    });

    // Evento change del input de tipo file
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
        const nombre = clienteInput.value;
        const importe = parseFloat(importeInput.value.replace('$', '').replace(',', '')); // Convertir a float
        if (nombre && !isNaN(importe)) {
            data.push({ nombre, importe });
            console.log('Datos guardados:', data);
            actualizarTabla();
            // Limpiar los inputs después de guardar
            clienteInput.value = '';
            importeInput.value = '';
            // Enfocar nuevamente el campo del nombre
            clienteInput.focus();
        } else {
            alert('Por favor ingrese un nombre y un importe válido.');
        }
    }

    function actualizarTabla() {
        const tablaBody = document.getElementById('tabla-body');
        tablaBody.innerHTML = ''; // Limpiar la tabla
    
        // Recorrer el array data desde el último elemento hasta el primero
        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];
            const row = tablaBody.insertRow();
            const cellNombre = row.insertCell(0);
            const cellImporte = row.insertCell(1);
            
            cellNombre.textContent = item.nombre;
            cellImporte.textContent = '$' + item.importe.toFixed(2);
        }
    }

    // Función para crear el archivo Excel
    function crearExcel() {
        // Crear un libro de Excel
        var workbook = XLSX.utils.book_new();
        
        // Crear una hoja
        var worksheet = XLSX.utils.json_to_sheet(data);

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

        // Convertir el libro a un archivo binario
        var excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

        // Convertir el binario a Blob
        var blob = new Blob([s2ab(excelBinary)], { type: "application/octet-stream" });

        // Crear un enlace para descargar el archivo
        var link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "datos.xlsx";
        link.click();
    }

    // Función para convertir texto en array buffer
    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    }
});

// Función para cambiar el tema
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');
    
    // Guardar la preferencia del usuario
    const isDarkTheme = body.classList.contains('dark-theme');
    localStorage.setItem('darkTheme', isDarkTheme);
    
    // Cambiar el texto del botón
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = isDarkTheme ? 'Tema Claro' : 'Tema Oscuro';
}

// Aplicar el tema guardado al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
    }
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = isDarkTheme ? 'Tema Claro' : 'Tema Oscuro';
    themeToggle.addEventListener('click', toggleTheme);
});