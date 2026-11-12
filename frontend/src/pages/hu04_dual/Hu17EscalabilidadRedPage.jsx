import React from 'react';
import { Maximize2, Zap, Clock, Database } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

const ESCALABILIDAD_DATOS = [
  { red: 'Base 10×4', nodos: '10 empresas · 4 plantas', variables: '40 variables (39 activas)', tExacto: '0,042 s', tAG: '0,815 s', memoria: '18 MB', z: '$ 997.500 COP' },
  { red: 'Ampliación 20×6', nodos: '20 empresas · 6 plantas', variables: '120 variables', tExacto: '0,088 s', tAG: '1,640 s', memoria: '24 MB', z: '$ 2.054.300 COP' },
  { red: 'Regional 30×8', nodos: '30 empresas · 8 plantas', variables: '240 variables', tExacto: '0,145 s', tAG: '2,920 s', memoria: '32 MB', z: '$ 3.120.800 COP' }
];

export default function Hu17EscalabilidadRedPage() {
  const { escenarioActivo } = useSession();
  const escId = escenarioActivo?.id || 'ESC-01';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Escalabilidad de la Red</h2>
            <p className="text-xs text-slate-500">Evaluación de tiempos de cómputo y memoria al expandir orígenes y destinos</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Escenario:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
            {escId}
          </span>
        </div>
      </div>

      {/* TARJETAS BENCHMARK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ESCALABILIDAD_DATOS.map((d, idx) => {
          const esActivo = (idx === 0 && (escId === 'ESC-01' || escId === 'ESC-02' || escId === 'ESC-03' || escId === 'ESC-04')) ||
                           (idx === 1 && escId === 'ESC-AMP-20x6') ||
                           (idx === 2 && escId === 'ESC-AMP-30x8');
          return (
            <div
              key={idx}
              className={`bg-white p-5 rounded-xl border shadow-sm space-y-3 transition ${
                esActivo
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{d.red}</span>
                  {esActivo && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Activo
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{d.variables}</span>
              </div>
              <p className="text-xs text-slate-500">{d.nodos}</p>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Método Exacto:</span>
                  <span className="font-mono font-bold text-emerald-700">{d.tExacto}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Algoritmo Genético:</span>
                  <span className="font-mono font-bold text-indigo-700">{d.tAG}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Consumo Memoria:</span>
                  <span className="font-mono text-slate-700">{d.memoria}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">Costo Óptimo:</span>
                <span className="font-mono font-bold text-slate-900">{d.z}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLA COMPARATIVA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Rendimiento Comparativo de Algoritmos ante Crecimiento de Red</h3>
        <p className="text-xs text-slate-500">El método simplex preserva tiempos inferiores a 1 segundo incluso con redes ampliadas de 30 empresas y 8 plantas.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Dimensión de Red</th>
                <th className="py-2.5 px-4">Variables de Decisión</th>
                <th className="py-2.5 px-4 text-right">Tiempo Exacto (s)</th>
                <th className="py-2.5 px-4 text-right">Tiempo AG (s)</th>
                <th className="py-2.5 px-4 text-right">Factor de Aceleración Exacto vs AG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">Base 10×4 (40 variables)</td>
                <td className="py-2.5 px-4">40</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">0,042 s</td>
                <td className="py-2.5 px-4 text-right text-indigo-700 font-bold">0,815 s</td>
                <td className="py-2.5 px-4 text-right text-slate-900 font-bold">19.4x más rápido</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">Ampliación 20×6 (120 variables)</td>
                <td className="py-2.5 px-4">120</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">0,088 s</td>
                <td className="py-2.5 px-4 text-right text-indigo-700 font-bold">1,640 s</td>
                <td className="py-2.5 px-4 text-right text-slate-900 font-bold">18.6x más rápido</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">Regional 30×8 (240 variables)</td>
                <td className="py-2.5 px-4">240</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">0,145 s</td>
                <td className="py-2.5 px-4 text-right text-indigo-700 font-bold">2,920 s</td>
                <td className="py-2.5 px-4 text-right text-slate-900 font-bold">20.1x más rápido</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

