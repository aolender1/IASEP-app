// Configuración de Neon
const NEON_AUTH_URL = 'https://ep-withered-forest-ac7q5w95.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const NEON_DATA_URL = 'https://wandering-dream-60363098.sa-east-1.aws.neon.tech/v1/projects/wandering-dream-60363098/branches/production/databases/neondb/';

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
        
        // Guardar el token para futuras peticiones a la Data API
        if (data.token) {
            sessionStorage.setItem('neonToken', data.token);
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
