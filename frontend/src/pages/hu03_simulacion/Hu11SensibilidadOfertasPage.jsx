import React, { useState } from 'react';
import { Sliders, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export default function Hu11SensibilidadOfertasPage() {
  const { escenarioActivo } = useSession();
  const [variacionOfertaPct, setVariacionOfertaPct] = useState(0);

  const ofertaBase = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);
  const capacidadTotal = escenarioActivo?.plantas?.length
    ? escenarioActivo.plantas.reduce((s, p) => s + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t || 135.0);
  const ofertaSimulada = +(ofertaBase * (1 + variacionOfertaPct / 100)).toFixed(1);
  const esFactible = ofertaSimulada <= capacidadTotal;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Variación de Ofertas</h2>
            <p className="text-xs text-slate-500">Simulación del costo total y factibilidad ante fluctuaciones en la generación de biomasa</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Escenario:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {escenarioActivo?.id || 'ESC-01'}
          </span>
        </div>
      </div>

      {/* CONTROL DE VARIACIÓN */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Variación Porcentual Uniforme de Oferta en Origen (Δa)</h3>
          <span className="text-xs font-mono font-bold text-emerald-700">{variacionOfertaPct > 0 ? `+${variacionOfertaPct}%` : `${variacionOfertaPct}%`}</span>
        </div>

        <input
          type="range"
          min="-30"
          max="30"
          step="5"
          value={variacionOfertaPct}
          onChange={(e) => setVariacionOfertaPct(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-600 cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>-30% (Reducción {(ofertaBase * 0.7).toFixed(1)} t)</span>
          <span>0% (Nominal {ofertaBase.toFixed(1)} t)</span>
          <span>+{capacidadTotal > ofertaBase ? (((capacidadTotal - ofertaBase) / ofertaBase) * 100).toFixed(1) : '0'}% (Límite {capacidadTotal.toFixed(1)} t)</span>
          <span>+30% (Sobrecarga {(ofertaBase * 1.3).toFixed(1)} t)</span>
        </div>
      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Oferta Total Simulada</span>
          <div className="text-2xl font-black text-slate-800 font-mono">{ofertaSimulada} <span className="text-xs font-sans text-slate-500 font-normal">t/semana</span></div>
          <p className="text-xs text-slate-500">Capacidad total instalada: {capacidadTotal.toFixed(1)} t/semana</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Margen de Holgura</span>
          <div className={`text-2xl font-black font-mono ${esFactible ? 'text-emerald-700' : 'text-rose-600'}`}>
            {(capacidadTotal - ofertaSimulada).toFixed(1)} <span className="text-xs font-sans font-normal">t/semana</span>
          </div>
          <p className="text-xs text-slate-500">{esFactible ? 'Capacidad suficiente' : 'Déficit de recepción'}</p>
        </div>

        <div className={`p-5 rounded-xl shadow-sm space-y-2 ${esFactible ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-300 text-red-900'}`}>
          <div className="flex items-center gap-2">
            {esFactible ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">Viabilidad Matemática</span>
          </div>
          <p className="text-xs leading-relaxed">
            {esFactible
              ? 'El modelo se mantiene factible. La red puede absorber la oferta simulada sin contingencias.'
              : 'Infactible: «Capacidad superada por la oferta». La oferta calculada sobrepasa el tope conjunto de las plantas.'}
          </p>
        </div>
      </div>
    </div>
  );
}

