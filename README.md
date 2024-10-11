# IASEP Farmacias

## **[https://aolender1.github.io/IASEP-app/](https://aolender1.github.io/IASEP-app/)**

## **Descripción**

Este proyecto es una aplicación web diseñada para gestionar la carga de facturas de clientes y sus importes en la obra social de IASEP. Permite cargar una lista de clientes desde un archivo Excel, agregar importes asociados a cada cliente, visualizar los datos en una tabla interactiva y generar un archivo Excel con la información recopilada para su posterior análisis. Además, incluye funcionalidades como autocompletado de nombres de clientes, eliminación de registros, cambio de tema entre modo claro y oscuro, y la posibilidad de agregar clientes manualmente directamente desde la aplicación.

## **Funcionalidades**

- **Carga de Clientes desde Excel**: Permite cargar un archivo Excel con la lista de clientes desde la hoja "base-de-datos", facilitando la gestión y actualización continua de la base de datos sin necesidad de convertir archivos a JSON.
- **Autocompletado de Clientes**: Al ingresar el nombre de un cliente, se muestran sugerencias basadas en los datos cargados desde el archivo Excel.
- **Registro de Importes**: Posibilidad de ingresar importes asociados a cada cliente y agregarlos a una tabla de registros.
- **Eliminación de Registros**: Opciones para eliminar registros individuales de la tabla.
- **Generación de Excel**: Genera un archivo Excel con múltiples hojas que incluyen los datos ingresados y la base de datos actualizada, facilitando su integración y análisis posterior.
- **Agregar Clientes Manualmente**: Permite añadir nuevos clientes directamente desde la aplicación a través de un formulario intuitivo.
- **Cambio de Tema**: Interruptor para alternar entre modo claro y oscuro, mejorando la experiencia de usuario según sus preferencias.

## **Tecnologías Utilizadas**

- **HTML5 y CSS3**: Estructura y estilos de la aplicación web.
- **JavaScript (ES6+)**: Lógica de la aplicación, manejo de eventos y manipulación del DOM.
- **XLSX.js**: Librería para manejar y generar archivos Excel desde el navegador.
- **Local Storage**: Para almacenar las preferencias de tema seleccionadas por el usuario.

## **Cómo Funciona**

La aplicación se compone de una interfaz sencilla donde el usuario puede:

1. **Subir un archivo Excel de clientes**:
   - Utiliza el botón **"Subir Datos en Excel"** para cargar un archivo `datos.xlsx` que contenga la hoja "base-de-datos" con la lista de clientes.
   - La hoja "base-de-datos" debe tener el siguiente formato:

excel
| ID | NOMBRE           | NUMERO         |
|----|------------------|----------------|
| 1  | JUAN PEREZ       | 3-12345678-00  |
| 2  | DIEGO GOMEZ      | 3-14825472-00  |
| ...| ...              | ...            |

   - Una vez cargado, los nombres de los clientes estarán disponibles para el autocompletado en el formulario principal.

2. **Ingresar datos de clientes e importes**:
   - En el campo **"CLIENTE"**, comienza a escribir el nombre del cliente y selecciona una de las sugerencias desplegadas.
   - En el campo **"IMPORTE"**, ingresa el importe correspondiente al cliente seleccionado.
   - Presiona el botón **"CARGAR"** o la tecla **Enter** para agregar el registro a la tabla.

3. **Agregar Clientes Manualmente**:
   - Haz clic en el botón **"Agregar Clientes Manualmente"** para abrir un formulario modal.
   - Completa los campos **Cliente**, **Afiliado** e **Importe**.
   - Haz clic en **"Cargar"** para agregar el nuevo cliente a la tabla y a la lista de nuevos clientes.
   - El modal permanecerá abierto, permitiendo agregar múltiples clientes sin necesidad de cerrarlo manualmente.

4. **Visualizar y Gestionar los Registros**:
   - Los registros agregados aparecen en la tabla a la derecha, mostrando el nombre del cliente, el importe y un botón para eliminarlo si es necesario.

5. **Generar un archivo Excel**:
   - Después de ingresar los registros y/o agregar nuevos clientes manualmente, presiona el botón **"Crear Excel"** para descargar un archivo `datos.xlsx` que contiene:
     - **base-de-datos**: Hoja combinada con todos los clientes (antiguos y nuevos), ordenados alfabéticamente y re-numerados con IDs secuenciales.
     - **Datos**: Hoja con las entradas ingresadas a través de los formularios, incluyendo las columnas **ORDEN**, **NOMBRE**, **AFILIADO** e **IMPORTE**.
     - **Nuevos Clientes**: Hoja con la lista de clientes agregados manualmente, facilitando su inclusión futura en la base de datos original.

6. **Cambiar el tema de la aplicación**:
   - Utiliza el interruptor en la esquina superior derecha para alternar entre el modo claro y oscuro.
   - La preferencia se guarda y se aplicará en futuras visitas.

## **Instrucciones de Uso**

Puedes usarla directamente en GitHub Pages:

### **[https://aolender1.github.io/IASEP-app/](https://aolender1.github.io/IASEP-app/)**

1. **Descargar el Proyecto**:
   - Clona este repositorio o descarga los archivos directamente.

2. **Preparar el Archivo `datos.xlsx`**:
   - Abre Excel y crea un nuevo libro.
   - Añade una hoja llamada "base-de-datos".
   - Añade las columnas **ID**, **NOMBRE** y **NUMERO** en las celdas A1, B1 y C1 respectivamente.
   - Rellena los datos existentes de tus clientes en las filas siguientes, asegurándote de que los nombres están correctamente escritos y los números de afiliado son precisos.
   - Guarda el archivo como `datos.xlsx` para usarlo con la aplicación.

