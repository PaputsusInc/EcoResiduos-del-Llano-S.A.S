import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, ChevronRight, FlaskConical, Layers3, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

const nuevaVariacion = () => ({ tipo: 'COSTOS', nodo_id: '', porcentaje: '10' });
const numero = (valor, decimales = 1) => valor == null ? '—' : Number(valor).toLocaleString('es-CO', { maximumFractionDigits: decimales });
const limite = (valor) => valor == null ? 'Sin límite' : numero(valor);
const dinero = (valor) => valor == null ? '—' : `$ ${numero(valor, 0)} COP`;
const tipos = { COSTOS: 'Costo de transporte', OFERTA: 'Oferta semanal', CAPACIDAD: 'Capacidad de planta' };

function TarjetaMetrica({ titulo, valor, nota, tono = 'slate' }) {
  const fondos = { slate: 'bg-slate-50 border-slate-200', emerald: 'bg-emerald-50 border-emerald-200', rose: 'bg-rose-50 border-rose-200' };
  return <div className={`rounded-2xl border p-4 ${fondos[tono]}`}>
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
    <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 break-words">{valor}</p>
    {nota && <p className="mt-1 text-xs text-slate-600">{nota}</p>}
  </div>;
}

function TablaImpacto({ cambios }) {
  const filas = Object.entries(cambios || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (!filas.length) return <p className="text-sm text-slate-600">La asignación de rutas no cambió.</p>;
  return <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 text-left font-semibold">Ruta</th><th className="px-4 py-3 text-right font-semibold">Cambio de flujo</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filas.map(([ruta, delta]) => <tr key={ruta}><td className="px-4 py-3 font-medium text-slate-800">{ruta}</td><td className={`px-4 py-3 text-right font-semibold ${delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{delta > 0 ? '+' : ''}{numero(delta, 2)} t</td></tr>)}</tbody>
    </table>
  </div>;
}

export default function LaboratorioSimulacionPage() {
  const { escenarioActivoId, listaEscenarios, cargarEscenarios, cambiarEscenario } = useSession();
  const [baseId, setBaseId] = useState(escenarioActivoId);
  const [nombre, setNombre] = useState('');
  const [variaciones, setVariaciones] = useState([nuevaVariacion()]);
  const [vista, setVista] = useState('escenarios');
  const [comparacion, setComparacion] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const base = listaEscenarios.find(esc => esc.id === baseId);
  const guardados = listaEscenarios.filter(esc => esc.referencia_id === baseId);
  const empresas = base?.empresas || [];
  const plantas = base?.plantas || [];

  useEffect(() => { setBaseId(escenarioActivoId); }, [escenarioActivoId]);
  useEffect(() => {
    setComparacion(null); setSeleccionado(null); setEditandoId(null); setError(''); setAviso('');
  }, [baseId]);

  function nuevoEscenario() {
    setEditandoId(null); setNombre(''); setVariaciones([nuevaVariacion()]);
    setComparacion(null); setSeleccionado(null); setError(''); setAviso('');
  }

  function editarEscenario(escenario) {
    setEditandoId(escenario.id);
    setNombre(escenario.nombre);
    setVariaciones((escenario.variaciones || []).map(v => ({
      tipo: v.tipo, nodo_id: v.nodo_id || '', porcentaje: String(v.porcentaje)
    })));
    setSeleccionado(escenario); setComparacion(null); setError('');
    setAviso('Editando una variante guardada. Los cambios se aplicarán sobre su referencia original.');
  }

  function cambiarVariacion(indice, campo, valor) {
    setVariaciones(actual => actual.map((fila, i) => i === indice
      ? { ...fila, [campo]: valor, ...(campo === 'tipo' ? { nodo_id: '' } : {}) } : fila));
    setComparacion(null); setSeleccionado(null); setAviso('');
  }

  function prepararVariaciones() {
    return variaciones.map(fila => ({
      tipo: fila.tipo,
      porcentaje: Number(fila.porcentaje),
      ...(fila.nodo_id ? { nodo_id: fila.nodo_id } : {})
    }));
  }

  async function ejecutar(accion) {
    setCargando(accion); setError(''); setAviso('');
    try {
      if (accion === 'previsualizar') {
        const respuesta = await api.previsualizarSimulacion(baseId, prepararVariaciones(), editandoId);
        setComparacion(respuesta); setSeleccionado(null);
        setAviso('Vista previa calculada. El escenario base no cambió.');
      } else {
        const creado = editandoId
          ? await api.actualizarSimulacion(baseId, editandoId, { nombre: nombre.trim(), variaciones: prepararVariaciones() })
          : await api.crearSimulacion(baseId, { nombre: nombre.trim(), variaciones: prepararVariaciones() });
        await cargarEscenarios();
        const respuesta = await api.compararSimulacion(baseId, creado.escenario.id);
        setComparacion(respuesta); setSeleccionado(creado.escenario);
        setEditandoId(creado.escenario.id);
        setAviso('Escenario guardado y evaluado. Seguirá disponible al reiniciar la aplicación.');
      }
    } catch (fallo) {
      setError(fallo.message);
    } finally { setCargando(''); }
  }

  async function abrirGuardado(escenario) {
    setCargando(escenario.id); setError(''); setAviso('');
    try {
      const respuesta = await api.compararSimulacion(baseId, escenario.id);
      setComparacion(respuesta); setSeleccionado(escenario);
    } catch (fallo) { setError(fallo.message); }
    finally { setCargando(''); }
  }

  const baseResultado = comparacion?.referencia;
  const varianteResultado = comparacion?.variante;
  const delta = comparacion?.delta_costo_cop;
  const optimo = varianteResultado?.estado === 'OPTIMO';
  const dual = varianteResultado?.sensibilidad_dual || [];
  const rangos = varianteResultado?.analisis_sensibilidad?.terminos_independientes || [];

  return <div className="flex-1 bg-slate-50 p-4 md:p-7 space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 md:px-9 md:py-9 text-white shadow-xl shadow-slate-900/10">
      <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><FlaskConical size={16} aria-hidden="true" /> Laboratorio de decisiones</p>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight">Simulación y sensibilidad</h1>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-300">Diseña una variante, calcula su impacto con Vogel y MODI y consérvala para compararla con la red original.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
          <Layers3 size={20} className="text-emerald-300" aria-hidden="true" />
          <span><strong className="text-white">{guardados.length}</strong> escenarios guardados para esta base</span>
        </div>
      </div>
    </section>

    <nav aria-label="Vistas del laboratorio" className="flex gap-2 overflow-x-auto border-b border-slate-200">
      {[['escenarios', 'Escenarios y resultados'], ['dualidad', 'Sensibilidad matemática']].map(([clave, texto]) =>
        <button key={clave} type="button" onClick={() => setVista(clave)} aria-current={vista === clave ? 'page' : undefined}
          className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${vista === clave ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>{texto}</button>)}
    </nav>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</p>}
    {aviso && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><Check size={16} aria-hidden="true" />{aviso}</p>}

    {vista === 'escenarios' && <div className="grid grid-cols-1 xl:grid-cols-[minmax(350px,0.9fr)_minmax(0,1.1fr)] gap-6 items-start">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">1</span><div><h2 className="font-bold text-slate-900">Diseña un escenario</h2><p className="mt-1 text-sm text-slate-600">Elige una red base y combina hasta 30 cambios.</p></div></div>
          {editandoId && <button type="button" onClick={nuevoEscenario} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50"><Plus size={16} aria-hidden="true" />Nuevo escenario</button>}
          <label className="block text-sm font-semibold text-slate-800">Escenario de referencia
            <select value={baseId} disabled={!!editandoId} onChange={e => { setBaseId(e.target.value); setNombre(''); setVariaciones([nuevaVariacion()]); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200">
              {listaEscenarios.map(esc => <option key={esc.id} value={esc.id}>{esc.id} · {esc.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">Nombre de la variante
            <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={100} placeholder="Ej. Alza de tarifas y menor capacidad" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Variaciones</h3><span className="text-xs text-slate-500">Se aplican en el orden mostrado</span></div>
            {variaciones.map((fila, indice) => <div key={indice} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambio {indice + 1}</span><button type="button" disabled={variaciones.length === 1} onClick={() => { setVariaciones(actual => actual.filter((_, i) => i !== indice)); setComparacion(null); }} aria-label={`Eliminar cambio ${indice + 1}`} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><Trash2 size={16} /></button></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Parámetro<select value={fila.tipo} onChange={e => cambiarVariacion(indice, 'tipo', e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">{Object.entries(tipos).map(([clave, texto]) => <option key={clave} value={clave}>{texto}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-700">Variación porcentual<input type="number" min="-100" max="1000" step="0.1" value={fila.porcentaje} onChange={e => cambiarVariacion(indice, 'porcentaje', e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" /></label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">Aplicar a
                <select value={fila.nodo_id} required={fila.tipo === 'CAPACIDAD'} onChange={e => cambiarVariacion(indice, 'nodo_id', e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">
                  {fila.tipo !== 'CAPACIDAD' && <option value="">{fila.tipo === 'OFERTA' ? 'Todas las empresas' : 'Todas las rutas'}</option>}
                  {fila.tipo === 'OFERTA' ? empresas.map(e => <option key={e.id} value={e.id}>{e.id} · {e.nombre}</option>) : plantas.map(p => <option key={p.id} value={p.id}>{p.id} · {p.nombre}</option>)}
                </select>
              </label>
            </div>)}
            <button type="button" disabled={variaciones.length >= 30} onClick={() => { setVariaciones(actual => [...actual, nuevaVariacion()]); setComparacion(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-emerald-400 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><Plus size={16} aria-hidden="true" />Añadir cambio</button>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button type="button" disabled={!!cargando || variaciones.some(v => v.porcentaje === '' || !Number.isFinite(Number(v.porcentaje)) || (v.tipo === 'CAPACIDAD' && !v.nodo_id))} onClick={() => ejecutar('previsualizar')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">{cargando === 'previsualizar' ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}Previsualizar impacto</button>
            <button type="button" disabled={!!cargando || !nombre.trim() || variaciones.some(v => v.porcentaje === '' || !Number.isFinite(Number(v.porcentaje)) || (v.tipo === 'CAPACIDAD' && !v.nodo_id))} onClick={() => ejecutar('guardar')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">{cargando === 'guardar' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editandoId ? 'Guardar cambios' : 'Guardar escenario'}</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 font-bold">2</span><div><h2 className="font-bold text-slate-900">Escenarios guardados</h2><p className="mt-1 text-sm text-slate-600">Selecciona uno para volver a calcular y comparar.</p></div></div>
          <div className="mt-5 space-y-2">{guardados.length ? guardados.map(esc => <div key={esc.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${seleccionado?.id === esc.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{esc.nombre}</p><p className="text-xs text-slate-500">{esc.variaciones?.length || 0} cambios · {esc.id.slice(0, 12)}</p></div><button type="button" disabled={!!cargando} onClick={() => editarEscenario(esc)} className="min-h-11 rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Editar</button><button type="button" disabled={!!cargando} onClick={() => abrirGuardado(esc)} aria-label={`Comparar ${esc.nombre}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">{cargando === esc.id ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={19} />}</button></div>) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Todavía no hay variantes guardadas para esta red.</p>}</div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-6" aria-live="polite">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold">3</span><div><h2 className="font-bold text-slate-900">Impacto de la decisión</h2><p className="mt-1 text-sm text-slate-600">Compara resultados de la referencia y la variante.</p></div></div>
        {!comparacion ? <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><div><BarChart3 className="mx-auto text-slate-400" size={32} aria-hidden="true" /><p className="mt-3 font-semibold text-slate-800">Tu comparación aparecerá aquí</p><p className="mt-1 text-sm text-slate-600">Previsualiza tus cambios o abre un escenario guardado.</p></div></div> : <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <TarjetaMetrica titulo="Referencia" valor={dinero(baseResultado?.costo_total_Z)} nota={baseResultado?.estado || 'Sin solución'} />
            <TarjetaMetrica titulo="Variante" valor={dinero(varianteResultado?.costo_total_Z)} nota={varianteResultado?.estado || 'Sin solución'} tono={optimo ? 'emerald' : 'rose'} />
            <TarjetaMetrica titulo="Cambio de costo" valor={delta == null ? 'No calculable' : `${delta > 0 ? '+' : ''}${dinero(delta)}`} nota={delta == null ? 'La variante no tiene costo óptimo' : delta > 0 ? 'Aumento frente a la referencia' : delta < 0 ? 'Ahorro frente a la referencia' : 'Sin cambio'} tono={delta > 0 ? 'rose' : 'emerald'} />
          </div>
          {!optimo && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{varianteResultado?.causa_estado || varianteResultado?.motivo_finalizacion || 'No se encontró solución factible.'}</p>}
          {optimo && <div><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">Rutas que cambian</h3><span className="text-xs text-slate-500">Toneladas por semana</span></div><TablaImpacto cambios={comparacion.cambios_flujo_t} /></div>}
          {seleccionado && <button type="button" onClick={() => cambiarEscenario(seleccionado.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Abrir escenario en el software <ArrowRight size={16} aria-hidden="true" /></button>}
        </>}
      </section>
    </div>}

    {vista === 'dualidad' && <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-slate-900">Lectura matemática del resultado</h2><p className="mt-1 text-sm text-slate-600">Precios sombra y rangos de la base óptima calculados en Python con MODI.</p></div><button type="button" disabled={!!cargando} onClick={async () => { setCargando('dualidad'); setError(''); try { const r = await api.ejecutarOptimizacion(baseId, { metodo: 'EXACTO' }); setComparacion({ referencia: r.resultado, variante: r.resultado, delta_costo_cop: 0, cambios_flujo_t: {} }); setSeleccionado(null); } catch (f) { setError(f.message); } finally { setCargando(''); } }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">{cargando === 'dualidad' ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}Analizar referencia</button></div>
      {!comparacion ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">Previsualiza o compara un escenario para consultar sus rangos. También puedes analizar directamente la referencia.</p> : !optimo ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La variante no tiene solución óptima; no hay precios sombra ni rangos que interpretar.</p> : <>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Precios sombra</h3><p className="mt-1 mb-4 text-sm text-slate-600">Cambio marginal del costo dentro del rango de base.</p><div className="max-h-96 overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="p-3 text-left">Restricción</th><th className="p-3 text-right">COP/t</th></tr></thead><tbody className="divide-y divide-slate-100">{dual.map(d => <tr key={d.nodo_id}><td className="p-3 text-slate-800">{d.restriccion}</td><td className="p-3 text-right font-semibold text-slate-900">{numero(d.precio_sombra, 2)}</td></tr>)}</tbody></table></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Rangos de oferta y capacidad</h3><p className="mt-1 mb-4 text-sm text-slate-600">Intervalo que conserva la base óptima; el factible permite otra asignación.</p><div className="max-h-96 overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="p-3 text-left">Nodo</th><th className="p-3 text-right">Base óptima (t)</th><th className="p-3 text-right">Factible (t)</th></tr></thead><tbody className="divide-y divide-slate-100">{rangos.map(d => <tr key={`${d.tipo}-${d.nodo_id}`}><td className="p-3 text-slate-800">{d.nodo_id}</td><td className="p-3 text-right whitespace-nowrap">{numero(d.inferior)} – {limite(d.superior)}</td><td className="p-3 text-right whitespace-nowrap">{numero(d.rango_factible?.inferior)} – {limite(d.rango_factible?.superior)}</td></tr>)}</tbody></table></div></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Rangos de costos por ruta</h3><p className="mt-1 mb-4 text-sm text-slate-600">Tarifas COP/t que mantienen la base de MODI.</p><div className="max-h-96 overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="p-3 text-left">Ruta</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Desde</th><th className="p-3 text-right">Hasta</th></tr></thead><tbody className="divide-y divide-slate-100">{(varianteResultado?.analisis_sensibilidad?.costos || []).map(d => <tr key={d.ruta}><td className="p-3 text-slate-800">{d.ruta}</td><td className="p-3 text-right">{numero(d.costo_vigente, 0)}</td><td className="p-3 text-right">{numero(d.inferior, 0)}</td><td className="p-3 text-right">{d.superior == null ? 'Sin límite' : numero(d.superior, 0)}</td></tr>)}</tbody></table></div></div>
      </>}
    </section>}
  </div>;
}
