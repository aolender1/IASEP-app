const assert = require('assert');
const fs = require('fs');

// Simular entorno de navegador mínimo para cargar scanner-service.js
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; }
    };
})();

global.window = {
    location: { origin: 'http://localhost:3000' }
};
global.localStorage = localStorageMock;

// Leer y evaluar scanner-service.js
const scannerCode = fs.readFileSync('scanner-service.js', 'utf8');
eval(scannerCode);
const ScannerService = global.window.ScannerService;

console.log('--- INICIANDO PRUEBAS DE SCANNER SERVICE CON OPENROUTER ---');

// Test 1: Modelos soportados y proveedores
assert(Array.isArray(ScannerService.SUPPORTED_MODELS), 'SUPPORTED_MODELS debe ser un array');
assert(ScannerService.SUPPORTED_MODELS.length >= 3, 'Debe haber al menos 3 modelos');
const dsModel = ScannerService.SUPPORTED_MODELS.find(m => m.id === 'deepseek/deepseek-v4.1-flash-1017');
assert(dsModel, 'deepseek/deepseek-v4.1-flash-1017 debe estar en SUPPORTED_MODELS');
assert.strictEqual(dsModel.provider, 'openrouter', 'Proveedor de DeepSeek debe ser openrouter');
console.log('✓ Test 1 pasado: Modelos soportados correctamente configurados.');

// Test 2: getModelProvider
assert.strictEqual(ScannerService.getModelProvider('deepseek/deepseek-v4.1-flash-1017'), 'openrouter');
assert.strictEqual(ScannerService.getModelProvider('gemini-3.5-flash-lite'), 'gemini');
assert.strictEqual(ScannerService.getModelProvider('gemini-3.1-flash-lite'), 'gemini');
console.log('✓ Test 2 pasado: getModelProvider clasifica correctamente los proveedores.');

// Test 3: Getters y Setters de OpenRouter API Key
ScannerService.setOpenRouterApiKey('sk-or-test-key-12345');
assert.strictEqual(ScannerService.getOpenRouterApiKey(), 'sk-or-test-key-12345');
assert.strictEqual(localStorage.getItem('openrouter_api_key'), 'sk-or-test-key-12345');
ScannerService.setOpenRouterApiKey('');
assert.strictEqual(ScannerService.getOpenRouterApiKey(), '');
assert.strictEqual(localStorage.getItem('openrouter_api_key'), null);
console.log('✓ Test 3 pasado: Persistencia de API Key de OpenRouter funciona.');

// Test 4: Selección de Modelo y fallback
ScannerService.setSelectedModel('deepseek/deepseek-v4.1-flash-1017');
assert.strictEqual(ScannerService.getSelectedModel(), 'deepseek/deepseek-v4.1-flash-1017');
ScannerService.setSelectedModel('gemini-3.5-flash-lite');
assert.strictEqual(ScannerService.getSelectedModel(), 'gemini-3.5-flash-lite');
console.log('✓ Test 4 pasado: Selección de modelo funciona.');

// Test 5: Validación de clave vacía en testApiKey
ScannerService.testApiKey('', 'deepseek/deepseek-v4.1-flash-1017').then(res => {
    assert.strictEqual(res.success, false);
    assert(res.message.includes('no puede estar vacía'));
    console.log('✓ Test 5 pasado: testApiKey rechaza claves vacías adecuadamente.');
});

// Test 6: Formato Carnet IASEP
assert.strictEqual(ScannerService.formatCarnetIasep('31843787700'), '3-18437877-00');
assert.strictEqual(ScannerService.formatCarnetIasep('3-18437877-00'), '3-18437877-00');
assert.strictEqual(ScannerService.formatCarnetIasep('10823028600'), '1-08230286-00');
console.log('✓ Test 6 pasado: formatCarnetIasep conserva estandarización.');

console.log('--- TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE ---');
