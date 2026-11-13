/**
 * Cliente HTTP REST para comunicación con el backend Java 21 Spring Boot
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMsg = data?.error || (data?.errores ? data.errores.join(', ') : `HTTP Error ${response.status}`);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Escenarios
  listarEscenarios: () => request('/escenarios'),
  obtenerEscenario: (escId) => request(`/escenarios/${escId}`),
  crearSimulacion: (escId, payload) =>
    request(`/escenarios/${escId}/simulaciones`, { method: 'POST', body: JSON.stringify(payload) }),
  actualizarSimulacion: (escId, varianteId, payload) =>
    request(`/escenarios/${escId}/simulaciones/${varianteId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  previsualizarSimulacion: (escId, variaciones, varianteId) =>
    request(`/escenarios/${escId}/simulaciones/previsualizar`, { method: 'POST', body: JSON.stringify({ variaciones, ...(varianteId ? { variante_id: varianteId } : {}) }) }),
  compararSimulacion: (escId, varianteId) =>
    request(`/escenarios/${escId}/simulaciones/${varianteId}/comparar`, { method: 'POST' }),

  // HU-01: Empresas
  guardarEmpresa: (escId, payload) =>
    request(`/escenarios/${escId}/empresas`, { method: 'POST', body: JSON.stringify(payload) }),

  // HU-02: Plantas
  guardarPlanta: (escId, payload) =>
    request(`/escenarios/${escId}/plantas`, { method: 'POST', body: JSON.stringify(payload) }),

  // HU-03: Oferta
  actualizarOferta: (escId, empId, oferta_t) =>
    request(`/escenarios/${escId}/empresas/${empId}/oferta`, { method: 'PUT', body: JSON.stringify({ oferta_t }) }),

  // HU-04: Capacidad
  actualizarCapacidad: (escId, plaId, capacidad_maxima_t) =>
    request(`/escenarios/${escId}/plantas/${plaId}/capacidad`, { method: 'PUT', body: JSON.stringify({ capacidad_maxima_t }) }),

  // HU-05: Rutas y OSRM
  consultarRutas: (escId, empId, plaId) => {
    const params = new URLSearchParams();
    if (empId && empId !== 'TODOS') params.append('empresa_id', empId);
    if (plaId && plaId !== 'TODAS') params.append('planta_id', plaId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/escenarios/${escId}/rutas${qs}`);
  },
  reintentarRutaOsrm: (escId, rutaId) =>
    request(`/escenarios/${escId}/rutas/${rutaId}/reintentar-osrm`, { method: 'POST' }),

  // HU-06: Costos de Transporte
  actualizarCostoTransporte: (escId, rutaId, payload) =>
    request(`/escenarios/${escId}/rutas/${rutaId}/costo`, { method: 'PUT', body: JSON.stringify(payload) }),

  // HU-07: Validación
  validarEscenario: (escId) =>
    request(`/escenarios/${escId}/validar`, { method: 'POST' }),
  simularInconsistencia: (escId) =>
    request(`/escenarios/${escId}/simular-inconsistencia`, { method: 'POST' }),
  corregirInconsistencias: (escId) =>
    request(`/escenarios/${escId}/corregir-inconsistencias`, { method: 'POST' }),

  // HU-08, HU-09, HU-16..HU-19: Optimización
  ejecutarOptimizacion: (escId, payload) =>
    request(`/escenarios/${escId}/optimizar`, { method: 'POST', body: JSON.stringify(payload) }),
  ajustarParametrosAg: (escId, configAg) =>
    request(`/escenarios/${escId}/ag/ajustar`, { method: 'POST', body: JSON.stringify({ config_ag: configAg }) }),

  // HU-10..HU-13: Sensibilidad
  ejecutarSensibilidad: (escId, payload) =>
    request(`/escenarios/${escId}/sensibilidad`, { method: 'POST', body: JSON.stringify(payload) }),
  analizarSensibilidadExacta: (escId, variacion) =>
    request(`/escenarios/${escId}/sensibilidad-exacta`, { method: 'POST', body: JSON.stringify(variacion) }),

  // Polling HU-18 & HU-19
  consultarEvolucionAg: (ejecucionId) =>
    request(`/optimizacion/evolucion-ag/${ejecucionId}`),

  consultarProcedimientoExacto: (ejecucionId) =>
    request(`/optimizacion/procedimiento-exacto/${ejecucionId}`),

  obtenerEjecucion: (ejecucionId) =>
    request(`/ejecuciones/${ejecucionId}`)
};
