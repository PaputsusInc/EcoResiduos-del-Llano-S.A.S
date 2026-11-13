import React, { useEffect, useState } from 'react';
import { Activity, Play, Printer, RefreshCw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { usePollingEjecucion } from '../../api/usePollingEjecucion';
import { api } from '../../api/client';

const CONFIGURACION_INICIAL = {
  tamano_poblacion: 100,
  generaciones: 200,
  tasa_cruce: 0.8,
  tasa_mutacion: 0.05,
  metodo_seleccion: 'TORNEO',
  tamano_torneo: 3,
  tipo_cruce: 'OX',
  puntos_cruce: 2,
  elitismo: 1,
  reemplazos: null,
  limite_sin_mejora: null,
  umbral_mejora_cop: 0,
  factor_penalizacion: 1000,
  escala_costo_referencia: 1000000,
  semilla: 42
};

const dinero = (valor) => valor == null
  ? 'No disponible'
  : `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP`;

const segundos = (valor) => valor == null ? '—' : `${valor.toFixed(3)} s`;

function CurvaCosto({ historial }) {
  if (historial.length < 2) {
    return <p className="text-sm text-slate-500">La curva aparecerá al recibir dos generaciones.</p>;
  }

  const costos = historial.map((registro) => registro.mejor_costo_acumulado);
  const minimo = Math.min(...costos);
  const amplitud = Math.max(...costos) - minimo || 1;
  const puntos = costos.map((costo, indice) => {
    const x = 20 + (760 * indice) / (costos.length - 1);
    const y = 140 - (110 * (costo - minimo)) / amplitud;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg className="w-full h-40 bg-slate-50 rounded-lg" viewBox="0 0 800 160" preserveAspectRatio="none" role="img" aria-label="Mejor costo acumulado por generación">
        <polyline points={puntos} fill="none" stroke="#4f46e5" strokeWidth="3" />
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Generación 0</span>
        <span>Generación {historial[historial.length - 1].numero}</span>
      </div>
    </div>
  );
}

export default function Hu18SeguimientoGeneracionesAgPage() {
  const { escenarioActivo } = useSession();
  const escenarioId = escenarioActivo?.id || 'ESC-01';
  const [ejecucionId, setEjecucionId] = useState(null);
  const [configuracionJson, setConfiguracionJson] = useState(
    JSON.stringify(CONFIGURACION_INICIAL, null, 2)
  );
  const [iniciando, setIniciando] = useState(false);
  const [errorInicio, setErrorInicio] = useState(null);
  const [inicioLocal, setInicioLocal] = useState(null);
  const [tiempoLocal, setTiempoLocal] = useState(0);
  const { data: evolucion, loading, error: errorSeguimiento } = usePollingEjecucion(
    ejecucionId, 'AG', 350
  );

  const resultado = evolucion?.resultado?.id === ejecucionId ? evolucion.resultado : null;
  const historial = resultado?.historial_generaciones || [];
  const ultimo = historial.at(-1);
  const enCurso = iniciando || (ejecucionId && !errorSeguimiento
    && (!resultado || resultado.estado === 'EN_EJECUCION'));
  const tiempoVisible = enCurso
    ? Math.max(tiempoLocal, ultimo?.tiempo_transcurrido_s || 0)
    : resultado?.tiempo_ejecucion_s ?? ultimo?.tiempo_transcurrido_s;

  useEffect(() => {
    if (!enCurso || inicioLocal == null) return undefined;
    const reloj = setInterval(() => setTiempoLocal((Date.now() - inicioLocal) / 1000), 100);
    return () => clearInterval(reloj);
  }, [enCurso, inicioLocal]);

  async function iniciarCorrida() {
    setErrorInicio(null);
    setEjecucionId(null);
    setIniciando(true);
    setInicioLocal(Date.now());
    setTiempoLocal(0);
    try {
      const configAg = JSON.parse(configuracionJson);
      if (!configAg || Array.isArray(configAg) || typeof configAg !== 'object') {
        throw new Error('La configuración debe ser un objeto JSON.');
      }
      const respuesta = await api.ejecutarOptimizacion(escenarioId, {
        metodo: 'AG',
        asincrono: true,
        config_ag: configAg
      });
      setEjecucionId(respuesta.ejecucion_id);
    } catch (error) {
      setErrorInicio(error.message);
    } finally {
      setIniciando(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Evolución del Algoritmo Genético</h2>
            <p className="text-xs text-slate-500">Escenario {escenarioId} · prioridades de empresas y plantas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={iniciarCorrida} disabled={Boolean(enCurso)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex gap-2 items-center">
            {enCurso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {enCurso ? 'Ejecutando…' : 'Iniciar AG'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 border border-slate-300 rounded-lg text-xs flex gap-2 items-center">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <label htmlFor="configuracion-ag" className="block text-sm font-bold text-slate-800 mb-2">Configuración del AG (JSON)</label>
        <p className="text-xs text-slate-500 mb-3">Ajusta torneo, cruce, elitismo, reemplazos y criterio de parada antes de iniciar.</p>
        <textarea id="configuracion-ag" value={configuracionJson} onChange={(evento) => setConfiguracionJson(evento.target.value)} rows={12} spellCheck={false} className="w-full font-mono text-xs border border-slate-300 rounded-lg p-3" />
        {(errorInicio || errorSeguimiento) && <p role="alert" className="text-sm text-red-700 mt-2">{errorInicio || errorSeguimiento}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ['Estado', resultado?.estado || (loading ? 'Consultando…' : 'Sin ejecución')],
          ['Mejor costo acumulado', dinero(ultimo?.mejor_costo_acumulado)],
          ['Generación', ultimo ? `${ultimo.numero} / ${evolucion?.max_generaciones}` : '—'],
          ['Cronómetro', segundos(tiempoVisible)]
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">{etiqueta}</div>
            <div className="text-base font-bold text-slate-800 mt-1">{valor}</div>
          </div>
        ))}
      </div>

      {resultado && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700">
          <div>Corrida: <span className="font-mono">{ejecucionId}</span></div>
          {(resultado.causa_estado || resultado.motivo_finalizacion) && (
            <div>Resultado: {resultado.causa_estado || resultado.motivo_finalizacion}</div>
          )}
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Mejor costo factible acumulado</h3>
        <CurvaCosto historial={historial} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-800 p-4">Historial por generación</h3>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">Generación</th><th className="p-3">Factibles</th>
              <th className="p-3">Mejor de generación</th><th className="p-3">Mejor acumulado</th>
              <th className="p-3">Aptitud</th><th className="p-3">Evaluaciones</th><th className="p-3">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((registro) => (
              <tr key={registro.numero} className="border-t border-slate-100">
                <td className="p-3">{registro.numero}</td>
                <td className="p-3">{registro.candidatos_factibles}</td>
                <td className="p-3">{dinero(registro.mejor_costo_factible)}</td>
                <td className="p-3 font-bold">{dinero(registro.mejor_costo_acumulado)}</td>
                <td className="p-3">{registro.mejor_aptitud?.toFixed(6) ?? '—'}</td>
                <td className="p-3">{registro.evaluaciones_acumuladas ?? '—'}</td>
                <td className="p-3">{segundos(registro.tiempo_transcurrido_s)}</td>
              </tr>
            ))}
            {historial.length === 0 && <tr><td colSpan={7} className="p-4 text-slate-500">Sin generaciones registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
