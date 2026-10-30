# Integración DeepSeek V4.1 Flash 1017 vía OpenRouter - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el modelo `deepseek/deepseek-v4.1-flash-1017` mediante la API de OpenRouter como opción seleccionable de ultra alta velocidad en la app IASEP, permitiendo configurar ambas API Keys (Gemini y OpenRouter) y sincronizarlas en Neon DB.

**Architecture:** La aplicación cliente en JavaScript maneja la selección del modelo y proveedor (Google Gemini u OpenRouter). `ScannerService` enruta las llamadas de visión directamente al endpoint de OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) cuando se selecciona DeepSeek, o al endpoint de Google Gemini si se selecciona un modelo Gemini. La tabla `farmacias` en Neon DB se actualiza para sincronizar ambas API Keys entre dispositivos.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3, OpenRouter API (OpenAI-compatible Chat Completions con visión), Neon DB PostgREST API.

**Spec:** C:/Users/alenk/.gemini/antigravity/brain/51eb3aa9-01d9-4f2a-93b4-06df87812408/design-openrouter-deepseek.md

---

## Global Constraints
- No alterar las llamadas existentes a Google Gemini ni romper la funcionalidad para usuarios que sigan usando Gemini.
- OpenRouter requiere cabecera `Authorization: Bearer <token>` y cuerpo en formato Chat Completions OpenAI con `image_url` data URLs (`data:image/jpeg;base64,...`).
- En Neon DB (`farmacias`), las columnas de credenciales deben ser opcionales (nullable) para evitar errores si una farmacia solo usa un proveedor.
- Sanitizar las respuestas JSON de los LLM eliminando bloques markdown de código ```json ... ``` si vinieran incluidos.

---

## Review Focus
1. **OpenRouter JSON envoltura Markdown:** DeepSeek puede responder con triple backtick ` ```json ... ``` `; el parser debe limpiar markdown antes de `JSON.parse`.
2. **Prueba de Conexión Dinámica:** El botón "Probar Conexión" debe usar la API Key correcta según el modelo seleccionado en el `<select>` y advertir si falta esa clave específica.
3. **Persistencia y Sincronización:** Guardar las claves en `localStorage` y en Neon DB sin sobreescribir con valores nulos o vacíos indeseados.
4. **Múltiples Imágenes:** La extracción conjunta de receta y ticket envía dos imágenes en el mismo array `content: [{type: 'text', ...}, {type: 'image_url', ...}, {type: 'image_url', ...}]`.
5. **Fallback y Manejo de Errores:** Errores HTTP de OpenRouter (401 por clave inválida, 402 por falta de saldo, 429 por cuota) deben mostrarse claramente al usuario.

---

### Task 1: Migración en Neon DB (Columna `openrouter_api_key`)

**Files:**
- Database: Neon DB `neondb` (project `wandering-dream-60363098`)

- [ ] **Paso 1: Ejecutar DDL en Neon DB**
  Ejecutar SQL en Neon:
  ```sql
  ALTER TABLE public.farmacias ADD COLUMN IF NOT EXISTS openrouter_api_key text NULL;
  ```
- [ ] **Paso 2: Verificar esquema en Neon DB**
  Verificar que la columna `openrouter_api_key` figure en las columnas de `public.farmacias`.

---

### Task 2: Actualización de Sincronización en la Nube (`neon-config.js`)

**Files:**
- Modify: `neon-config.js`

**Interfaces:**
- Consumes: Neon DB `farmacias` table
- Produces: `guardarConfiguracionIAEnNeon(geminiKey, openrouterKey, model)` y sincronización en `cargarDatosFarmacia()`

- [ ] **Paso 1: Actualizar `cargarDatosFarmacia`**
  Cargar `farmaciaInfoGlobal.openrouter_api_key` en `localStorage.setItem('openrouter_api_key', ...)` si existe.
- [ ] **Paso 2: Actualizar `guardarConfiguracionGeminiEnNeon`**
  Permitir guardar tanto `gemini_api_key` como `openrouter_api_key` junto a `gemini_model`. Mantener retrocompatibilidad de firma si se pasan parámetros existentes.
- [ ] **Paso 3: Verificar guardado y carga en `neon-config.js`**

---

### Task 3: Soporte Multimodal para OpenRouter en `scanner-service.js`

