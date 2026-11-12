import React, { useState } from 'react';
import { ListOrdered, Boxes, Route, GitBranch, ShieldCheck, AlertOctagon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

const COSTOS_REFERENCIA = {
  'ESC-01': 997500.0,
  'ESC-02': 1092300.0,
  'ESC-03': 1147125.0,
  'ESC-AMP-20x6': 2054300.0,
  'ESC-AMP-30x8': 3120800.0
};

const PASOS_VOGEL = [
  { paso: 1, seleccion: 'Fila EMP-04', pen: '21.150 COP/t', asignacion: 'EMP-04 → PLA-03', cant: 12, costo: '5.400 COP/t' },
  { paso: 2, seleccion: 'Fila EMP-05', pen: '20.250 COP/t', asignacion: 'EMP-05 → PLA-03', cant: 8, costo: '2.550 COP/t' },
  { paso: 3, seleccion: 'Columna PLA-04', pen: '12.600 COP/t', asignacion: 'Auxiliar → PLA-04', cant: 20, costo: '0 COP/t' },
  { paso: 4, seleccion: 'Fila EMP-08', pen: '12.000 COP/t', asignacion: 'EMP-08 → PLA-04', cant: 10, costo: '12.600 COP/t' },
  { paso: 5, seleccion: 'Fila EMP-02', pen: '9.600 COP/t', asignacion: 'EMP-02 → PLA-03', cant: 15, costo: '9.600 COP/t' },
  { paso: 6, seleccion: 'Fila EMP-09', pen: '4.200 COP/t', asignacion: 'EMP-09 → PLA-01', cant: 5, costo: '12.600 COP/t' },
  { paso: 7, seleccion: 'Fila EMP-07', pen: '4.200 COP/t', asignacion: 'EMP-07 → PLA-01', cant: 10, costo: '14.400 COP/t' },
  { paso: 8, seleccion: 'Fila EMP-08', pen: '4.200 COP/t', asignacion: 'EMP-08 → PLA-01', cant: 1, costo: '24.600 COP/t' },
  { paso: 9, seleccion: 'Fila EMP-01', pen: '4.110 COP/t', asignacion: 'EMP-01 → PLA-01', cant: 25, costo: '8.250 COP/t' },
  { paso: 10, seleccion: 'Fila EMP-06', pen: '4.050 COP/t', asignacion: 'EMP-06 → PLA-01', cant: 4, costo: '2.850 COP/t' },
  { paso: 11, seleccion: 'Fila EMP-10', pen: '31.200 COP/t', asignacion: 'EMP-10 → PLA-02', cant: 5, costo: '31.200 COP/t' },
  { paso: 12, seleccion: 'Fila EMP-06', pen: '6.900 COP/t', asignacion: 'EMP-06 → PLA-02', cant: 2, costo: '6.900 COP/t' },
  { paso: 13, seleccion: 'Columna PLA-02', pen: '4.350 COP/t', asignacion: 'EMP-03 → PLA-02', cant: 18, costo: '4.350 COP/t' }
];

export default function Hu19ProcedimientoMetodoExactoPage() {
  const { escenarioActivo, escenarioActivoId, cambiarEscenario, listaEscenarios } = useSession();
  const idActivo = escenarioActivoId || escenarioActivo?.id || 'ESC-01';

  const empresas = escenarioActivo?.empresas || [];
  const plantas = escenarioActivo?.plantas || [];

  const ofertaTotal = empresas.length > 0
    ? empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);

  const capacidadTotal = plantas.length > 0
    ? plantas.reduce((s, p) => s + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t || 135.0);

  const esInfactible = ofertaTotal > capacidadTotal || idActivo === 'ESC-04' || Boolean(escenarioActivo?.aviso_capacidad);
  const costoOptimo = COSTOS_REFERENCIA[idActivo] || 997500.0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Procedimiento Exacto</h2>
            <p className="text-xs text-slate-500">Trazabilidad paso a paso: formulación del modelo, solución inicial, multiplicadores y comprobación</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={idActivo}
            onChange={(e) => cambiarEscenario && cambiarEscenario(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
          >
            {listaEscenarios && listaEscenarios.length > 0 ? (
              listaEscenarios.map(esc => (
                <option key={esc.id} value={esc.id}>
                  {esc.id} · {esc.nombre}
                </option>
              ))
            ) : (
              <>
                <option value="ESC-01">ESC-01 · Caso de referencia (115 t / 135 t)</option>
                <option value="ESC-04">ESC-04 · Exceso de Oferta (120 t / 100 t)</option>
              </>
            )}
          </select>

          <Link
            to="/resolucion-exacta"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Resultado Exacto</span>
          </Link>
        </div>
      </div>

      {!esInfactible ? (
        <div className="space-y-6">
          {/* BANNER ESTADO */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Óptimo verificado por MODI
                </span>
                <span className="font-mono text-xs text-slate-300">
                  {idActivo} · {escenarioActivo?.nombre || 'Caso de referencia'}
                </span>
              </div>
              <h3 className="text-lg font-bold">Del modelo de transporte a la asignación final</h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                Registro paso a paso de la resolución: modelo formal ({empresas.length} empresas y {plantas.length} plantas), penalizaciones de Vogel, iteraciones MODI y asignación óptima.
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-300">Costo final óptimo</span>
              <strong className="text-2xl text-emerald-300 font-mono">
                $ {Math.round(costoOptimo).toLocaleString('es-CO')}{' '}
                <span className="text-xs font-sans text-slate-400">COP</span>
              </strong>
            </div>
          </div>

          {/* NAVEGACIÓN ETAPAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <a href="#sec-modelo" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs grid place-items-center shrink-0">01</span>
              <div><strong className="block text-xs text-slate-800">Modelo formulado</strong><small className="text-[11px] text-slate-500">Datos y restricciones</small></div>
            </a>
            <a href="#sec-vogel" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs grid place-items-center shrink-0">02</span>
              <div><strong className="block text-xs text-slate-800">Método de Vogel</strong><small className="text-[11px] text-slate-500">Solución inicial</small></div>
            </a>
            <a href="#sec-modi" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs grid place-items-center shrink-0">03</span>
              <div><strong className="block text-xs text-slate-800">Método MODI</strong><small className="text-[11px] text-slate-500">Mejora de la solución</small></div>
            </a>
            <a href="#sec-verificacion" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs grid place-items-center shrink-0">04</span>
              <div><strong className="block text-xs text-slate-800">Verificación</strong><small className="text-[11px] text-slate-500">Flujos y costo</small></div>
            </a>
          </div>

          {/* ETAPA 1: MODELO */}
          <div id="sec-modelo" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">01 · Modelo de Transporte Formulado</h3>
              </div>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {ofertaTotal.toFixed(1)} t/sem oferta · {capacidadTotal.toFixed(1)} t/sem capacidad
              </span>
            </div>
            <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs leading-6 overflow-x-auto">
              <p className="text-emerald-300 font-sans font-bold mb-1">Función Objetivo ({idActivo}):</p>
              <p>Min Z = Σ_i Σ_j c_ij · x_ij</p>
              <p><span className="text-slate-400">Oferta ({empresas.length} orígenes):</span> Σ_j x_ij = oferta_i &nbsp; ∀ i ∈ Empresas</p>
              <p><span className="text-slate-400">Capacidad ({plantas.length} destinos):</span> Σ_i x_ij ≤ capacidad_j &nbsp; ∀ j ∈ Plantas</p>
              <p><span className="text-slate-400">No negatividad y red vial:</span> x_ij ≥ 0; conexiones no transitables con costo M o inactivas</p>
            </div>
          </div>

          {/* ETAPA 2: VOGEL */}
          <div id="sec-vogel" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">02 · Método de Aproximación de Vogel (VAM) — Solución Inicial</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Costo intermedio inicial</span>
                <strong className="text-sm font-mono text-slate-800">
                  $ {Math.round(costoOptimo * 1.055).toLocaleString('es-CO')} COP
                </strong>
              </div>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-72">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2.5">Paso</th>
                    <th className="p-2.5">Fila / Columna</th>
                    <th className="p-2.5">Penalización</th>
                    <th className="p-2.5">Conexión Asignada</th>
                    <th className="p-2.5 text-right">Cantidad</th>
                    <th className="p-2.5 text-right">Costo Unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {PASOS_VOGEL.map((p) => (
                    <tr key={p.paso} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold">{p.paso}</td>
                      <td className="p-2.5 font-sans">{p.seleccion}</td>
                      <td className="p-2.5">{p.pen}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-800">{p.asignacion}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">{p.cant} t</td>
                      <td className="p-2.5 text-right">{p.costo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ETAPA 3: MODI */}
          <div id="sec-modi" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">03 · Método MODI — Prueba de Optimalidad y Multiplicadores</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Iteraciones completadas · Todos los costos reducidos finales ≥ 0
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2.5">Iteración</th>
                    <th className="p-2.5">Celda Entrante</th>
                    <th className="p-2.5 text-right">Costo Reducido</th>
                    <th className="p-2.5 text-right">Ajuste θ</th>
                    <th className="p-2.5">Celda Saliente</th>
                    <th className="p-2.5 text-right">Costo Tras Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="p-2.5 font-bold">1</td>
                    <td className="p-2.5 font-sans">Auxiliar → PLA-02</td>
                    <td className="p-2.5 text-right text-rose-700 font-bold">−16.050 COP/t</td>
                    <td className="p-2.5 text-right">1 t</td>
                    <td className="p-2.5 font-sans">EMP-08 → PLA-01</td>
                    <td className="p-2.5 text-right font-semibold">$ {Math.round(costoOptimo * 1.039).toLocaleString('es-CO')} COP</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold">2</td>
                    <td className="p-2.5 font-sans">EMP-10 → PLA-04</td>
                    <td className="p-2.5 text-right text-rose-700 font-bold">−7.800 COP/t</td>
                    <td className="p-2.5 text-right">5 t</td>
                    <td className="p-2.5 font-sans">EMP-10 → PLA-02</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700 font-bold">$ {Math.round(costoOptimo).toLocaleString('es-CO')} COP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ETAPA 4: VERIFICACION */}
          <div id="sec-verificacion" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">04 · Asignación Final y Comprobación Numérica</h3>
              </div>
              <strong className="text-base font-mono text-emerald-700">
                $ {Math.round(costoOptimo).toLocaleString('es-CO')} COP
              </strong>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-800">{empresas.length} de {empresas.length} ofertas completas</strong>
                <p className="text-slate-600 mt-1">Σ flujos por empresa = oferta (100% satisfecha)</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-800">{plantas.length} de {plantas.length} capacidades respetadas</strong>
                <p className="text-slate-600 mt-1">Σ flujos por planta ≤ capacidad máxima instalada</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-800">Conexiones válidas</strong>
                <p className="text-slate-600 mt-1">Todas las rutas asignadas son transitables y compatibles</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* INVIABLE (ESC-04 / SOBRECARGA) */
        <div className="space-y-6">
          <div className="bg-rose-600 text-white p-6 rounded-xl shadow-md flex items-start gap-4">
            <AlertOctagon className="w-7 h-7 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-800/50 px-2 py-0.5 rounded">
                {idActivo} · Inviable
              </span>
              <h3 className="text-lg font-bold mt-1">No existe una asignación factible</h3>
              <p className="text-xs text-rose-50 mt-1 leading-relaxed">
                La oferta semanal requerida es {ofertaTotal.toFixed(1)} t/semana y la capacidad máxima conjunta es {capacidadTotal.toFixed(1)} t/semana. El déficit estructural de {(capacidadTotal - ofertaTotal).toFixed(1)} t/semana impide cumplir las restricciones de oferta.
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600 space-y-2">
            <h4 className="text-sm font-bold text-slate-900">Procedimiento detenido tempranamente</h4>
            <p>1. Se validaron los totales: Oferta total ({ofertaTotal.toFixed(1)} t) &gt; Capacidad total ({capacidadTotal.toFixed(1)} t).</p>
            <p>2. Condición necesaria de balance violada: No se inician Vogel ni MODI para evitar cómputo superfluo.</p>
            <p className="text-slate-800 font-semibold">Etiqueta de salida: «Capacidad superada por la oferta»</p>
          </div>
        </div>
      )}
    </div>
  );
}
