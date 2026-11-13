import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownRight, Clock3, Play, Printer, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { usePollingEjecucion } from '../../api/usePollingEjecucion';
import { api } from '../../api/client';
import { crearConfiguracionAg, validarConfiguracion } from './agConfiguracion';
import { leerConfiguracionAg } from './configuracionAgGuardada';
import CurvaCostoAg from './CurvaCostoAg';

const dinero = (valor) => Number.isFinite(valor)
  ? `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP`
  : 'Sin dato';
const segundos = (valor) => Number.isFinite(valor) ? `${valor.toFixed(2)} s` : '—';
const numero = (valor) => Number.isFinite(valor) ? valor.toLocaleString('es-CO') : '—';
// Conserva la clave previa para recuperar ejecuciones guardadas en el navegador.
const claveUltimaEjecucion = (escenarioId) => `ecoresiduos:ag:ultima-corrida:${escenarioId}`;
function leerUltimaEjecucion(escenarioId) {
  try { return window.localStorage.getItem(claveUltimaEjecucion(escenarioId)); } catch { return null; }
}
function guardarUltimaEjecucion(escenarioId, ejecucionId) {
  try { window.localStorage.setItem(claveUltimaEjecucion(escenarioId), ejecucionId); } catch { /* La ejecución sigue visible en esta sesión. */ }
}
function olvidarUltimaEjecucion(escenarioId) {
  try { window.localStorage.removeItem(claveUltimaEjecucion(escenarioId)); } catch { /* El almacenamiento es opcional. */ }
}

