# 🏥 IASEP Farmacias — Sistema de Gestión y Carga de Comprobantes con IA & PWA

[![Demo Live](https://img.shields.io/badge/Demo-Online-brightgreen?style=for-the-badge&logo=github)](https://aolender1.github.io/IASEP-app/)
[![Database](https://img.shields.io/badge/Database-NeonDB_PostgreSQL-00e5a3?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![AI Vision](https://img.shields.io/badge/AI_Vision-Google_Gemini_Flash--Lite-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet?style=for-the-badge&logo=pwa)](https://aolender1.github.io/IASEP-app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE.md)

Aplicación web progresiva (**PWA**) profesional y moderna para la gestión, digitalización de recetas, registro de comprobantes y liquidación de la obra social **IASEP** (Instituto de Asistencia Social para el Empleado Público). 

Diseñada para funcionar tanto en computadoras de escritorio como en teléfonos móviles desde el mostrador de la farmacia, integrando **visión artificial con Google Gemini**, auto-escaneo de QR de AFIP/ARCA, dictado por voz, sincronización multi-dispositivo en la nube con **Neon PostgreSQL (Serverless)** y generación automática de reportes oficiales en **Excel y PDF**.

---

## 🚀 **Acceso Demo Público**

Puedes probar la aplicación en vivo sin necesidad de registro previo utilizando la siguiente **cuenta demo pública** (contiene exclusivamente datos de muestra imaginarios para evaluación):

| Parámetro | Credenciales & Datos Demo |
| :--- | :--- |
| 🌐 **URL de la App** | [https://aolender1.github.io/IASEP-app/](https://aolender1.github.io/IASEP-app/) |
| 📧 **Correo Electrónico** | `demo@farmacia.com` |
| 🔑 **Contraseña** | `demo123456` |
| 🏥 **Nombre Farmacia** | `FARMACIA DEMO - DE PRUEBA IASEP` |
| 📍 **Ubicación** | `(Formosa - Capital) Cel: 3704000000` |

---

## 📥 **Archivo Excel de Ejemplo para Pruebas**

Para probar la importación de clientes y la función de autocompletado y dictado de inmediato, puedes descargar el archivo de datos de prueba con nombres y afiliados ficticios:

👉 **[Descargar datos_demo.xlsx](https://github.com/aolender1/IASEP-app/raw/main/datos_demo.xlsx)** *(incluido en este repositorio)*

### **Estructura requerida (`base-de-datos`):**
El archivo contiene la hoja requerida **`base-de-datos`** con el formato exacto que interpreta la aplicación:

| ID | NOMBRE | NUMERO |
| :-: | :--- | :--- |
| 1 | PEREZ, JUAN CARLOS | 3-12345678-00 |
| 2 | GOMEZ, DIEGO HERNAN | 3-14825472-00 |
| 3 | GONZALEZ, MARIA ELENA | 3-20493817-00 |
| 4 | FERNANDEZ, LUCAS GABRIEL | 3-31582940-00 |
| ... | ... | ... |

---

## ✨ **Características y Funcionalidades Destacadas**

### 🤖 **1. Escáner Inteligente Asistido por IA (Google Gemini Flash-Lite)**
* **Flujo Guiado de 3 Pasos con Mínimo Consumo de API:**
  1. **Paso 1 (Receta):** Captura fotográfica o subida del Recetario Oficial IASEP.
  2. **Paso 2 (Ticket):** Captura fotográfica del Ticket fiscal o ingreso manual rápido del importe.
  3. **Llamada Unificada (1 Sola Petición):** Si se toman ambas fotos, el sistema las analiza en conjunto en **una sola llamada multimodal a Gemini Flash-Lite**, reduciendo costos de API al 50% y duplicando la velocidad.
* **Extracción Automática:**
  * Apellido y Nombre del afiliado (depurado sin puntos ni símbolos).
  * Número de carnet estandarizado (`D-DDDDDDDD-DD`).
  * Troqueles y medicamentos prescritos y facturados.
  * Importe total a abonar en el ticket.
* **Confirmación Inmediata con 1 Clic:** Botón *"Guardar y siguiente receta"* para carga continua en mostrador sin tocar el teclado.

### 📱 **2. PWA Multi-Dispositivo (Instalable en Móviles Android & iOS)**
* **Instalable como App Nativa:** Soporte PWA con Web App Manifest y Service Worker offline.
* **Identificador de Celular / Operador:** Asigna un nombre a cada dispositivo (ej. *"Celular Mostrador 1"*, *"Celular Mostrador 2"*) para auditoría de qué empleado cargó cada receta.

### 💳 **3. Estandarización Universal de Carnets IASEP (`D-DDDDDDDD-DD`)**
* Formateo automático de cualquier número ingresado:
  * Entradas de 11 dígitos continuos (ej. `31843787700`) $\rightarrow$ `3-18437877-00`.
  * DNIs de 7 dígitos con sufijo (ej. `1823028600`) $\rightarrow$ `1-08230286-00`.
* **Autocompletado Bidireccional:**
  * Al escribir o detectar el **Carnet**, autocompleta el **Nombre**.
  * Al escribir o dictar el **Nombre**, autocompleta el **Carnet**.
* Comparador tolerante a acentos y variaciones menores de OCR para evitar falsos positivos de *"Nuevo Afiliado"*.

### 📦 **4. Gestión de Lotes y Períodos Mensuales**
* Organización de recetas por Lote (ej. *"Octubre 2026"*).
* Creación rápida de nuevos lotes con el botón `+`.
* **Eliminación Segura de Lotes:** Botón con papelera `🗑️` y modal de confirmación con borrado en cascada (`ON DELETE CASCADE`) en la base de datos PostgreSQL.

### 🎙️ **5. Dictado por Voz Manos Libres (`es-AR`)**
* Dictado independiente para **Nombre** y **Número de Afiliado** mediante Web Speech API.
* Detección fonética de números orales (ej: *"tres dieciocho cuatrocientos..."* se transcribe automáticamente como carnet).

### ☁️ **6. Base de Datos Cloud y Sincronización en Tiempo Real (Neon DB)**
* Almacenamiento seguro en la nube con **Neon PostgreSQL Serverless**.
* Autenticación JWT mediante **Neon Auth**.
* Padrón sincronizado en caché local (`localStorage`) para búsqueda instantánea en milisegundos sin latencia.
* Sincronización limpia al importar Excel: reemplazo automático para reflejar bajas y eliminaciones del padrón.

### 📊 **7. Liquidación Automática y Reportes (Excel & PDF)**
* Cálculo en tiempo real del desglose de liquidación IASEP:
  * **A cargo del Afiliado (75%)**
  * **A cargo de la Farmacia (5%)**
  * **A cargo de la Obra Social (20%)**
* **Exportación a Excel (`.xlsx`):** Multi-hoja con estructura oficial (`base-de-datos`, `Datos`, `Nuevos Clientes`).
* **Exportación a PDF:** Documento formateado listo para firma y presentación.
* **Modo Claro / Oscuro:** Selector de tema visual con persistencia automática.

---

## 🛠️ **Tecnologías Utilizadas**

* **Frontend:** HTML5 Semántico, CSS3 Moderno (Vanilla CSS con Custom Properties), JavaScript Moderno (ES6+ Asíncrono).
* **PWA:** Web App Manifest, Service Worker v3.2, Cache API.
* **Inteligencia Artificial:** Google Gemini API (modelos `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite`).
* **Backend & Base de Datos:** [Neon Serverless PostgreSQL](https://neon.tech/) con Neon Data API (PostgREST) y Neon Auth.
* **Procesamiento de Documentos:** [SheetJS (xlsx.full.min.js)](https://sheetjs.com/), [jsPDF](https://github.com/parallax/jsPDF) y [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable).
* **Escaneo de Códigos:** [jsQR](https://github.com/cozmo/jsQR) y BarcodeDetector API nativo.
* **Voz:** Web Speech API (reconocimiento de voz nativo en español argentino).

---

## 📋 **Instrucciones de Uso (Paso a Paso)**

### **Opción 1: Carga Rápida con Celular (Escáner IA)**
1. Abre la app en el navegador del celular o instálala como PWA desde la opción *"Agregar a pantalla de inicio"*.
2. Inicia sesión con tus credenciales (o usa la cuenta demo `demo@farmacia.com` / `demo123456`).
3. En la barra superior, configura tu API Key de Gemini desde el botón de ajustes ⚙️ (si usas una cuenta propia).
4. Toca el botón flotante **"📷 Escanear con IA"**:
   - **Paso 1:** Apunta la cámara a la receta y toca *"Capturar Receta"*.
   - **Paso 2:** Apunta al ticket y toca *"Foto a Ticket y Analizar Ambos"*, o bien selecciona *"Ingresar Importe Manual"*.
   - **Paso 3:** Revisa el resumen con los datos extraídos y el cálculo de liquidación, y toca **"GUARDAR Y SIGUIENTE RECETA"**.

### **Opción 2: Carga Manual o Dictado por Voz (Computadora de Mostrador)**
1. Ingresa a la app e inicia sesión.
2. Si es la primera vez, haz clic en **"Subir Datos"** y selecciona tu archivo de padrón (o `datos_demo.xlsx`).
3. En el formulario *"Nuevo Registro"*:
   - Escribe el nombre o número de afiliado (se autocompletará automáticamente), o usa los botones de **Nombre** / **N° Afiliado** para dictar por voz 🎙️.
   - Ingresa el importe del ticket y presiona **Enter** o haz clic en **"CARGAR"**.
4. Al finalizar el período, haz clic en **"Crear Excel"** o **"Descargar PDF"** para obtener los reportes consolidados.

---

## 📂 **Estructura del Proyecto**

```
IASEP-app/
│
├── index.html            # Interfaz principal, asistente de escáner y modales
├── login.html            # Pantalla de inicio de sesión con Neon Auth
├── script.js             # Lógica general, formulario, eventos, PWA y reportes
├── scanner-service.js    # Servicio de Visión IA (Gemini), cámara y formateo
├── neon-config.js        # Integración con Neon PostgreSQL y Neon Auth
├── styles.css            # Diseño responsivo moderno, diseño de escáner y temas
├── manifest.json         # Configuración PWA para instalación móvil
├── sw.js                 # Service Worker para funcionamiento offline y caché
├── jsqr.min.js           # Motor de lectura de códigos QR offline
├── datos_demo.xlsx       # Archivo de prueba con datos ficticios para la demo
│
├── assets/               # Recursos gráficos e íconos
│   ├── favicon.ico
│   ├── icon.svg
│   └── screenshots/      # Capturas de pantalla de la aplicación
│
├── LICENSE.md            # Licencia del proyecto (MIT)
└── README.md             # Documentación completa del proyecto
```

---

## 👤 **Créditos y Autoría**

Desarrollado por **[Alberto Olender (aolender1)](https://github.com/aolender1)** para optimizar la digitalización, control y liquidación farmacéutica de afiliados de la obra social IASEP.

---

## 📄 **Licencia**

Este proyecto se distribuye bajo la licencia **MIT**. Puedes utilizarlo y modificarlo libremente.
