document.addEventListener("DOMContentLoaded", function() {
    const clienteInput = document.getElementById('cliente');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const importeInput = document.getElementById('importe');
    const cargarButton = document.getElementById('cargar');
    const crearExcelButton = document.getElementById('crearExcel');
    const subirJSONButton = document.getElementById('subirJSON');
    const fileInput = document.getElementById('fileInput');

    const data = []; // Array to store entered data
    let clientes = []; // Global array to store client data
    let currentIndex = -1;

    // Function to load clients from JSON and update the global 'clientes' array
    function cargarClientesDesdeJSON(clientesData) {
        console.log("Iniciando carga de clientes:", clientesData);
        clientes = clientesData; // Update the global clientes array
        console.log("Carga de clientes completada:", clientes);
    }

    // Function to show suggestions
    function showSuggestions(value) {
        suggestionsContainer.innerHTML = ''; // Clear previous suggestions
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
                // Move focus to the next input
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

    // Event listener for input changes in 'clienteInput'
clienteInput.addEventListener('input', function() {
    const value = this.value;
    currentIndex = -1; // Reset the current index on input change
    if (value) {
        showSuggestions(value);
    } else {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }
});


    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!suggestionsContainer.contains(e.target) && e.target !== clienteInput) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });

// Event listener for keydown in cliente input
clienteInput.addEventListener('keydown', function(event) {
    const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

    if (event.key === 'ArrowDown') {
        event.preventDefault(); // Prevent default scrolling
        currentIndex = (currentIndex + 1) % suggestions.length; // Move down the list
        highlightSuggestion(suggestions);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault(); // Prevent default scrolling
        currentIndex = (currentIndex - 1 + suggestions.length) % suggestions.length; // Move up the list
        highlightSuggestion(suggestions);
    } else if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        if (currentIndex >= 0 && currentIndex < suggestions.length) {
            // Select the highlighted suggestion
            clienteInput.value = suggestions[currentIndex].textContent; // Set input value to selected suggestion
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            importeInput.focus(); // Move focus to importe input
        } else {
            // If no suggestion is highlighted, select the first matching client
            const inputValue = clienteInput.value.toLowerCase();
            const filteredClientes = clientes.filter(cliente =>
                cliente.NOMBRE.toLowerCase().includes(inputValue)
            );

            if (filteredClientes.length > 0) {
                clienteInput.value = filteredClientes[0].NOMBRE; // Autocomplete to the first matching client
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                importeInput.focus(); // Move focus to importe input
            }
        }
    }
});

    // Event listener for 'Enter' key in cliente input
clienteInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission

        const inputValue = clienteInput.value.toLowerCase();
        const filteredClientes = clientes.filter(cliente =>
            cliente.NOMBRE.toLowerCase().includes(inputValue)
        );

        if (filteredClientes.length > 0) {
            // Autocomplete to the first matching client
            clienteInput.value = filteredClientes[0].NOMBRE;
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            importeInput.focus(); // Move focus to importe input
        } else {
            // No matching clients found
            alert('No se encontró ningún nombre coincidente en la lista.');
        }
    }
});

// Function to highlight the current suggestion
function highlightSuggestion(suggestions) {
    suggestions.forEach((suggestion, index) => {
        suggestion.classList.remove('highlighted'); // Remove highlight from all suggestions
        if (index === currentIndex) {
            suggestion.classList.add('highlighted'); // Add highlight to the current suggestion
        }
    });
}

    // Event listener for 'Enter' key in 'importeInput'
    importeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if any
            guardarDatos();
        }
    });

    // Event listener for 'CARGAR' button
    cargarButton.addEventListener('click', guardarDatos);

    // Event listener for 'Crear EXCEL' button
    crearExcelButton.addEventListener('click', function() {
        if (data.length === 0) {
            alert('No hay datos para crear el Excel.');
            return;
        }
        crearExcel();
    });

    // Event listener for 'Subir JSON' button
    subirJSONButton.addEventListener('click', function() {
        fileInput.click(); // Open the file dialog to select a JSON file
    });

    // Event listener for file input change
    fileInput.addEventListener('change', function(event) {
        console.log("Archivo seleccionado");
        const file = event.target.files[0]; // Get the first selected file
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log("Archivo leído");
            const contenido = e.target.result;
            try {
                console.log("Contenido del archivo:", contenido);
                const json = JSON.parse(contenido);
                console.log("JSON parseado:", json);
                cargarClientesDesdeJSON(json); // Process the JSON
                alert('JSON cargado correctamente.');
            } catch (error) {
                console.error("Error al procesar JSON:", error);
                alert('Error al cargar el archivo JSON.');
            }
        };
        reader.readAsText(file); // Read the file content as text
    });

    // Function to save entered data
    function guardarDatos() {
        const nombre = clienteInput.value;
        const importe = parseFloat(importeInput.value.replace('$', '').replace(',', '')); // Convert to float
        console.log('Nombre:', nombre, 'Importe:', importe);
        if (nombre && !isNaN(importe)) {
            data.push({ nombre, importe });
            console.log('Datos guardados:', data);
            actualizarTabla();
            // Clear inputs after saving
            clienteInput.value = '';
            importeInput.value = '';
            // Focus the 'cliente' input again
            clienteInput.focus();
        } else {
            console.log('Validación fallida');
            alert('Por favor ingrese un nombre y un importe válido.');
        }
    }

    // Function to update the table with data
    function actualizarTabla() {
        const tablaBody = document.getElementById('tabla-body');
        tablaBody.innerHTML = ''; // Clear the table

        // Iterate over 'data' array from last to first element
        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];
            const row = tablaBody.insertRow();
            const cellNombre = row.insertCell(0);
            const cellImporte = row.insertCell(1);

            cellNombre.textContent = item.nombre;
            cellImporte.textContent = '$' + item.importe.toFixed(2);
        }
    }

    // Function to create the Excel file
    function crearExcel() {
        // Create a new workbook
        var workbook = XLSX.utils.book_new();

        // Create a worksheet
        var worksheet = XLSX.utils.json_to_sheet(data);

        // Append the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

        // Write the workbook to a binary string
        var excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

        // Convert the binary string to a Blob
        var blob = new Blob([s2ab(excelBinary)], { type: "application/octet-stream" });

        // Create a link to download the file
        var link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "datos.xlsx";
        link.click();
    }

    // Function to convert string to array buffer
    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    }

    // Function to toggle the theme
    function toggleTheme() {
        const body = document.body;
        body.classList.toggle('dark-theme');

        // Save the user's preference
        const isDarkTheme = body.classList.contains('dark-theme');
        localStorage.setItem('darkTheme', isDarkTheme);

        // Change the button text
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = isDarkTheme ? 'Tema Claro' : 'Tema Oscuro';
    }

    // Apply the saved theme when the page loads
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);

    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = 'Tema Claro';
    } else {
        themeToggle.textContent = 'Tema Oscuro';
    }
});