**Files:**
- Modify: `scanner-service.js`

**Interfaces:**
- Consumes: `openrouter_api_key`, imágenes base64 optimizadas
- Produces: `ScannerService.getOpenRouterApiKey()`, `ScannerService.setOpenRouterApiKey()`, soporte en `testApiKey()`, `extractRecipeData()`, `extractTicketData()`, `extractCompleteRecipeAndTicket()`

- [ ] **Paso 1: Actualizar `SUPPORTED_MODELS` y constantes**
  Añadir:
  ```javascript
  { id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek V4.1 Flash 1017 (OpenRouter - Ultra Rápido)', provider: 'openrouter' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Google AI Studio)', provider: 'gemini' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Google AI Studio)', provider: 'gemini' }
  ```
- [ ] **Paso 2: Añadir métodos de clave OpenRouter**
  Implementar `getOpenRouterApiKey()` y `setOpenRouterApiKey(key)` con persistencia en `localStorage`.
- [ ] **Paso 3: Implementar `callOpenRouterVisionMulti(base64ImagesArray, promptText, model)`**
  - Armar `messages` con `content` multimodal (`type: "text"` e `image_url: { url: "data:image/jpeg;base64,..." }`).
  - Cabecera `Authorization: Bearer ${apiKey}`.
  - Parámetros: `temperature: 0.1`, `response_format: { type: "json_object" }`.
  - Limpieza de triple backticks markdown en la respuesta antes de `JSON.parse`.
- [ ] **Paso 4: Unificar enrutamiento en `callAIVisionMulti`**
  Reemplazar o delegar `callGeminiVisionMulti` para que detecte si el modelo activo es de OpenRouter o Gemini y despache al método correspondiente.
- [ ] **Paso 5: Actualizar `testApiKey(apiKey, modelId)`**
  Permitir probar la conexión con OpenRouter enviando un prompt mínimo (`{"status":"ok"}`) a `https://openrouter.ai/api/v1/chat/completions`.
- [ ] **Paso 6: Exponer nuevos métodos en el retorno de `ScannerService`**

---

### Task 4: Modificación del Modal de Configuración en `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Paso 1: Actualizar título y ayuda en el modal `modalGeminiConfig`**
  Renombrar visualmente a "Configuración de Inteligencia Artificial (IA)".
- [ ] **Paso 2: Añadir campo para la API Key de OpenRouter**
  - Input `cfgOpenRouterApiKey` (password).
  - Texto de ayuda y enlace para obtener clave en `https://openrouter.ai/settings/keys`.
- [ ] **Paso 3: Actualizar opciones del `<select id="cfgGeminiModel">`**
  Incluir opción `deepseek/deepseek-v4.1-flash-1017` destacada como opción ultra rápida recomendada.

---

### Task 5: Lógica de Interfaz y Control en `script.js`

**Files:**
- Modify: `script.js`

- [ ] **Paso 1: Leer y poblar `cfgOpenRouterApiKey` al abrir el modal**
  Cargar valor con `ScannerService.getOpenRouterApiKey()`.
- [ ] **Paso 2: Adaptar el botón "Probar Conexión"**
  Identificar el proveedor del modelo seleccionado: si es OpenRouter, verificar y probar `cfgOpenRouterApiKey`; si es Gemini, verificar y probar `cfgGeminiApiKey`.
- [ ] **Paso 3: Adaptar el formulario de guardado (`formGeminiConfig`)**
  Guardar ambas claves y sincronizar en Neon DB vía `guardarConfiguracionGeminiEnNeon(geminiKey, openrouterKey, model)`.
- [ ] **Paso 4: Adaptar títulos de procesamiento y badges en la UI**
  Mostrar `⚡ DeepSeek V4.1` en el badge de confirmación cuando se use DeepSeek, y mantener `🤖 Gemini` cuando se use Gemini.

---

### Task 6: Verificación y Pruebas Funcionales

- [ ] **Paso 1: Validar sintaxis y compilación/carga de scripts**
  Ejecutar node check de sintaxis sobre `neon-config.js`, `scanner-service.js`, `script.js`.
- [ ] **Paso 2: Probar la migración en Neon DB y verificar conectividad**
- [ ] **Paso 3: Verificar visualmente y funcionalmente el modal en el navegador**

