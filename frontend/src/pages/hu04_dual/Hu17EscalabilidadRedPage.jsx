import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Maximize2, Play } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import BarrasMetodos from '../../components/common/BarrasMetodos';
import { crearConfiguracionAg } from '../hu05_trazabilidad/agConfiguracion';
import { leerConfiguracionAg } from '../hu05_trazabilidad/configuracionAgGuardada';

const REDES = ['ESC-01', 'ESC-AMP-20x6', 'ESC-AMP-30x8'];
const entero = (valor) => Number(valor || 0).toLocaleString('es-CO');
const dinero = (valor) => `$ ${entero(valor)} COP`;
const decimal = (valor, digitos = 3) => valor == null ? '—' : Number(valor).toLocaleString('es-CO', { maximumFractionDigits: digitos });

function TarjetaRed({ reporte }) {
  const exacto = reporte.resultado_exacto || {};
  const ag = reporte.resultado_genetico || {};
  const dimension = `${reporte.cantidad_empresas} × ${reporte.cantidad_plantas}`;
  const valida = exacto.estado === 'OPTIMO' && ag.estado === 'FACTIBLE_SIN_CERTIFICAR';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Red {dimension}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{reporte.escenario_id}</h2>
          <p className="mt-1 text-xs text-slate-500">{entero(reporte.cantidad_empresas * reporte.cantidad_plantas)} pares origen–destino posibles</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${valida ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          {valida ? `GAP ${decimal(reporte.porcentaje_gap, 2)} %` : 'Revisar estados'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-900">Exacto · {exacto.estado || 'Sin resultado'}</p>
          <p className="mt-2 text-lg font-bold text-emerald-950">{exacto.costo_total_Z == null ? '—' : dinero(exacto.costo_total_Z)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-semibold text-indigo-900">AG · {ag.estado || 'Sin resultado'}</p>
          <p className="mt-2 text-lg font-bold text-indigo-950">{ag.costo_total_Z == null ? '—' : dinero(ag.costo_total_Z)}</p>
        </div>
      </div>

      {exacto.costo_total_Z != null && ag.costo_total_Z != null && <BarrasMetodos titulo="Costo logístico" exacto={exacto.costo_total_Z} ag={ag.costo_total_Z} formato={dinero} />}
      <div className="grid gap-5 border-t border-slate-100 pt-4 xl:grid-cols-3">
        <BarrasMetodos titulo="Tiempo de ejecución" exacto={exacto.tiempo_ejecucion_s} ag={ag.tiempo_ejecucion_s} unidad="s" />
        <BarrasMetodos titulo="CPU del proceso" exacto={exacto.cpu_tiempo_s} ag={ag.cpu_tiempo_s} unidad="s" />
        <BarrasMetodos titulo="Memoria residente pico" exacto={exacto.memoria_pico_mb} ag={ag.memoria_pico_mb} unidad="MB" />
      </div>
      {!valida && <p className="text-xs text-amber-900">{exacto.causa_estado || ag.causa_estado || 'Uno de los métodos no produjo un plan comparable.'}</p>}
    </article>
  );
}

export default function Hu17EscalabilidadRedPage() {
  const { listaEscenarios } = useSession();
  const [config, setConfig] = useState(() => leerConfiguracionAg('ESC-01'));
  const [reportes, setReportes] = useState(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setConfig(leerConfiguracionAg('ESC-01')), []);

  async function medir() {
    setEjecutando(true);
    setError('');
    setReportes(null);
    try {
      const respuesta = await api.ejecutarOptimizacion('ESC-01', {
        metodo: 'ESCALABILIDAD',
        escenarios_ids: REDES,
        config_ag: crearConfiguracionAg(config)
      });
      setReportes(respuesta.reportes || []);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEjecutando(false);
    }
  }

  const disponibles = REDES.every((id) => listaEscenarios.some((escenario) => escenario.id === id));
  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-emerald-300"><Maximize2 className="h-5 w-5" aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-widest">Comparación por tamaño</span></div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Escalabilidad de la red</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">Ejecuta ambos métodos en tres redes reales del proyecto. Los costos, tiempos y recursos aparecen al terminar cada comparación.</p>
            </div>
            <button type="button" onClick={medir} disabled={ejecutando || !disponibles}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50">
              {ejecutando ? <Activity className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {ejecutando ? 'Ejecutando tres redes…' : 'Medir escalabilidad'}
            </button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {REDES.map((id, indice) => <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{indice + 1}. Red de prueba</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-900">{id}</p>
          </div>)}
        </div>
        {!disponibles && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Falta una red de prueba. Carga los escenarios semilla antes de medir.</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {!reportes && !ejecutando && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Database className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-900">Todavía no hay mediciones de esta sesión</p>
          <p className="mt-1 text-sm text-slate-600">Pulsa «Medir escalabilidad» para ejecutar los motores.</p>
        </div>}
        {ejecutando && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">Se están resolviendo las redes 10×4, 20×6 y 30×8. El resultado se mostrará al finalizar.</p>}
        {reportes && <section aria-live="polite" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-slate-950">Resultados medidos</h2><p className="mt-1 text-sm text-slate-600">Una ejecución por red, con la misma configuración genética guardada para ESC-01.</p></div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{reportes.length} redes completadas</span>
          </div>
          {reportes.map((reporte) => <TarjetaRed key={reporte.escenario_id} reporte={reporte} />)}
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600"><Cpu className="mr-1 inline h-4 w-4" aria-hidden="true" />CPU es tiempo acumulado del proceso Python; memoria es su máximo residente. No representan el consumo total del equipo. Los tiempos de una ejecución varían entre equipos; para afirmar tendencias de velocidad se necesitan varias repeticiones.</p>
        </section>}
      </div>
    </main>
  );
}
