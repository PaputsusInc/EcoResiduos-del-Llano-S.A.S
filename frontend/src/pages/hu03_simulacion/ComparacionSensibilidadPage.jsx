import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Cpu, FlaskConical, GitCompare, Loader2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import BarrasMetodos from '../../components/common/BarrasMetodos';
import { crearConfiguracionAg } from '../hu05_trazabilidad/agConfiguracion';
import { leerConfiguracionAg } from '../hu05_trazabilidad/configuracionAgGuardada';

const moneda = (valor) => valor == null ? '—' : `$ ${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
const decimal = (valor, digitos = 2) => valor == null ? '—' : Number(valor).toLocaleString('es-CO', { maximumFractionDigits: digitos });
const firmado = (valor, formato) => valor == null ? '—' : `${valor > 0 ? '+' : ''}${formato(valor)}`;
const estadoComparable = (resultado) => resultado?.estado === 'OPTIMO' || resultado?.estado === 'FACTIBLE_SIN_CERTIFICAR';

function GraficaRespuesta({ referencia, variante }) {
  const grupos = [
    { nombre: 'Método exacto', color: 'bg-emerald-600', base: referencia?.resultado_exacto?.costo_total_Z, cambio: variante?.resultado_exacto?.costo_total_Z },
    { nombre: 'Algoritmo genético', color: 'bg-indigo-600', base: referencia?.resultado_genetico?.costo_total_Z, cambio: variante?.resultado_genetico?.costo_total_Z }
  ];
  const maximo = Math.max(...grupos.flatMap((grupo) => [grupo.base, grupo.cambio]).filter(Number.isFinite), 0);
  return <div className="space-y-6" aria-label="Costo de referencia y variante para ambos métodos">
    {grupos.map((grupo) => <div key={grupo.nombre} className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">{grupo.nombre}</h3>
      {[['Referencia', grupo.base, 'opacity-45'], ['Variante', grupo.cambio, '']].map(([etiqueta, valor, opacidad]) =>
        <div key={etiqueta} className="grid grid-cols-[6rem_minmax(0,1fr)_7rem] items-center gap-3 text-xs sm:grid-cols-[7rem_minmax(0,1fr)_9rem]">
          <span className="font-medium text-slate-600">{etiqueta}</span>
          <div className="h-5 overflow-hidden rounded-md bg-slate-100" aria-hidden="true"><div className={`h-full rounded-md ${grupo.color} ${opacidad}`} style={{ width: `${Number.isFinite(valor) && maximo > 0 ? valor / maximo * 100 : 0}%` }} /></div>
          <strong className="text-right font-mono text-slate-900">{moneda(valor)}</strong>
        </div>)}
      <p className="text-xs text-slate-600">Cambio: <strong className="text-slate-900">{firmado(grupo.cambio == null || grupo.base == null ? null : grupo.cambio - grupo.base, moneda)}</strong></p>
    </div>)}
  </div>;
}

function TablaMediciones({ referencia, variante }) {
  const filas = [
    ['Referencia', 'Exacto', referencia?.resultado_exacto],
    ['Referencia', 'AG', referencia?.resultado_genetico],
    ['Variante', 'Exacto', variante?.resultado_exacto],
    ['Variante', 'AG', variante?.resultado_genetico]
  ];
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm">
    <thead className="bg-slate-50 text-slate-600"><tr>
      <th className="px-4 py-3 text-left">Escenario</th><th className="px-4 py-3 text-left">Método</th><th className="px-4 py-3 text-left">Estado</th>
      <th className="px-4 py-3 text-right">Costo · COP</th><th className="px-4 py-3 text-right">Tiempo · s</th><th className="px-4 py-3 text-right">CPU · s</th><th className="px-4 py-3 text-right">Pico RAM · MB</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{filas.map(([escenario, metodo, resultado]) => <tr key={`${escenario}-${metodo}`}>
      <td className="px-4 py-3 font-semibold text-slate-800">{escenario}</td><td className="px-4 py-3 text-slate-700">{metodo}</td><td className="px-4 py-3 text-slate-600">{resultado?.estado || '—'}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">{moneda(resultado?.costo_total_Z)}</td><td className="px-4 py-3 text-right font-mono">{decimal(resultado?.tiempo_ejecucion_s, 3)}</td>
      <td className="px-4 py-3 text-right font-mono">{decimal(resultado?.cpu_tiempo_s, 3)}</td><td className="px-4 py-3 text-right font-mono">{decimal(resultado?.memoria_pico_mb, 1)}</td>
    </tr>)}</tbody>
  </table></div>;
}

export default function ComparacionSensibilidadPage() {
  const { listaEscenarios, cargarEscenarios, escenarioActivoId } = useSession();
  const variantes = listaEscenarios.filter((escenario) => escenario.referencia_id && escenario.referencia_snapshot);
  const [varianteId, setVarianteId] = useState('');
  const [resultado, setResultado] = useState(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { cargarEscenarios(); }, [cargarEscenarios]);
  useEffect(() => {
    if (!variantes.some((escenario) => escenario.id === varianteId)) {
      setVarianteId(variantes.find((escenario) => escenario.referencia_id === escenarioActivoId)?.id || variantes[0]?.id || '');
    }
  }, [escenarioActivoId, varianteId, listaEscenarios]);

  const variante = variantes.find((escenario) => escenario.id === varianteId);
  const referencia = resultado?.referencia;
  const comparada = resultado?.variante;
  const valido = referencia && comparada && [referencia.resultado_exacto, referencia.resultado_genetico, comparada.resultado_exacto, comparada.resultado_genetico].every(estadoComparable);

  async function ejecutar() {
    if (!variante) return;
    setEjecutando(true); setError(''); setResultado(null);
    try {
      const config = crearConfiguracionAg(leerConfiguracionAg(variante.referencia_id));
      setResultado(await api.compararMetodosSimulacion(variante.referencia_id, variante.id, config));
    } catch (fallo) { setError(fallo.message); }
    finally { setEjecutando(false); }
  }

  return <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-7"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-lg md:px-9 md:py-9">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><GitCompare size={17} aria-hidden="true" /> Sensibilidad comparada</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">Cómo responde cada método al cambio</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Elige una variante guardada. Ejecutaremos el método exacto y el AG en su referencia original y en la variante para comparar costo, GAP y recursos medidos.</p>
    </header>

    <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" aria-label="Ejecutar análisis">
      <div className="space-y-3"><label htmlFor="variante-sensibilidad" className="block text-sm font-bold text-slate-900">Escenario que quieres analizar</label>
        <select id="variante-sensibilidad" value={varianteId} onChange={(evento) => { setVarianteId(evento.target.value); setResultado(null); setError(''); }} disabled={!variantes.length || ejecutando} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200">
          {!variantes.length && <option value="">Aún no hay variantes guardadas</option>}
          {variantes.map((escenario) => <option key={escenario.id} value={escenario.id}>{escenario.nombre} · {escenario.referencia_id}</option>)}
        </select>
        {variante && <p className="text-xs text-slate-600">{variante.variaciones?.length || 0} cambios · se usa la referencia conservada al crear esta variante.</p>}
      </div>
      <button type="button" onClick={ejecutar} disabled={!variante || ejecutando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{ejecutando ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{ejecutando ? 'Ejecutando cuatro cálculos…' : 'Ejecutar ambos métodos'}</button>
    </section>

    {!variantes.length && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><FlaskConical className="mx-auto text-slate-400" size={30} aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900">Crea primero una variante</h2><p className="mt-1 text-sm text-slate-600">Define cambios de costo, oferta o capacidad en el laboratorio.</p><Link to="/simulacion" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-800">Ir al laboratorio <ArrowRight size={16} /></Link></section>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</p>}
    {!resultado && variantes.length > 0 && !ejecutando && !error && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><BarChart3 className="mx-auto text-slate-400" size={30} aria-hidden="true" /><p className="mt-3 font-semibold text-slate-800">La comparación aparecerá aquí</p><p className="mt-1 text-sm text-slate-600">El cálculo comienza al pulsar el botón.</p></section>}

    {resultado && <div className="space-y-6" aria-live="polite">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambio de costo · exacto</p><p className="mt-2 text-xl font-bold text-slate-950">{firmado(comparada.resultado_exacto?.costo_total_Z == null || referencia.resultado_exacto?.costo_total_Z == null ? null : comparada.resultado_exacto.costo_total_Z - referencia.resultado_exacto.costo_total_Z, moneda)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambio de costo · AG</p><p className="mt-2 text-xl font-bold text-slate-950">{firmado(comparada.resultado_genetico?.costo_total_Z == null || referencia.resultado_genetico?.costo_total_Z == null ? null : comparada.resultado_genetico.costo_total_Z - referencia.resultado_genetico.costo_total_Z, moneda)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">GAP del AG frente al óptimo</p><p className="mt-2 text-xl font-bold text-slate-950">{decimal(referencia.porcentaje_gap)} % <ArrowRight className="inline text-slate-400" size={17} aria-hidden="true" /> {decimal(comparada.porcentaje_gap)} %</p></div>
      </section>
      {!valido && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Uno de los resultados no es comparable. Revisa los estados y causas en la tabla antes de interpretar los cambios.</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm"><h2 className="font-bold text-slate-950">Respuesta del costo</h2><p className="mt-1 mb-6 text-sm text-slate-600">Cuatro costos sobre la misma escala. La barra tenue representa la referencia.</p><GraficaRespuesta referencia={referencia} variante={comparada} /></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm"><h2 className="font-bold text-slate-950">Recursos en la variante</h2><p className="mt-1 mb-6 text-sm text-slate-600">Cada motor se ejecuta en un proceso Python independiente.</p><div className="space-y-6"><BarrasMetodos titulo="Tiempo transcurrido" exacto={comparada.resultado_exacto?.tiempo_ejecucion_s} ag={comparada.resultado_genetico?.tiempo_ejecucion_s} unidad="s" /><BarrasMetodos titulo="Tiempo de CPU" exacto={comparada.resultado_exacto?.cpu_tiempo_s} ag={comparada.resultado_genetico?.cpu_tiempo_s} unidad="s" /><BarrasMetodos titulo="Memoria residente máxima" exacto={comparada.resultado_exacto?.memoria_pico_mb} ag={comparada.resultado_genetico?.memoria_pico_mb} unidad="MB" /></div></section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm"><div className="flex items-start gap-3"><Activity className="mt-0.5 text-emerald-700" size={19} aria-hidden="true" /><div><h2 className="font-bold text-slate-950">Resultados completos</h2><p className="mt-1 text-sm text-slate-600">Valores de las cuatro ejecuciones para comprobar la gráfica y los estados.</p></div></div><div className="mt-5"><TablaMediciones referencia={referencia} variante={comparada} /></div><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><Cpu size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> CPU es tiempo acumulado y RAM es el máximo residente de cada proceso Python, no el consumo total del computador. Una ejecución por caso sirve para explorar; compara varias ejecuciones para sacar conclusiones de rendimiento.</p></section>
      <Link to="/simulacion" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-800">Editar cambios en el laboratorio <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>}
  </div></main>;
}