export default function Hu18SeguimientoGeneracionesAgPage() {
  const { escenarioActivo } = useSession();
  const escenarioId = escenarioActivo?.id || 'ESC-01';
  const [config, setConfig] = useState(() => leerConfiguracionAg(escenarioId));
  const [ejecucionId, setEjecucionId] = useState(() => leerUltimaEjecucion(escenarioId));
  const [iniciando, setIniciando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [inicioLocal, setInicioLocal] = useState(null);
  const [tiempoLocal, setTiempoLocal] = useState(0);
  const errorRef = useRef(null);
  const escenarioActualRef = useRef(escenarioId);
  escenarioActualRef.current = escenarioId;
  const { data: evolucion, loading, error: errorSeguimiento, errorStatus } = usePollingEjecucion(ejecucionId, 'AG', 350);
  const resultado = evolucion?.resultado?.id === ejecucionId ? evolucion.resultado : null;
  const historial = resultado?.historial_generaciones || [];
  const ultimo = historial.at(-1);
  const enCurso = iniciando || (ejecucionId && !errorSeguimiento && (!resultado || resultado.estado === 'EN_EJECUCION'));
  const tiempoVisible = enCurso ? Math.max(tiempoLocal, ultimo?.tiempo_transcurrido_s || 0)
    : resultado?.tiempo_ejecucion_s ?? ultimo?.tiempo_transcurrido_s;
  const progreso = ultimo && evolucion?.max_generaciones
    ? Math.min(100, (ultimo.numero / evolucion.max_generaciones) * 100) : 0;
  const filas = mostrarTodo ? [...historial].reverse() : historial.slice(-8).reverse();
  const estados = {
    EN_EJECUCION: 'En ejecución',
    FACTIBLE_SIN_CERTIFICAR: 'Plan factible',
    SIN_CANDIDATO_FACTIBLE_AG: 'Sin plan factible',
    ERROR_EJECUCION: 'Error de ejecución'
  };

  useEffect(() => {
    if (!enCurso || inicioLocal == null) return undefined;
    const reloj = setInterval(() => setTiempoLocal((Date.now() - inicioLocal) / 1000), 100);
    return () => clearInterval(reloj);
  }, [enCurso, inicioLocal]);

  useEffect(() => { if (errorAccion) errorRef.current?.focus(); }, [errorAccion]);
  useEffect(() => {
    setEjecucionId(leerUltimaEjecucion(escenarioId));
    setMostrarTodo(false);
    setConfig(leerConfiguracionAg(escenarioId));
    setErrorAccion(null);
  }, [escenarioId]);

  useEffect(() => {
    if (errorStatus === 404 && ejecucionId) {
      olvidarUltimaEjecucion(escenarioId);
      setEjecucionId(null);
    }
  }, [errorStatus, ejecucionId, escenarioId]);

  function configuracionValidada() {
    if (Object.keys(validarConfiguracion(config)).length) {
      setErrorAccion('La configuración guardada no es válida. Revísala en Ajuste de parámetros AG.');
      return null;
    }
    return crearConfiguracionAg(config);
  }

  async function iniciarEjecucion() {
    setErrorAccion(null);
    const configAg = configuracionValidada();
    if (!configAg) return;
    setIniciando(true);
    setInicioLocal(Date.now());
    setTiempoLocal(0);
    setMostrarTodo(false);
    try {
      const respuesta = await api.ejecutarOptimizacion(escenarioId, {
        metodo: 'AG', asincrono: true, config_ag: configAg
      });
      if (escenarioActualRef.current === escenarioId) {
        guardarUltimaEjecucion(escenarioId, respuesta.ejecucion_id);
        setEjecucionId(respuesta.ejecucion_id);
      }
    } catch (error) {
      if (escenarioActualRef.current === escenarioId) setErrorAccion(error.message);
    } finally {
      setIniciando(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Activity aria-hidden="true" className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Optimización · Escenario {escenarioId}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Evolución del algoritmo genético</h1>
                <p className="mt-1 text-sm text-slate-600">Inicia la ejecución con los parámetros elegidos y observa cómo mejora el costo generación por generación.</p>
              </div>
            </div>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              <Printer aria-hidden="true" className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </header>

        <section aria-labelledby="configuracion-titulo" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Próxima ejecución</p>
              <h2 id="configuracion-titulo" className="mt-1 text-lg font-bold text-slate-950">Parámetros listos para ejecutar</h2>
              <p className="mt-1 text-sm text-slate-600">La próxima ejecución utilizará los valores guardados para {escenarioId}.</p>
            </div>
            <Link to="/ajuste-ag" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Editar o ajustar parámetros</Link>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Población', numero(Number(config.tamano_poblacion))],
              ['Máximo de generaciones', numero(Number(config.generaciones))],
              ['Probabilidad de cruce', `${config.tasa_cruce_pct} %`],
              ['Probabilidad de mutación', `${config.tasa_mutacion_pct} %`]
            ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-semibold text-slate-500">{etiqueta}</dt><dd className="mt-1 text-base font-bold text-slate-900">{valor}</dd>
            </div>)}
          </dl>
          {errorAccion && <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{errorAccion}</p>}
          {errorSeguimiento && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{errorSeguimiento}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={iniciarEjecucion} disabled={Boolean(enCurso)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {enCurso ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Play aria-hidden="true" className="h-4 w-4" />}
              {enCurso ? 'Ejecutando AG…' : 'Iniciar AG'}
            </button>
            <p className="text-xs text-slate-500">El ajuste de parámetros se realiza en su sección antes de iniciar esta ejecución.</p>
          </div>
        </section>

        <section aria-labelledby="seguimiento-titulo" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 id="seguimiento-titulo" className="text-lg font-bold text-slate-950">Seguimiento de la ejecución</h2>
              <p className="text-sm text-slate-600">Resultados de la última ejecución del AG iniciada aquí para este escenario.</p></div>
            {ejecucionId && <span className="font-mono text-xs text-slate-500">ID {ejecucionId}</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Estado', resultado ? estados[resultado.estado] || resultado.estado : (loading ? 'Consultando…' : 'Sin ejecutar'), Activity],
              ['Mejor costo', dinero(ultimo?.mejor_costo_acumulado), ArrowDownRight],
              ['Generación', ultimo ? `${ultimo.numero} de ${evolucion?.max_generaciones || '—'}` : '—', SlidersHorizontal],
              ['Tiempo transcurrido', segundos(tiempoVisible), Clock3]
            ].map(([etiqueta, valor, Icono]) => <div key={etiqueta} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500"><Icono aria-hidden="true" className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">{etiqueta}</span></div>
              <p className="mt-3 text-lg font-bold leading-tight text-slate-950">{valor}</p>
            </div>)}
          </div>
          {ejecucionId && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between text-sm"><span className="font-semibold text-slate-800">Avance por generaciones</span><span className="text-slate-600">{Math.round(progreso)} %</span></div>
            <div role="progressbar" aria-valuenow={ultimo?.numero || 0} aria-valuemin={0} aria-valuemax={evolucion?.max_generaciones || Number(config.generaciones)} aria-label="Generaciones ejecutadas"
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${progreso}%` }} /></div>
            {resultado?.motivo_finalizacion && <p className="mt-3 text-sm text-slate-600">{resultado.motivo_finalizacion}</p>}
            {resultado?.causa_estado && <p className="mt-2 text-sm font-medium text-red-700">{resultado.causa_estado}</p>}
          </div>}
        </section>

        <CurvaCostoAg historial={historial} enCurso={Boolean(enCurso)} onIniciar={iniciarEjecucion} />

        <section aria-labelledby="historial-titulo" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5">
            <div><h2 id="historial-titulo" className="text-base font-bold text-slate-950">Generaciones registradas</h2>
              <p className="mt-1 text-sm text-slate-600">Más recientes primero. La generación 0 corresponde a la población inicial.</p></div>
            {historial.length > 8 && <button type="button" onClick={() => setMostrarTodo((actual) => !actual)}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              {mostrarTodo ? 'Ver solo las recientes' : `Ver las ${numero(historial.length)} generaciones`}
            </button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr><th scope="col" className="px-6 py-3">Generación</th><th scope="col" className="px-4 py-3">Mejor de esta generación</th>
                  <th scope="col" className="px-4 py-3">Mejor acumulado</th><th scope="col" className="px-4 py-3">Planes factibles</th>
                  <th scope="col" className="px-4 py-3">Evaluaciones</th><th scope="col" className="px-4 py-3">Tiempo</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((registro) => <tr key={registro.numero} className="hover:bg-slate-50">
                  <th scope="row" className="px-6 py-3 font-semibold text-slate-900">{registro.numero}</th>
                  <td className="px-4 py-3 text-slate-700">{dinero(registro.mejor_costo_factible)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-800">{dinero(registro.mejor_costo_acumulado)}</td>
                  <td className="px-4 py-3 text-slate-700">{numero(registro.candidatos_factibles)}</td>
                  <td className="px-4 py-3 text-slate-700">{numero(registro.evaluaciones_acumuladas)}</td>
                  <td className="px-4 py-3 text-slate-700">{segundos(registro.tiempo_transcurrido_s)}</td>
                </tr>)}
                {historial.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">Inicia el AG para registrar la población inicial y las generaciones siguientes.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
