import React, { useState } from 'react';
import { Gauge, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export default function Hu12SensibilidadCapacidadesPage() {
  const { escenarioActivo } = useSession();
  const [reduccionPlanta01, setReduccionPlanta01] = useState(0); // reducción en planta principal

  const plantas = escenarioActivo?.plantas || [];
  const p1 = plantas.find(p => p.id === 'PLA-01') || plantas[0] || { capacidad_maxima_t: 45.0, nombre: 'Planta Villavicencio' };
  const capP1Nominal = p1.capacidad_maxima_t || 45.0;
  const otrasPlantasCap = plantas.length > 1
    ? plantas.filter(p => p.id !== p1.id).reduce((s, p) => s + (p.capacidad_maxima_t || 0), 0)
    : 90.0;

  const capP1 = Math.max(0, capP1Nominal - reduccionPlanta01);
  const capTotal = capP1 + otrasPlantasCap;
  const ofertaReq = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);
  const esFactible = capTotal >= ofertaReq;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Variación de Capacidades</h2>
            <p className="text-xs text-slate-500">Evaluación de cuellos de botella y escenarios de contingencia operativa en plantas procesadoras</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Escenario:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {escenarioActivo?.id || 'ESC-01'}
          </span>
        </div>
      </div>

      {/* SIMULADOR DE MANTENIMIENTO EN PLA-01 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Simulación de Paro / Mantenimiento en {p1.id} ({p1.nombre})</h3>
            <p className="text-xs text-slate-500">Capacidad nominal base: {capP1Nominal.toFixed(1)} t/semana. Reducción controlada de disponibilidad:</p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-700">
            Capacidad restante: {capP1.toFixed(1)} t/semana (−{reduccionPlanta01} t)
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={Math.round(capP1Nominal)}
          step="5"
          value={reduccionPlanta01}
          onChange={(e) => setReduccionPlanta01(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-600 cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>0 t (Operación al 100%: {capP1Nominal.toFixed(1)} t)</span>
          <span>Reducción parcial</span>
          <span>Paro total: −{Math.round(capP1Nominal)} t</span>
        </div>
      </div>

      {/* METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Capacidad Total Red</span>
          <div className="text-2xl font-black text-slate-800 font-mono">{capTotal.toFixed(1)} <span className="text-xs font-sans text-slate-500 font-normal">t/semana</span></div>
          <p className="text-xs text-slate-500">Oferta obligatoria requerida: {ofertaReq.toFixed(1)} t/semana</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Holgura Operativa</span>
          <div className={`text-2xl font-black font-mono ${esFactible ? 'text-emerald-700' : 'text-rose-600'}`}>
            {(capTotal - ofertaReq).toFixed(1)} <span className="text-xs font-sans font-normal">t/semana</span>
          </div>
          <p className="text-xs text-slate-500">{esFactible ? 'Red con capacidad suficiente' : 'Déficit estructural'}</p>
        </div>

        <div className={`p-5 rounded-xl shadow-sm space-y-2 ${esFactible ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-300 text-red-900'}`}>
          <div className="flex items-center gap-2">
            {esFactible ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertOctagon className="w-5 h-5 text-red-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">Diagnóstico</span>
          </div>
          <p className="text-xs leading-relaxed">
            {esFactible
              ? 'La red puede reubicar los flujos hacia las demás plantas receptoras disponibles sin violar restricciones de capacidad.'
              : `Infactible: «Capacidad superada por la oferta». Con esta reducción, la oferta obligatoria (${ofertaReq.toFixed(1)} t) excede el total instalado.`}
          </p>
        </div>
      </div>
    </div>
  );
}

