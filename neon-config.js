// Configuración de Neon
const NEON_AUTH_URL = 'https://ep-withered-forest-ac7q5w95.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const NEON_DATA_URL = 'https://ep-withered-forest-ac7q5w95.apirest.sa-east-1.aws.neon.tech/neondb/rest/v1/';

// Variable global para almacenar los datos de la farmacia
let farmaciaInfoGlobal = null;

/**
 * Inicia sesión utilizando Neon Auth
 */
async function neonLogin(email, password) {
    try {
        const response = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
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
                    credentials: 'include'
                });
                jwtToken = sessionResponse.headers.get('set-auth-jwt') || sessionResponse.headers.get('x-auth-jwt');
            } catch (e) {
                console.error('Error al intentar obtener JWT:', e);
            }
        }

        if (jwtToken) {
            sessionStorage.setItem('neonToken', jwtToken);
        } else {
            console.warn('No se pudo obtener el token JWT de Neon Auth');
        }
        
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
    const token = sessionStorage.getItem('neonToken');
    if (!token) {
        console.error('No hay token de sesión');
        return null;
    }

    try {
        // Usamos la sintaxis de PostgREST para filtrar por email
        const response = await fetch(`${NEON_DATA_URL}farmacias?email=eq.${email}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Error al obtener datos de farmacia de Neon:', response.statusText);
            return null;
        }

        const data = await response.json();
        
        // La Data API devuelve un array, tomamos el primer elemento
        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error en obtenerDatosFarmacia:', error);
        return null;
    }
}

/**
 * Carga los datos de la farmacia al iniciar la aplicación
 */
async function cargarDatosFarmacia() {
    const email = sessionStorage.getItem('userEmail');
    if (email) {
        farmaciaInfoGlobal = await obtenerDatosFarmacia(email);
        if (farmaciaInfoGlobal) {
            console.log('Datos de farmacia cargados desde Neon:', farmaciaInfoGlobal);
        } else {
            console.warn('No se pudieron cargar los datos de la farmacia para:', email);
            // Fallback a datos por defecto
            farmaciaInfoGlobal = {
                nombre: "FARMACIA - DATOS NO CONFIGURADOS",
                ubicacion: "Por favor configure sus datos en Neon"
            };
        }
    }
    return farmaciaInfoGlobal;
}

/**
 * Obtiene el email del usuario actual
 */
function obtenerEmailUsuario() {
    return sessionStorage.getItem('userEmail');
}

/**
 * Obtiene los datos de farmacia cargados globalmente
 */
function getFarmaciaInfo() {
    return farmaciaInfoGlobal;
}
