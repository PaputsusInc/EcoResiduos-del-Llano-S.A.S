import React from 'react';
import { Split, Layers, CheckCircle, AlertOctagon, Clock } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

const ESCENARIOS_TABLA = [
  { id: 'ESC-01', nombre: 'Caso de Referencia Nominal', oferta: 115.0, cap: 135.0, estado: 'OPTIMO', costo: '$ 997.500 COP', tiempo: '0,042 s' },
  { id: 'ESC-02', nombre: 'Expansión de Oferta (+10%)', oferta: 126.5, cap: 135.0, estado: 'OPTIMO', costo: '$ 1.092.300 COP', tiempo: '0,045 s' },
  { id: 'ESC-03', nombre: 'Tarifas Combustible (+15%)', oferta: 115.0, cap: 135.0, estado: 'OPTIMO', costo: '$ 1.147.125 COP', tiempo: '0,041 s' },
  { id: 'ESC-04', nombre: 'Sobrecarga de Oferta', oferta: 120.0, cap: 100.0, estado: 'INFACTIBLE', costo: 'Capacidad superada por la oferta', tiempo: '0,005 s' },
  { id: 'ESC-AMP-20x6', nombre: 'Red Mediana 20×6', oferta: 260.0, cap: 340.0, estado: 'OPTIMO', costo: '$ 2.054.300 COP', tiempo: '0,088 s' },
  { id: 'ESC-AMP-30x8', nombre: 'Red Regional 30×8', oferta: 401.0, cap: 430.0, estado: 'OPTIMO', costo: '$ 3.120.800 COP', tiempo: '0,145 s' }
];

export default function Hu13EvaluacionEscenariosPage() {
  const { escenarioActivo, escenarioActivoId, cambiarEscenario, seleccionarEscenario } = useSession();
  const idActivo = escenarioActivoId || escenarioActivo?.id || 'ESC-01';
  const handleCargar = cambiarEscenario || seleccionarEscenario;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Split className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Evaluación de Sensibilidad</h2>
            <p className="text-xs text-slate-500">Inspección consolidada de escenarios simulados, costos resultantes y viabilidad operativa</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Activo:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
            {idActivo}
          </span>
        </div>
      </div>

      {/* TABLA DE ESCENARIOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Matriz de Escenarios Evaluados en la Sesión</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Código</th>
                <th className="py-2.5 px-4">Descripción del Escenario</th>
                <th className="py-2.5 px-4 text-right">Oferta Total</th>
                <th className="py-2.5 px-4 text-right">Capacidad Total</th>
                <th className="py-2.5 px-4 text-center">Estado Matemático</th>
                <th className="py-2.5 px-4 text-right">Costo Total (Z*)</th>
                <th className="py-2.5 px-4 text-right">Tiempo</th>
                <th className="py-2.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ESCENARIOS_TABLA.map((esc) => {
                const esActivo = idActivo === esc.id;
                const esOptimo = esc.estado === 'OPTIMO';
                return (
                  <tr key={esc.id} className={`hover:bg-slate-50 transition ${esActivo ? 'bg-emerald-50/50' : ''}`}>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{esc.id}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-800">{esc.nombre}</td>
                    <td className="py-2.5 px-4 text-right">{esc.oferta.toFixed(1)} t/sem</td>
                    <td className="py-2.5 px-4 text-right">{esc.cap.toFixed(1)} t/sem</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        esOptimo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {esc.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {esc.costo}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{esc.tiempo}</td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <button
                        onClick={() => handleCargar && handleCargar(esc.id)}
                        disabled={esActivo}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          esActivo
                            ? 'bg-emerald-700 text-white cursor-default shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 shadow-xs cursor-pointer'
                        }`}
                      >
                        {esActivo ? 'Activo' : 'Cargar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
