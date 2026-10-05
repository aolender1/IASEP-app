// Configuración de Neon
const NEON_AUTH_URL = 'https://ep-withered-forest-ac7q5w95.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const NEON_DATA_URL = 'https://ep-withered-forest-ac7q5w95.apirest.sa-east-1.aws.neon.tech/neondb/rest/v1/';

// Variable global para almacenar los datos de la farmacia
let farmaciaInfoGlobal = null;
let loteActivoGlobal = null;

/**
 * Obtener token de autenticación (soporta sessionStorage y localStorage para PWA)
 */
function getAuthToken() {
    return sessionStorage.getItem('neonToken') || localStorage.getItem('neonToken');
}

/**
 * Verifica si un token JWT ha expirado o está próximo a expirar
 */
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadStr);
        if (!payload.exp) return false;
        // Si expira en menos de 60 segundos, considerarlo expirado
        return (Date.now() / 1000) >= (payload.exp - 60);
    } catch (e) {
        return true;
    }
}

/**
 * Intenta refrescar el token JWT usando la sesión activa de Neon Auth
 */
async function refrescarTokenNeon() {
    try {
        const sessionResponse = await fetch(`${NEON_AUTH_URL}/get-session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Origin': window.location.origin || 'https://aolender1.github.io'
            }
        });
        if (!sessionResponse.ok) return null;
        let jwtToken = sessionResponse.headers.get('set-auth-jwt') || sessionResponse.headers.get('x-auth-jwt');
        if (!jwtToken) {
            const data = await sessionResponse.json().catch(() => null);
            if (data && (data.token || data.jwt)) {
                jwtToken = data.token || data.jwt;
            }
        }
        if (jwtToken) {
            sessionStorage.setItem('neonToken', jwtToken);
            localStorage.setItem('neonToken', jwtToken);
            return jwtToken;
        }
    } catch (e) {
        console.warn('Error al intentar refrescar token Neon:', e);
    }
    return null;
}

/**
 * Obtiene un token válido o intenta refrescarlo si expiró
 */
async function obtenerTokenValido() {
    let token = getAuthToken();
    if (!token || isTokenExpired(token)) {
        const fresh = await refrescarTokenNeon();
        if (fresh) return fresh;
        return null;
    }
    return token;
}

/**
 * Inicia sesión utilizando Neon Auth
 */
async function neonLogin(email, password) {
    try {
        const response = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin || 'https://aolender1.github.io'
            },
            body: JSON.stringify({ 
                email, 
                password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la autenticación');
        }

        const data = await response.json();
        
        // Intentar obtener el token de los headers primero
        let jwtToken = response.headers.get('set-auth-jwt') || response.headers.get('x-auth-jwt');
        
        // Si no está en los headers, lo pedimos explícitamente a get-session
        if (!jwtToken) {
            try {
                const sessionResponse = await fetch(`${NEON_AUTH_URL}/get-session`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Origin': window.location.origin || 'https://aolender1.github.io'
                    }
                });
                jwtToken = sessionResponse.headers.get('set-auth-jwt') || sessionResponse.headers.get('x-auth-jwt');
                if (!jwtToken) {
                    const sessionData = await sessionResponse.json().catch(() => null);
                    if (sessionData && (sessionData.token || sessionData.jwt)) {
                        jwtToken = sessionData.token || sessionData.jwt;
                    }
                }
            } catch (e) {
                console.error('Error al intentar obtener JWT:', e);
            }
        }

        if (jwtToken) {
            sessionStorage.setItem('neonToken', jwtToken);
            localStorage.setItem('neonToken', jwtToken);
        } else {
            console.warn('No se pudo obtener el token JWT de Neon Auth');
        }

        // Guardar email y estado de login de forma persistente para la PWA
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', email);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        
        return data;
    } catch (error) {
        console.error('Error de login Neon:', error);
        throw error;
    }
}

/**
 * Obtiene datos de la farmacia según el email del usuario usando la Data API
 */
async function obtenerDatosFarmacia(email) {
    let token = await obtenerTokenValido();
    if (!token) {
        console.warn('No hay token de sesión disponible.');
        return fallbackDatosFarmacia(email);
    }

    try {
        let response = await fetch(`${NEON_DATA_URL}farmacias?email=eq.${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 400 || response.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                response = await fetch(`${NEON_DATA_URL}farmacias?email=eq.${encodeURIComponent(email)}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }

        if (!response.ok) {
            console.warn('Error al obtener datos de farmacia de Neon:', response.statusText);
            return fallbackDatosFarmacia(email);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        }
        return fallbackDatosFarmacia(email);
    } catch (error) {
        console.warn('Error en obtenerDatosFarmacia:', error);
        return fallbackDatosFarmacia(email);
    }
}

function fallbackDatosFarmacia(email) {
    if (email === 'demo@farmacia.com' || email === 'demo@iasep.com') {
        return {
            email: email,
            nombre: "FARMACIA DEMO - DE PRUEBA IASEP",
            ubicacion: "(Formosa - Capital) Cel: 3704000000"
        };
    }
    return {
        email: email,
        nombre: "FARMACIA IASEP",
        ubicacion: "Formosa - Capital"
    };
}

/**
 * Carga los datos de la farmacia al iniciar la aplicación
 */
async function cargarDatosFarmacia() {
    const email = obtenerEmailUsuario();
    if (email) {
        farmaciaInfoGlobal = await obtenerDatosFarmacia(email);
        // Si la base de datos ya tiene la API Key y modelo de Gemini para esta cuenta, sincronizarlos
        if (farmaciaInfoGlobal) {
            if (farmaciaInfoGlobal.gemini_api_key) {
                localStorage.setItem('gemini_api_key', farmaciaInfoGlobal.gemini_api_key);
            }
            if (farmaciaInfoGlobal.gemini_model) {
                localStorage.setItem('gemini_selected_model', farmaciaInfoGlobal.gemini_model);
            }
        }
    }
    return farmaciaInfoGlobal;
}

/**
 * Guarda la API Key y modelo de Gemini en la cuenta de la farmacia en Neon DB
 */
async function guardarConfiguracionGeminiEnNeon(apiKey, model) {
    let token = await obtenerTokenValido();
    const email = obtenerEmailUsuario();
    if (!token || !email) return false;

    try {
        let res = await fetch(`${NEON_DATA_URL}farmacias?email=eq.${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                gemini_api_key: apiKey,
                gemini_model: model
            })
        });

        if (res.status === 400 || res.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                res = await fetch(`${NEON_DATA_URL}farmacias?email=eq.${encodeURIComponent(email)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        gemini_api_key: apiKey,
                        gemini_model: model
                    })
                });
            }
        }

        if (res.ok) {
            if (farmaciaInfoGlobal) {
                farmaciaInfoGlobal.gemini_api_key = apiKey;
                farmaciaInfoGlobal.gemini_model = model;
            }
            return true;
        } else {
            console.warn('Error al actualizar configuración en Neon DB:', res.status);
            return false;
        }
    } catch (e) {
        console.warn('Error de red al guardar configuración en Neon:', e);
        return false;
    }
}

/**
 * Obtiene el email del usuario actual (desde session o localStorage)
 */
function obtenerEmailUsuario() {
    return sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail') || 'demo@farmacia.com';
}

/**
 * Obtiene los datos de farmacia cargados globalmente
 */
function getFarmaciaInfo() {
    return farmaciaInfoGlobal;
}

// ============================================================================
// GESTIÓN DE LOTES Y REGISTROS MULTI-USUARIO (Neon Data API)
// ============================================================================

/**
 * Obtener todos los lotes de la farmacia
 */
async function obtenerLotesFarmacia(email) {
    let token = await obtenerTokenValido();
    if (!token) return [];

    try {
        let res = await fetch(`${NEON_DATA_URL}lotes?farmacia_email=eq.${encodeURIComponent(email)}&order=id.desc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 400 || res.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                res = await fetch(`${NEON_DATA_URL}lotes?farmacia_email=eq.${encodeURIComponent(email)}&order=id.desc`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('Error al obtener lotes de Neon:', e);
        return [];
    }
}

/**
 * Crear un nuevo lote en Neon
 */
async function crearLoteEnNeon(nombre, email) {
    let token = await obtenerTokenValido();
    if (!token) throw new Error('No hay sesión activa');

    const payload = {
        farmacia_email: email,
        nombre: nombre,
        activo: true
    };

    let res = await fetch(`${NEON_DATA_URL}lotes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (res.status === 400 || res.status === 401) {
        token = await refrescarTokenNeon();
        if (token) {
            res = await fetch(`${NEON_DATA_URL}lotes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });
        }
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error al crear lote HTTP ${res.status}`);
    }

    const created = await res.json();
    return Array.isArray(created) ? created[0] : created;
}

/**
 * Obtiene el lote activo para la farmacia (o crea uno con el mes/año actual si no existe)
 */
async function obtenerLoteActivoOInicial(email) {
    const lotes = await obtenerLotesFarmacia(email);
    const storedLoteId = localStorage.getItem('lote_activo_id');

    if (storedLoteId) {
        const found = lotes.find(l => l.id == storedLoteId);
        if (found) {
            loteActivoGlobal = found;
            return found;
        }
    }

    // Si hay un lote activo en la lista, tomar el primero
    const activo = lotes.find(l => l.activo) || lotes[0];
    if (activo) {
        loteActivoGlobal = activo;
        localStorage.setItem('lote_activo_id', activo.id);
        return activo;
    }

    // Si no hay ningún lote, crear automáticamente uno para el mes actual
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const now = new Date();
    const nombreLoteDefault = `${meses[now.getMonth()]} ${now.getFullYear()}`;
    
    try {
        const nuevo = await crearLoteEnNeon(nombreLoteDefault, email);
        loteActivoGlobal = nuevo;
        localStorage.setItem('lote_activo_id', nuevo.id);
        return nuevo;
    } catch (e) {
        console.warn('No se pudo crear lote en Neon, usando modo local:', e);
        loteActivoGlobal = { id: 1, nombre: nombreLoteDefault, farmacia_email: email, activo: true };
        return loteActivoGlobal;
    }
}

/**
 * Establece el lote activo
 */
function setLoteActivo(lote) {
    loteActivoGlobal = lote;
    if (lote && lote.id) {
        localStorage.setItem('lote_activo_id', lote.id);
    }
}

function getLoteActivo() {
    return loteActivoGlobal;
}

/**
 * Obtiene todos los registros del lote activo
 */
async function obtenerRegistrosLote(loteId) {
    let token = await obtenerTokenValido();
    if (!token || !loteId) return [];

    try {
        let res = await fetch(`${NEON_DATA_URL}registros?lote_id=eq.${loteId}&order=id.asc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 400 || res.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                res = await fetch(`${NEON_DATA_URL}registros?lote_id=eq.${loteId}&order=id.asc`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('Error al obtener registros de lote:', e);
        return [];
    }
}

/**
 * Guarda un comprobante en el lote de Neon
 */
async function guardarRegistroEnNeon(registro) {
    let token = await obtenerTokenValido();
    if (!token) throw new Error('No hay sesión activa para guardar en Neon. Por favor reingresa tus credenciales.');

    const payload = {
        lote_id: registro.lote_id,
        farmacia_email: registro.farmacia_email,
        nombre: registro.nombre,
        afiliado: registro.afiliado,
        importe: registro.importe,
        productos: registro.productos || '',
        cargado_por: registro.cargado_por || obtenerEmailUsuario()
    };

    let res = await fetch(`${NEON_DATA_URL}registros`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (res.status === 400 || res.status === 401) {
        token = await refrescarTokenNeon();
        if (token) {
            res = await fetch(`${NEON_DATA_URL}registros`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });
        }
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error al guardar comprobante HTTP ${res.status}`);
    }

    const created = await res.json();
    return Array.isArray(created) ? created[0] : created;
}

/**
 * Elimina un registro de Neon por su ID
 */
async function eliminarRegistroDeNeon(registroId) {
    let token = await obtenerTokenValido();
    if (!token) throw new Error('No hay sesión activa');

    let res = await fetch(`${NEON_DATA_URL}registros?id=eq.${registroId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 400 || res.status === 401) {
        token = await refrescarTokenNeon();
        if (token) {
            res = await fetch(`${NEON_DATA_URL}registros?id=eq.${registroId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    }

    if (!res.ok && res.status !== 204) {
        throw new Error(`Error al eliminar registro HTTP ${res.status}`);
    }
    return true;
}

// ============================================================================
// GESTIÓN DE PADRÓN DE CLIENTES MULTI-DISPOSITIVO (Neon Data API)
// ============================================================================

/**
 * Obtiene todos los clientes registrados para la farmacia desde Neon DB
 */
async function obtenerClientesFarmacia(email) {
    let token = await obtenerTokenValido();
    if (!token || !email) return [];

    try {
        let res = await fetch(`${NEON_DATA_URL}clientes?farmacia_email=eq.${encodeURIComponent(email)}&order=nombre.asc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 400 || res.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                res = await fetch(`${NEON_DATA_URL}clientes?farmacia_email=eq.${encodeURIComponent(email)}&order=nombre.asc`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('Error al obtener clientes de Neon:', e);
        return [];
    }
}

/**
 * Guarda o actualiza un cliente en Neon DB
 */
async function guardarClienteEnNeon(cliente, email) {
    let token = await obtenerTokenValido();
    if (!token || !email) return null;

    const payload = {
        farmacia_email: email,
        nombre: (cliente.nombre || cliente.NOMBRE || cliente.Cliente || '').trim(),
        numero: (cliente.numero || cliente.NUMERO || cliente.Afiliado || '').trim(),
        es_nuevo: cliente.es_nuevo !== undefined ? cliente.es_nuevo : true
    };

    if (!payload.nombre) return null;

    try {
        let res = await fetch(`${NEON_DATA_URL}clientes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 400 || res.status === 401) {
            token = await refrescarTokenNeon();
            if (token) {
                res = await fetch(`${NEON_DATA_URL}clientes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation,resolution=merge-duplicates'
                    },
                    body: JSON.stringify(payload)
                });
            }
        }

        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data[0] : data;
        }
    } catch (e) {
        console.warn('Error al guardar cliente en Neon:', e);
    }
    return null;
}

