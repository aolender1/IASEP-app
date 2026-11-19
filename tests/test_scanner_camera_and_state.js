const assert = require('assert');
const fs = require('fs');

// Mock mínimo de navegador para cargar scanner-service.js
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; }
    };
})();

const createdCanvases = [];
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            const canvas = {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage: () => {},
                    getImageData: () => ({ data: new Uint8ClampedArray(4) })
                }),
                toDataURL: () => 'data:image/jpeg;base64,FAKEBASE64DATA'
            };
            createdCanvases.push(canvas);
            return canvas;
        }
        return {};
    }
};

global.window = {
    location: { origin: 'http://localhost:3000' },
    innerWidth: 400,
    innerHeight: 800
};
global.localStorage = localStorageMock;
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'Android',
        mediaDevices: {
            getUserMedia: null
        }
    },
    configurable: true,
    writable: true
});

const scannerCode = fs.readFileSync('scanner-service.js', 'utf8');
eval(scannerCode);
const ScannerService = global.window.ScannerService;

async function runTests() {
    console.log('--- PRUEBAS DE CÁMARA, MEMORIA CANVAS Y PROMPTS (SCANNER SERVICE) ---');

    // Test 1: stopCamera limpia completamente el videoElement (pause, srcObject=null, load) y detiene tracks
    {
        let trackStopped = false;
        let paused = false;
        let loaded = false;
        const fakeTrack = { readyState: 'live', stop: () => { trackStopped = true; fakeTrack.readyState = 'ended'; } };
        const fakeStream = { getTracks: () => [fakeTrack], getVideoTracks: () => [fakeTrack] };
        const videoEl = {
            srcObject: fakeStream,
            pause: () => { paused = true; },
            load: () => { loaded = true; },
            removeAttribute: () => {}
        };

        ScannerService.stopCamera(videoEl);

        assert.strictEqual(trackStopped, true, 'stopCamera debe detener tracks residuales del videoElement');
        assert.strictEqual(paused, true, 'stopCamera debe pausar el videoElement');
        assert.strictEqual(videoEl.srcObject, null, 'stopCamera debe limpiar srcObject');
        assert.strictEqual(loaded, true, 'stopCamera debe invocar load() para vaciar el frame previo del buffer');
        console.log('✓ Test 1 pasado: stopCamera limpia completamente el videoElement y tracks.');
    }

    // Test 2: startCamera cancela getUserMedia si stopCamera se llamó mientras resolvía (sin fuga de tracks)
    {
        let resolveStream;
        let leakedTrackStopped = false;
        const lateTrack = { readyState: 'live', stop: () => { leakedTrackStopped = true; lateTrack.readyState = 'ended'; } };
        const lateStream = { getTracks: () => [lateTrack], getVideoTracks: () => [lateTrack] };

        global.navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => {
            resolveStream = resolve;
        });

        const videoEl = {
            srcObject: null,
            readyState: 4,
            videoWidth: 1080,
            videoHeight: 1440,
            play: async () => {},
            pause: () => {},
            load: () => {},
            removeAttribute: () => {}
        };

        const startPromise = ScannerService.startCamera(videoEl);
        // Usuario cambia de paso o cierra modal antes de que getUserMedia resuelva
        ScannerService.stopCamera(videoEl);
        resolveStream(lateStream);

        const started = await startPromise;
        assert.strictEqual(started, false, 'startCamera cancelado debe retornar false');
        assert.strictEqual(leakedTrackStopped, true, 'startCamera cancelado debe detener el stream que llegó tarde');
        assert.strictEqual(videoEl.srcObject, null, 'videoEl.srcObject debe permanecer null si la cámara fue detenida');
        console.log('✓ Test 2 pasado: startCamera evita fuga de streams en transiciones rápidas.');
    }

    // Test 3: captureFrame rechaza videos no listos o con track detenido y libera canvas tras captura válida
    {
        assert.strictEqual(typeof ScannerService.captureFrame, 'function', 'ScannerService.captureFrame debe existir');

        // Video sin srcObject (aunque tenga videoWidth residual del navegador)
        const staleVideo = {
            srcObject: null,
            readyState: 1,
            videoWidth: 1080,
            videoHeight: 1440
        };
        assert.strictEqual(ScannerService.captureFrame(staleVideo), null, 'captureFrame debe rechazar video sin srcObject o readyState < 2');

        // Video con track terminado
        const endedVideo = {
            srcObject: { getVideoTracks: () => [{ readyState: 'ended' }] },
            readyState: 4,
            videoWidth: 1080,
            videoHeight: 1440
        };
        assert.strictEqual(ScannerService.captureFrame(endedVideo), null, 'captureFrame debe rechazar video con track ended');

        // Video válido en vivo
        createdCanvases.length = 0;
        const liveVideo = {
            srcObject: { getVideoTracks: () => [{ readyState: 'live' }] },
            readyState: 4,
            videoWidth: 1080,
            videoHeight: 1440
        };
        const frame = ScannerService.captureFrame(liveVideo);
        assert.strictEqual(frame, 'data:image/jpeg;base64,FAKEBASE64DATA', 'captureFrame debe devolver DataURL válido');
        assert.strictEqual(createdCanvases.length, 1, 'captureFrame debe crear un canvas');
        assert.strictEqual(createdCanvases[0].width, 0, 'captureFrame debe liberar memoria del canvas (width = 0)');
        assert.strictEqual(createdCanvases[0].height, 0, 'captureFrame debe liberar memoria del canvas (height = 0)');
        console.log('✓ Test 3 pasado: captureFrame valida stream vivo y libera memoria de canvas.');
    }

    // Test 4: optimizeImageForAI libera memoria de canvas después de comprimir
    {
        createdCanvases.length = 0;
        const fakeImgEl = { naturalWidth: 2000, naturalHeight: 1000 };
        const res = await ScannerService.optimizeImageForAI(fakeImgEl, 1080);
        assert.strictEqual(res.base64Data, 'FAKEBASE64DATA');
        assert.strictEqual(createdCanvases.length, 1);
        assert.strictEqual(createdCanvases[0].width, 0, 'optimizeImageForAI debe liberar width del canvas');
        assert.strictEqual(createdCanvases[0].height, 0, 'optimizeImageForAI debe liberar height del canvas');
        console.log('✓ Test 4 pasado: optimizeImageForAI libera memoria del canvas.');
    }

    // Test 5: Los prompts de IA no deben hardcodear pacientes ni importes reales de ejemplo
    {
        assert(!scannerCode.includes('ACOSTA FRANCISCA TERESA'), 'El prompt no debe incluir nombres reales de pacientes como ejemplo');
        assert(!scannerCode.includes('ALMIRON ANTONIO ADRIAN'), 'El prompt no debe incluir nombres reales de pacientes como ejemplo');
        assert(!scannerCode.includes('82486.80'), 'El prompt no debe incluir importes reales en el JSON de ejemplo');
        console.log('✓ Test 5 pasado: prompts sin ejemplos reales hardcodeados que causen alucinaciones.');
    }

    console.log('--- TODAS LAS PRUEBAS DE SCANNER CAMERA & STATE PASARON ---');
}

runTests().catch((err) => {
    console.error('FALLO EN PRUEBAS:', err);
    process.exit(1);
});
