// Configuración de Supabase
const SUPABASE_URL = 'https://ovhenvckpzcjzrlpkanb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aGVudmNrcHpjanpybHBrYW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MDQwNTYsImV4cCI6MjA1NjE4MDA1Nn0.L-RLxTg2cKiLK7lOwAq64uAAD_c2hSMw3GWih2Rdsiw';

// Crear cliente de Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Variable global para almacenar los datos de la farmacia
let farmaciaInfoGlobal = null;

// Función para obtener datos de la farmacia según el email del usuario
async function obtenerDatosFarmacia(email) {
    if (!supabaseClient) {
        console.error('Supabase no está inicializado');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('farmacias')
            .select('nombre, ubicacion')
            .eq('email', email)
            .single();

        if (error) {
            console.error('Error al obtener datos de farmacia:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Función para cargar los datos de la farmacia al iniciar
async function cargarDatosFarmacia() {
    const email = sessionStorage.getItem('userEmail');
    if (email) {
        farmaciaInfoGlobal = await obtenerDatosFarmacia(email);
        if (farmaciaInfoGlobal) {
            console.log('Datos de farmacia cargados:', farmaciaInfoGlobal);
        } else {
            console.warn('No se pudieron cargar los datos de la farmacia para:', email);
            // Fallback a datos por defecto si no se encuentran
            farmaciaInfoGlobal = {
                nombre: "FARMACIA - DATOS NO CONFIGURADOS",
                ubicacion: "Por favor configure sus datos en Supabase"
            };
        }
    }
    return farmaciaInfoGlobal;
}

// Función para obtener el email del usuario actual
function obtenerEmailUsuario() {
    return sessionStorage.getItem('userEmail');
}

// Función para obtener los datos de farmacia (uso global)
function getFarmaciaInfo() {
    return farmaciaInfoGlobal;
}