/**
 * Sincroniza un lote de clientes (ej. importados de Excel) con Neon DB
 */
async function sincronizarLoteClientesNeon(clientesArray, email, onProgress) {
    let token = await obtenerTokenValido();
    if (!token || !email || !Array.isArray(clientesArray) || clientesArray.length === 0) return 0;

    const CHUNK_SIZE = 100;
    let guardados = 0;

    for (let i = 0; i < clientesArray.length; i += CHUNK_SIZE) {
        const chunk = clientesArray.slice(i, i + CHUNK_SIZE).map(c => ({
            farmacia_email: email,
            nombre: (c.NOMBRE || c.nombre || c.Cliente || '').toString().trim(),
            numero: (c.NUMERO || c.numero || c.Afiliado || '').toString().trim(),
            es_nuevo: false
        })).filter(c => c.nombre.length > 0);

        if (chunk.length === 0) continue;

        try {
            let res = await fetch(`${NEON_DATA_URL}clientes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal,resolution=merge-duplicates'
                },
                body: JSON.stringify(chunk)
            });

            if (res.status === 400 || res.status === 401) {
                token = await refrescarTokenNeon();
                if (token) {
                    res = await fetch(`${NEON_DATA_URL}clientes`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal,resolution=merge-duplicates'
                        },
                        body: JSON.stringify(chunk)
                    });
                }
            }

            if (res.ok) {
                guardados += chunk.length;
                if (typeof onProgress === 'function') {
                    onProgress(guardados, clientesArray.length);
                }
            }
        } catch (e) {
            console.warn('Error al subir bloque de clientes a Neon:', e);
        }
    }

    return guardados;
}