3. **Abrir la Aplicación**:
   - Abre el archivo `index.html` en tu navegador web preferido o accede al enlace de GitHub Pages proporcionado.

4. **Cargar Clientes**:
   - Haz clic en el botón **"Subir Datos en Excel"** y selecciona tu archivo `datos.xlsx` con la hoja "base-de-datos".

5. **Agregar Registros**:
   - Ingresa el nombre del cliente en el campo **"CLIENTE"** y selecciona de las sugerencias.
   - Ingresa el importe correspondiente en el campo **"IMPORTE"**.
   - Haz clic en **"CARGAR"** para agregarlo a la tabla.

6. **Agregar Clientes Manualmente**:
   - Haz clic en **"Agregar Clientes Manualmente"** para abrir el formulario modal.
   - Completa los campos **Cliente**, **Afiliado** e **Importe**.
   - Haz clic en **"Cargar"** para añadir el nuevo cliente a la tabla.
   - Repite el proceso para agregar más clientes; el modal permanecerá abierto para facilitar múltiples adiciones.
   - Cierra el modal haciendo clic en la "X" cuando hayas terminado.

7. **Generar Excel**:
   - Haz clic en **"Crear Excel"** para descargar el archivo `datos.xlsx` actualizado con las hojas **base-de-datos**, **Datos** y **Nuevos Clientes**.

8. **Usar el Tema Oscuro**:
   - Para activar o desactivar el modo oscuro, utiliza el interruptor ubicado en la esquina superior derecha.
   - La preferencia se guarda y se aplicará en futuras visitas.

## **Requisitos**

- **Navegador Web Moderno**: Se recomienda utilizar la última versión de navegadores como Chrome, Firefox, Edge o Safari para una mejor experiencia y compatibilidad.

## **Estructura del Proyecto**

- `index.html`: Archivo principal que contiene la estructura de la página web.
- `styles.css`: Hojas de estilo CSS para el diseño y la apariencia de la aplicación.
- `script.js`: Archivo JavaScript que maneja la lógica y el comportamiento de la aplicación.
- `assets/`: Carpeta que contiene íconos y recursos adicionales, como el favicon y las imágenes utilizadas.
  - `favicon.ico`: Ícono de la página.
  - `delete-icon.svg`: Ícono utilizado para el botón de eliminar registros.

## **Detalles Técnicos**

- **Carga de Datos desde Excel**:
  - Utiliza la librería `XLSX.js` para leer y procesar datos desde archivos Excel directamente en el navegador.
  - La hoja "base-de-datos" debe tener las columnas **ID**, **NOMBRE** y **NUMERO** para que la aplicación pueda manejar correctamente los datos.

- **Autocompletado de Clientes**:
  - Al escribir en el campo de **"CLIENTE"**, se filtran y muestran sugerencias basadas en el nombre ingresado desde la hoja "base-de-datos".
  - Utiliza eventos de teclado para navegar y seleccionar las sugerencias con las teclas **ArrowUp**, **ArrowDown** y **Enter**.

- **Manejo de Importes**:
  - El campo de **"IMPORTE"** admite números y realiza validaciones para asegurar que el importe ingresado sea válido antes de agregarlo.

- **Generación de Excel**:
  - La función `crearExcel()` utiliza `XLSX.js` para combinar los datos de la base de datos con los nuevos registros y los clientes agregados manualmente, creando un archivo Excel estructurado en múltiples hojas.
  - **base-de-datos**: Contiene todos los clientes, antiguos y nuevos, con IDs re-numerados y ordenados alfabéticamente.
  - **Datos**: Contiene las entradas registradas con las columnas **ORDEN**, **NOMBRE**, **AFILIADO** e **IMPORTE**.
  - **Nuevos Clientes**: Lista de clientes agregados manualmente para su futura incorporación a la base de datos original.

- **Almacenamiento de Preferencias de Tema**:
  - La preferencia del usuario sobre el tema (claro u oscuro) se almacena en el `localStorage`, permitiendo que se mantenga entre sesiones.

- **Interfaz Responsive**:
  - La aplicación está diseñada para adaptarse a diferentes tamaños de pantalla mediante el uso de media queries en CSS, ofreciendo una experiencia óptima tanto en escritorio como en dispositivos móviles.

## **Consideraciones**

- **Formato del Archivo Excel**:
  - Asegúrate de que la hoja "base-de-datos" en el archivo `datos.xlsx` contenga las columnas **ID**, **NOMBRE** y **NUMERO**. Un formato incorrecto puede causar errores al cargar los datos.
  
- **Actualización de la Base de Datos**:
  - Cada vez que agregues nuevos clientes manualmente y generes un Excel, la hoja "base-de-datos" se actualizará automáticamente con los nuevos clientes, re-numerando los IDs y ordenando alfabéticamente.

- **Seguridad**:
  - Esta aplicación está diseñada para entornos controlados. Si se va a desplegar en producción, considera implementar validaciones y medidas de seguridad adicionales para manejar adecuadamente los archivos cargados y evitar posibles vulnerabilidades.

## **Créditos**

Este proyecto fue desarrollado por **[aolender1](https://github.com/aolender1)** para mejorar la gestión de facturas de clientes e importes en la obra social de IASEP, proporcionando una herramienta sencilla y eficiente para el registro y generación de reportes.

## **Licencia**

Este proyecto se distribuye bajo la licencia MIT. Puedes usarlo y modificarlo libremente siempre que mantengas la atribución adecuada.
