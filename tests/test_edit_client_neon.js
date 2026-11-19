const assert = require('assert');
const fs = require('fs');

// Simular entorno navegador para neon-config.js
const store = {
    neonToken: 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ5OTk5OTk5OTl9.sig',
    userEmail: 'farmacia@test.com'
};

global.sessionStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
};
global.localStorage = global.sessionStorage;
global.window = { location: { origin: 'http://localhost:3000' } };
global.atob = (s) => Buffer.from(s, 'base64').toString('utf8');
global.formatCarnetIasep = (val) => {
    const d = String(val || '').replace(/\D/g, '');
    if (d.length === 11) return `${d[0]}-${d.slice(1, 9)}-${d.slice(9, 11)}`;
    return String(val || '').trim();
};

const fetchCalls = [];
let mockFetchImpl = null;
global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return mockFetchImpl(url, options);
};

// Cargar neon-config.js en contexto global
const neonCode = fs.readFileSync('neon-config.js', 'utf8');
const vm = require('vm');
vm.runInThisContext(neonCode, { filename: 'neon-config.js' });

async function runTests() {
    console.log('--- PRUEBAS DE EDICIÓN DE CLIENTES Y REGISTROS EN NEON ---');

    assert.strictEqual(typeof actualizarClienteEnNeon, 'function', 'actualizarClienteEnNeon debe existir en neon-config.js');
    assert.strictEqual(typeof actualizarRegistrosDeClienteEnNeon, 'function', 'actualizarRegistrosDeClienteEnNeon debe existir en neon-config.js');

    // Test 1: actualizarClienteEnNeon con DB_ID hace PATCH por id y formatea carnet
    {
        fetchCalls.length = 0;
        mockFetchImpl = async (url, options) => ({
            ok: true,
            status: 200,
            json: async () => ([{ id: 42, nombre: 'PEREZ JUAN', numero: '3-12345678-00', farmacia_email: 'farmacia@test.com' }])
        });

        const res = await actualizarClienteEnNeon({
            id: 42,
            oldNombre: 'PEREZ JUAN',
            oldNumero: '3-12345670-00',
            nombre: '  PEREZ JUAN. ',
            numero: '31234567800'
        }, 'farmacia@test.com');

        assert.strictEqual(fetchCalls.length, 1);
        assert.strictEqual(fetchCalls[0].options.method, 'PATCH');
        assert(fetchCalls[0].url.includes('clientes?id=eq.42'), 'Debe filtrar por id=eq.42');
        assert(fetchCalls[0].url.includes('farmacia_email=eq.farmacia%40test.com'), 'Debe restringir por farmacia_email');
        const sentBody = JSON.parse(fetchCalls[0].options.body);
        assert.strictEqual(sentBody.nombre, 'PEREZ JUAN');
        assert.strictEqual(sentBody.numero, '3-12345678-00');
        assert.strictEqual(res.updated.id, 42);
        console.log('✓ Test 1 pasado: actualizarClienteEnNeon actualiza por id y normaliza nombre/carnet.');
    }

    // Test 2: actualizarClienteEnNeon sin DB_ID hace PATCH usando clave compuesta (farmacia_email + oldNombre + oldNumero)
    {
        fetchCalls.length = 0;
        mockFetchImpl = async () => ({
            ok: true,
            status: 200,
            json: async () => ([{ id: 77, nombre: 'GOMEZ MARIA', numero: '1-09876543-00' }])
        });

        const res = await actualizarClienteEnNeon({
            id: null,
            oldNombre: 'GOMEZ MAR',
            oldNumero: '1-09876540-00',
            nombre: 'GOMEZ MARIA',
            numero: '1-09876543-00'
        }, 'farmacia@test.com');

        assert.strictEqual(fetchCalls.length, 1);
        assert.strictEqual(fetchCalls[0].options.method, 'PATCH');
        assert(fetchCalls[0].url.includes('nombre=eq.GOMEZ%20MAR'));
        assert(fetchCalls[0].url.includes('numero=eq.1-09876540-00'));
        assert.strictEqual(res.updated.id, 77);
        console.log('✓ Test 2 pasado: actualizarClienteEnNeon soporta fallback por clave compuesta.');
    }

    // Test 3: si el cliente no existía en tabla clientes (PATCH devuelve []), lo inserta con guardarClienteEnNeon
    {
        fetchCalls.length = 0;
        let callNum = 0;
        mockFetchImpl = async (url, options) => {
            callNum++;
            if (callNum === 1) {
                return { ok: true, status: 200, json: async () => ([]) };
            }
            return { ok: true, status: 201, json: async () => ([{ id: 99, nombre: 'LOPEZ ANA', numero: '2-22334455-00' }]) };
        };

        const res = await actualizarClienteEnNeon({
            id: null,
            oldNombre: 'LOPEZ ANA',
            oldNumero: '2-22334450-00',
            nombre: 'LOPEZ ANA',
            numero: '2-22334455-00'
        }, 'farmacia@test.com');

        assert.strictEqual(fetchCalls.length, 2, 'Debe intentar PATCH y luego POST si no existía en tabla clientes');
        assert.strictEqual(fetchCalls[1].options.method, 'POST');
        assert.strictEqual(res.updated.id, 99);
        assert.strictEqual(res.created, true);
        console.log('✓ Test 3 pasado: actualizarClienteEnNeon crea registro en clientes si no existía.');
    }

    // Test 4: actualizarRegistrosDeClienteEnNeon actualiza comprobantes por lista de IDs del lote activo
    {
        fetchCalls.length = 0;
        mockFetchImpl = async () => ({
            ok: true,
            status: 200,
            json: async () => ([{ id: 10 }, { id: 15 }])
        });

        const updatedCount = await actualizarRegistrosDeClienteEnNeon({
            registroIds: [10, 15],
            nombre: 'PEREZ JUAN',
            afiliado: '31234567800'
        }, 'farmacia@test.com');

        assert.strictEqual(fetchCalls.length, 1);
        assert.strictEqual(fetchCalls[0].options.method, 'PATCH');
        assert(fetchCalls[0].url.includes('registros?id=in.(10,15)'));
        const body = JSON.parse(fetchCalls[0].options.body);
        assert.strictEqual(body.nombre, 'PEREZ JUAN');
        assert.strictEqual(body.afiliado, '3-12345678-00');
        assert.strictEqual(updatedCount, 2);

        // Si no hay IDs, no hace llamada de red
        fetchCalls.length = 0;
        const zeroCount = await actualizarRegistrosDeClienteEnNeon({
            registroIds: [],
            nombre: 'PEREZ JUAN',
            afiliado: '3-12345678-00'
        }, 'farmacia@test.com');
        assert.strictEqual(zeroCount, 0);
        assert.strictEqual(fetchCalls.length, 0);
        console.log('✓ Test 4 pasado: actualizarRegistrosDeClienteEnNeon actualiza comprobantes del lote activo.');
    }

    console.log('--- TODAS LAS PRUEBAS DE NEON CLIENTES PASARON ---');
}

runTests().catch((err) => {
    console.error('FALLO EN PRUEBAS:', err);
    process.exit(1);
});
