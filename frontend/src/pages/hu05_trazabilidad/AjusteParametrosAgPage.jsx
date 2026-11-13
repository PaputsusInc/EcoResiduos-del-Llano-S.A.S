import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { aplicarRecomendacion, crearConfiguracionAg, validarConfiguracion } from './agConfiguracion';
import { guardarConfiguracionAg, leerConfiguracionAg } from './configuracionAgGuardada';

const numero = (valor) => Number.isFinite(valor) ? valor.toLocaleString('es-CO') : '—';
const dinero = (valor) => Number.isFinite(valor)
  ? `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP` : 'Sin dato';
const campoClase = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

function Campo({ id, titulo, ayuda, valor, cambiar, error, min, max, step = 1, sufijo }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{titulo}</label>
      <p id={`${id}-ayuda`} className="mt-0.5 text-xs leading-5 text-slate-500">{ayuda}</p>
      <div className="relative">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step}
          value={valor} onChange={(evento) => cambiar(evento.target.value)}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-ayuda`}
          className={`${campoClase} ${sufijo ? 'pr-12' : ''} ${error ? 'border-red-500 focus:border-red-600 focus:ring-red-100' : ''}`} />
        {sufijo && <span aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{sufijo}</span>}
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

export default function AjusteParametrosAgPage() {
  const { escenarioActivo } = useSession();
  const escenarioId = escenarioActivo?.id || 'ESC-01';
  const navegar = useNavigate();
  const [config, setConfig] = useState(() => leerConfiguracionAg(escenarioId));
  const [errores, setErrores] = useState({});
  const [ajustando, setAjustando] = useState(false);
  const [ajuste, setAjuste] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const errorRef = useRef(null);
  const ajusteRef = useRef(null);
  const escenarioActualRef = useRef(escenarioId);
  escenarioActualRef.current = escenarioId;

  useEffect(() => {
    setConfig(leerConfiguracionAg(escenarioId));
    setErrores({});
    setAjuste(null);
    setErrorAccion(null);
  }, [escenarioId]);
  useEffect(() => { if (errorAccion) errorRef.current?.focus(); }, [errorAccion]);
  useEffect(() => { if (ajuste) ajusteRef.current?.focus(); }, [ajuste]);

  function cambiar(clave, valor) {
    setConfig((anterior) => ({ ...anterior, [clave]: valor }));
    setErrores((anterior) => ({ ...anterior, [clave]: undefined }));
    setAjuste(null);
    setErrorAccion(null);
  }

  function configuracionValidada() {
    const erroresActuales = validarConfiguracion(config);
    setErrores(erroresActuales);
    if (Object.keys(erroresActuales).length) {
      setErrorAccion('Revisa los campos marcados antes de continuar.');
      document.getElementById(Object.keys(erroresActuales)[0])?.focus();
      return null;
    }
    return crearConfiguracionAg(config);
  }

  function guardarEIr(configElegida) {
    try {
      guardarConfiguracionAg(escenarioId, configElegida);
      navegar('/evolucion-ag');
    } catch (error) {
      setErrorAccion(error.message);
    }
  }

  async function ajustarParametros() {
    setErrorAccion(null);
    const configAg = configuracionValidada();
    if (!configAg) return;
    setAjustando(true);
    setAjuste(null);
    try {
      const respuesta = await api.ajustarParametrosAg(escenarioId, configAg);
      if (escenarioActualRef.current === escenarioId) setAjuste(respuesta);
    } catch (error) {
      if (escenarioActualRef.current === escenarioId) setErrorAccion(error.message);
    } finally {
      setAjustando(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><SlidersHorizontal aria-hidden="true" className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Algoritmo genético · Escenario {escenarioId}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Ajuste de parámetros del AG</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Define los valores de la búsqueda o solicita una recomendación para el escenario actual. Después podrás ejecutar el AG y seguir su evolución.</p>
            </div>
          </div>
        </header>

        <section aria-labelledby="configuracion-titulo" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><SlidersHorizontal aria-hidden="true" className="h-5 w-5" /></div>
            <div>
              <h2 id="configuracion-titulo" className="text-lg font-bold text-slate-950">Parámetros de búsqueda</h2>
              <p className="mt-1 text-sm text-slate-600">Los valores que guardes se aplicarán a la próxima ejecución de este escenario.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Campo id="tamano_poblacion" titulo="Población" ayuda="Planes evaluados al comenzar." valor={config.tamano_poblacion} cambiar={(v) => cambiar('tamano_poblacion', v)} error={errores.tamano_poblacion} min={2} />
            <Campo id="generaciones" titulo="Máximo de generaciones" ayuda="Límite de ciclos de mejora." valor={config.generaciones} cambiar={(v) => cambiar('generaciones', v)} error={errores.generaciones} min={1} />
            <Campo id="tasa_cruce_pct" titulo="Probabilidad de cruce" ayuda="Combina prioridades de dos planes." valor={config.tasa_cruce_pct} cambiar={(v) => cambiar('tasa_cruce_pct', v)} error={errores.tasa_cruce_pct} min={0} max={100} step={0.1} sufijo="%" />
            <Campo id="tasa_mutacion_pct" titulo="Probabilidad de mutación" ayuda="Introduce variaciones en los planes." valor={config.tasa_mutacion_pct} cambiar={(v) => cambiar('tasa_mutacion_pct', v)} error={errores.tasa_mutacion_pct} min={0} max={100} step={0.1} sufijo="%" />
          </div>
          <details className="group mt-6 rounded-xl border border-slate-200 bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              Opciones avanzadas y valores del motor <ChevronDown aria-hidden="true" className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Campo id="tamano_torneo" titulo="Tamaño del torneo" ayuda="Candidatos que compiten para ser padres." valor={config.tamano_torneo} cambiar={(v) => cambiar('tamano_torneo', v)} error={errores.tamano_torneo} min={1} />
                <Campo id="elitismo" titulo="Planes protegidos" ayuda="Mejores planes que no se reemplazan." valor={config.elitismo} cambiar={(v) => cambiar('elitismo', v)} error={errores.elitismo} min={0} />
                <Campo id="reemplazos" titulo="Reemplazos por generación" ayuda="Vacío: mitad de los lugares no protegidos." valor={config.reemplazos} cambiar={(v) => cambiar('reemplazos', v)} error={errores.reemplazos} min={1} />
                <Campo id="limite_sin_mejora" titulo="Parar tras generaciones sin mejora" ayuda="Vacío: continuar hasta el máximo." valor={config.limite_sin_mejora} cambiar={(v) => cambiar('limite_sin_mejora', v)} error={errores.limite_sin_mejora} min={1} />
                <Campo id="semilla" titulo="Semilla de la ejecución" ayuda="Igual semilla permite repetir la búsqueda." valor={config.semilla} cambiar={(v) => cambiar('semilla', v)} error={errores.semilla} min={0} />
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuración técnica aplicada</p>
                <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="text-slate-500">Selección</dt><dd className="font-semibold text-slate-800">Torneo</dd></div>
                  <div><dt className="text-slate-500">Cruce</dt><dd className="font-semibold text-slate-800">Orden (OX) · 2 puntos</dd></div>
                  <div><dt className="text-slate-500">Escala de referencia</dt><dd className="font-semibold text-slate-800">$ 1.000.000 COP</dd></div>
                </dl>
              </div>
            </div>
          </details>
          {errorAccion && <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{errorAccion}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => { if (configuracionValidada()) guardarEIr(config); }} disabled={ajustando}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              Guardar e ir a evolución <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" onClick={ajustarParametros} disabled={ajustando}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-700 px-5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {ajustando ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              {ajustando ? 'Buscando configuración…' : 'Ajustar parámetros'}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">El ajuste se ejecuta solo al pulsar «Ajustar parámetros»: prueba 12 configuraciones con dos semillas cada una. El seguimiento del AG se inicia por separado en Evolución.</p>
        </section>

        {ajuste && <section aria-labelledby="ajuste-titulo" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div className="flex-1">
              <h2 id="ajuste-titulo" ref={ajusteRef} tabIndex={-1} className="text-base font-bold text-emerald-950 outline-none">Configuración sugerida para {escenarioId}</h2>
              <p className="mt-1 text-sm text-emerald-900">Menor costo medio entre {ajuste.ensayos_completados} configuraciones probadas · {ajuste.semillas_por_ensayo} semillas por configuración · presupuesto de {numero(ajuste.presupuesto_evaluaciones)} evaluaciones por semilla.</p>
              <div className="mt-3 grid gap-2 text-sm text-emerald-950 sm:grid-cols-3">
                <span>Costo medio: <strong>{dinero(ajuste.mejor_costo_promedio)}</strong></span>
                <span>Mutación: <strong>{Math.round(ajuste.config_ag.tasa_mutacion * 1000) / 10} %</strong></span>
                <span>Cruce: <strong>{Math.round(ajuste.config_ag.tasa_cruce * 1000) / 10} %</strong></span>
              </div>
              <button type="button" onClick={() => guardarEIr(aplicarRecomendacion(config, ajuste.config_ag))}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                Usar esta configuración <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
              <p className="mt-2 text-xs text-emerald-900">La sugerencia se basa en un presupuesto finito. Al usarla irás a Evolución para iniciar el AG; no garantiza el óptimo global.</p>
            </div>
          </div>
        </section>}
      </div>
    </main>
  );
}
