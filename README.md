# IASEP Farmacias

## **https://aolender1.github.io/IASEP-app/**

## Descripción

Este proyecto es una aplicación web diseñada para gestionar la carga de facturas de clientes y sus importes en la obra social de IASEP. Permite cargar una lista de clientes desde un archivo JSON, agregar importes asociados a cada cliente, visualizar los datos en una tabla interactiva y generar un archivo Excel con la información recopilada, para luego poder copiarla a su respectivo Excel. Además, incluye funcionalidades como autocompletado de nombres de clientes, eliminación de registros y cambio de tema entre modo claro y oscuro.

## Funcionalidades

- **Carga de Clientes desde JSON**: Permite cargar un archivo JSON con la lista de clientes para utilizarlos en el autocompletado.
- **Autocompletado de Clientes**: Al ingresar el nombre de un cliente, se muestran sugerencias basadas en los datos cargados.
- **Registro de Importes**: Posibilidad de ingresar importes asociados a cada cliente y agregarlos a una tabla de registros.
- **Eliminación de Registros**: Opciones para eliminar registros individuales de la tabla.
- **Generación de Excel**: Genera un archivo Excel con los datos ingresados para su posterior análisis o manejo.
- **Cambio de Tema**: Interruptor para alternar entre modo claro y oscuro, mejorando la experiencia de usuario según sus preferencias.

## Tecnologías Utilizadas

- **HTML5 y CSS3**: Estructura y estilos de la aplicación web.
- **JavaScript (ES6+)**: Lógica de la aplicación, manejo de eventos y manipulación del DOM.
- **XLSX.js**: Librería para generar archivos Excel desde el navegador.
- **Local Storage**: Para almacenar las preferencias de tema seleccionadas por el usuario.

## Cómo Funciona

La aplicación se compone de una interfaz sencilla donde el usuario puede:

1. **Subir un archivo JSON de clientes**:
   - Utiliza el botón **"Subir JSON"** para cargar un archivo que contenga la lista de clientes en formato JSON.
   - El archivo debe tener un formato similar al siguiente:
     ```json
     {
        "ID": "1",
        "NOMBRE": "NOMBRE DEL CLIENTE",
        "NUMERO": "NUMERO DE CLIENTE IASEP"
     }
     ```
     Una vez cargado, los nombres de los clientes estarán disponibles para el autocompletado.

2. **Ingresar datos de clientes e importes**:
   - En el campo **"CLIENTE"**, comienza a escribir el nombre del cliente y selecciona una de las sugerencias desplegadas.
   - En el campo **"IMPORTE"**, ingresa el importe correspondiente al cliente seleccionado.
   - Presiona el botón **"CARGAR"** o la tecla **Enter** para agregar el registro a la tabla.

3. **Visualizar y gestionar los registros**:
   - Los registros agregados aparecen en la tabla a la derecha.
   - Cada registro muestra el nombre del cliente, el importe y un botón para eliminarlo si es necesario.

4. **Generar un archivo Excel**:
   - Después de ingresar los registros deseados, presiona el botón **"Crear Excel"** para descargar un archivo `datos.xlsx` con la información recopilada.

5. **Cambiar el tema de la aplicación**:
   - Utiliza el interruptor en la esquina superior derecha para alternar entre el modo claro y oscuro.
   - La preferencia se guarda y se aplicará en futuras visitas.

## Instrucciones de Uso

Puedes usarlo directamente en el github pages:
## **https://aolender1.github.io/IASEP-app/**

1. **Descargar el Proyecto**:
   - Clona este repositorio o descarga los archivos directamente.

2. **Abrir la Aplicación**:
   - Abre el archivo `index.html` en tu navegador web preferido.

3. **Cargar Clientes**:
   - Haz clic en el botón **"Subir JSON"** y selecciona tu archivo de clientes en formato JSON.

4. **Agregar Registros**:
   - Ingresa el nombre del cliente en el campo **"CLIENTE"** y selecciona de las sugerencias.
   - Ingresa el importe correspondiente en el campo **"IMPORTE"**.
   - Haz clic en **"CARGAR"** para agregarlo a la tabla.

5. **Generar Excel**:
   - Cuando hayas terminado de ingresar los registros, haz clic en **"Crear Excel"** para descargar el archivo con los datos.

6. **Uso del Tema Oscuro**:
   - Para activar o desactivar el modo oscuro, utiliza el interruptor ubicado en la esquina superior derecha.

## Requisitos

- **Navegador Web Moderno**: Se recomienda utilizar la última versión de navegadores como Chrome, Firefox, Edge o Safari para una mejor experiencia y compatibilidad.

## Estructura del Proyecto

- `index.html`: Archivo principal que contiene la estructura de la página web.
- `styles.css`: Hojas de estilo CSS para el diseño y la apariencia de la aplicación.
- `script.js`: Archivo JavaScript que maneja la lógica y el comportamiento de la aplicación.
- `assets/`: Carpeta que contiene íconos y recursos adicionales, como el favicon y las imágenes utilizadas.
  - `favicon.ico`: Ícono de la página.
  - `delete-icon.svg`: Ícono utilizado para el botón de eliminar registros.

## Detalles Técnicos

- **Autocompletado de Clientes**:
  - Al escribir en el campo de **"CLIENTE"**, se filtran y muestran sugerencias basadas en el nombre ingresado.
  - Utiliza eventos de teclado para navegar y seleccionar las sugerencias con las teclas **ArrowUp**, **ArrowDown** y **Enter**.

- **Manejo de Importes**:
  - El campo de **"IMPORTE"** admite números y realiza validaciones para asegurar que el importe ingresado sea válido antes de agregarlo.

- **Generación de Excel**:
  - La función utiliza la librería `XLSX.js` para convertir los datos almacenados en un archivo Excel y lo descarga automáticamente.

- **Almacenamiento de Datos**:
  - Los registros se mantienen en un arreglo en memoria durante la sesión.
  - La preferencia del tema (claro u oscuro) se almacena en el `localStorage` para persistencia entre sesiones.

- **Interfaz Responsive**:
  - La aplicación está diseñada para adaptarse a diferentes tamaños de pantalla mediante el uso de media queries en CSS.

## Consideraciones

- **Formato del Archivo JSON**:
  - Asegúrate de que el archivo JSON de clientes tenga el formato correcto para evitar errores.

- **Seguridad**:
  - Esta aplicación está diseñada para entornos controlados. Si se va a desplegar en producción, considera implementar validaciones y medidas de seguridad adicionales.

## Créditos

Este proyecto fue desarrollado por **[aolender1](https://github.com/aolender1)** para mejorar la gestión de facturas de clientes e importes en la obra social de IASEP, proporcionando una herramienta sencilla y eficiente para el registro y generación de reportes.

## Licencia
Este proyecto se distribuye bajo la licencia MIT. Puedes usarlo y modificarlo libremente siempre que mantengas la atribución adecuada.
