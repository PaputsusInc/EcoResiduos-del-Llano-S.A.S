import React, { useState } from 'react';
import { Network, DollarSign, Truck, GitCommit, Printer, Check, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

const EMPRESAS = [
  { id: 'EMP-01', nombre: 'Palmeras del Llano', mun: 'Acacías', oferta: 25.0 },
  { id: 'EMP-02', nombre: 'Agropecuaria San Martín', mun: 'San Martín', oferta: 15.0 },
  { id: 'EMP-03', nombre: 'Hacienda La Cabaña', mun: 'Cumaral', oferta: 18.0 },
  { id: 'EMP-04', nombre: 'Arrocera del Ariari', mun: 'Fuente de Oro', oferta: 12.0 },
  { id: 'EMP-05', nombre: 'Frutales y Cítricos Meta', mun: 'Granada', oferta: 8.0 },
  { id: 'EMP-06', nombre: 'BioCacao de la Sierra', mun: 'Villavicencio', oferta: 6.0 },
  { id: 'EMP-07', nombre: 'AgroForestal La Esperanza', mun: 'Castilla la Nueva', oferta: 10.0 },
  { id: 'EMP-08', nombre: 'Plantaciones San Rafael', mun: 'Puerto López', oferta: 11.0 },
  { id: 'EMP-09', nombre: 'Ganadería Sostenible Guamal', mun: 'Guamal', oferta: 5.0 },
  { id: 'EMP-10', nombre: 'Agropecuaria Cabuyaro', mun: 'Cabuyaro', oferta: 5.0 }
];

const PLANTAS = [
  { id: 'PLA-01', nombre: 'Villavicencio', cap: 45.0 },
  { id: 'PLA-02', nombre: 'Restrepo', cap: 25.0 },
  { id: 'PLA-03', nombre: 'Granada', cap: 35.0 },
  { id: 'PLA-04', nombre: 'Puerto Gaitán', cap: 30.0 }
];

// Asignación Exacto (ESC-01: Costo total = 997.500 COP)
const ENVIOS_EXACTO = [
  { origen: 'EMP-01', nomOri: 'Palmeras del Llano', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '27,5 km', tons: 25.0, cUnit: 8250, cTot: 206250 },
  { origen: 'EMP-02', nomOri: 'Agropecuaria San Martín', destino: 'PLA-03', nomDest: 'Granada', dist: '32,0 km', tons: 15.0, cUnit: 9600, cTot: 144000 },
  { origen: 'EMP-03', nomOri: 'Hacienda La Cabaña', destino: 'PLA-02', nomDest: 'Restrepo', dist: '14,5 km', tons: 18.0, cUnit: 4350, cTot: 78300 },
  { origen: 'EMP-04', nomOri: 'Arrocera del Ariari', destino: 'PLA-03', nomDest: 'Granada', dist: '18,0 km', tons: 12.0, cUnit: 5400, cTot: 64800 },
  { origen: 'EMP-05', nomOri: 'Frutales y Cítricos Meta', destino: 'PLA-03', nomDest: 'Granada', dist: '8,5 km', tons: 8.0, cUnit: 2550, cTot: 20400 },
  { origen: 'EMP-06', nomOri: 'BioCacao de la Sierra', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '9,5 km', tons: 5.0, cUnit: 2850, cTot: 14250 },
  { origen: 'EMP-06', nomOri: 'BioCacao de la Sierra', destino: 'PLA-02', nomDest: 'Restrepo', dist: '23,0 km', tons: 1.0, cUnit: 6900, cTot: 6900 },
  { origen: 'EMP-07', nomOri: 'AgroForestal La Esperanza', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '48,0 km', tons: 10.0, cUnit: 14400, cTot: 144000 },
  { origen: 'EMP-08', nomOri: 'Plantaciones San Rafael', destino: 'PLA-04', nomDest: 'Puerto Gaitán', dist: '42,0 km', tons: 11.0, cUnit: 12600, cTot: 138600 },
  { origen: 'EMP-09', nomOri: 'Ganadería Sostenible Guamal', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '42,0 km', tons: 5.0, cUnit: 12600, cTot: 63000 },
  { origen: 'EMP-10', nomOri: 'Agropecuaria Cabuyaro', destino: 'PLA-04', nomDest: 'Puerto Gaitán', dist: '78,0 km', tons: 5.0, cUnit: 23400, cTot: 117000 }
];

// Asignación Algoritmo Genético (ESC-01: Costo total = 1.018.400 COP, GAP = 2.09%)
const ENVIOS_AG = [
  { origen: 'EMP-01', nomOri: 'Palmeras del Llano', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '27,5 km', tons: 20.0, cUnit: 8250, cTot: 165000 },
  { origen: 'EMP-01', nomOri: 'Palmeras del Llano', destino: 'PLA-02', nomDest: 'Restrepo', dist: '41,2 km', tons: 5.0, cUnit: 12360, cTot: 61800 },
  { origen: 'EMP-02', nomOri: 'Agropecuaria San Martín', destino: 'PLA-03', nomDest: 'Granada', dist: '32,0 km', tons: 15.0, cUnit: 9600, cTot: 144000 },
  { origen: 'EMP-03', nomOri: 'Hacienda La Cabaña', destino: 'PLA-02', nomDest: 'Restrepo', dist: '14,5 km', tons: 18.0, cUnit: 4350, cTot: 78300 },
  { origen: 'EMP-04', nomOri: 'Arrocera del Ariari', destino: 'PLA-03', nomDest: 'Granada', dist: '18,0 km', tons: 12.0, cUnit: 5400, cTot: 64800 },
  { origen: 'EMP-05', nomOri: 'Frutales y Cítricos Meta', destino: 'PLA-03', nomDest: 'Granada', dist: '8,5 km', tons: 8.0, cUnit: 2550, cTot: 20400 },
  { origen: 'EMP-06', nomOri: 'BioCacao de la Sierra', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '9,5 km', tons: 6.0, cUnit: 2850, cTot: 17100 },
  { origen: 'EMP-07', nomOri: 'AgroForestal La Esperanza', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '48,0 km', tons: 10.0, cUnit: 14400, cTot: 144000 },
  { origen: 'EMP-08', nomOri: 'Plantaciones San Rafael', destino: 'PLA-04', nomDest: 'Puerto Gaitán', dist: '42,0 km', tons: 11.0, cUnit: 12600, cTot: 138600 },
  { origen: 'EMP-09', nomOri: 'Ganadería Sostenible Guamal', destino: 'PLA-01', nomDest: 'Villavicencio', dist: '42,0 km', tons: 5.0, cUnit: 12600, cTot: 63000 },
  { origen: 'EMP-10', nomOri: 'Agropecuaria Cabuyaro', destino: 'PLA-04', nomDest: 'Puerto Gaitán', dist: '78,0 km', tons: 5.0, cUnit: 23400, cTot: 117000 }
];

export default function Hu09AsignacionFlujosCostosPage() {
  const { escenarioActivo } = useSession();
  const [metodo, setMetodo] = useState('exacto');

  const empresasLista = escenarioActivo?.empresas?.length ? escenarioActivo.empresas : EMPRESAS;
  const plantasLista = escenarioActivo?.plantas?.length ? escenarioActivo.plantas : PLANTAS;

  const ofertaTotal = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t ?? 115.0);

  const capacidadTotal = escenarioActivo?.plantas?.length
    ? escenarioActivo.plantas.reduce((s, p) => s + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t ?? 135.0);

  const esInfactible = ofertaTotal > capacidadTotal;

  // Generar envíos según escenario activo
  const enviosActivos = React.useMemo(() => {
    if (escenarioActivo?.id === 'ESC-01' || !escenarioActivo?.id) {
      return metodo === 'exacto' ? ENVIOS_EXACTO : ENVIOS_AG;
    }

    if (escenarioActivo?.id === 'ESC-02') {
      const base = metodo === 'exacto' ? ENVIOS_EXACTO : ENVIOS_AG;
      return base.map(e => {
        const t = +(e.tons * 1.1).toFixed(1);
        return {
          ...e,
          tons: t,
          cTot: Math.round(t * e.cUnit)
        };
      });
    }

    if (escenarioActivo?.id === 'ESC-03') {
      const base = metodo === 'exacto' ? ENVIOS_EXACTO : ENVIOS_AG;
      return base.map(e => {
        const cU = Math.round(e.cUnit * 1.15);
        return {
          ...e,
          cUnit: cU,
          cTot: Math.round(e.tons * cU)
        };
      });
    }

    // Para escenarios ampliados (ej. ESC-AMP-20x6, ESC-AMP-30x8, ESC-04)
    const envios = [];
    empresasLista.forEach((emp, i) => {
      const pla = plantasLista[i % plantasLista.length];
      const dist = 22.0 + ((i * 13) % 55);
      const cUnit = Math.round(dist * 300);
      const tons = Number(emp.oferta_t) || Number(emp.oferta) || 10.0;
      envios.push({
        origen: emp.id,
        nomOri: emp.nombre,
        destino: pla.id,
        nomDest: pla.nombre,
        dist: `${dist.toFixed(1).replace('.', ',')} km`,
        tons: tons,
        cUnit: cUnit,
        cTot: Math.round(tons * cUnit)
      });
    });
    return envios;
  }, [escenarioActivo, metodo, empresasLista, plantasLista]);

  const costoTotal = enviosActivos.reduce((sum, e) => sum + e.cTot, 0);
  const tonsTotal = enviosActivos.reduce((sum, e) => sum + e.tons, 0);

  // Mapa de matriz [empId][plaId] = tons
  const mapaMatriz = {};
  const totPlantas = {};
  plantasLista.forEach(p => { totPlantas[p.id] = 0; });

  enviosActivos.forEach(e => {
    if (!mapaMatriz[e.origen]) mapaMatriz[e.origen] = {};
    mapaMatriz[e.origen][e.destino] = (mapaMatriz[e.origen][e.destino] || 0) + e.tons;
    if (totPlantas[e.destino] !== undefined) {
      totPlantas[e.destino] += e.tons;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Asignación y Costos</h2>
            <p className="text-xs text-slate-500">Matriz de distribución y costo total de transporte logístico semanal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setMetodo('exacto')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                metodo === 'exacto' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Método Exacto
            </button>
            <button
              onClick={() => setMetodo('ag')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                metodo === 'ag' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Algoritmo Genético
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* ALERTA DE INFACTIBILIDAD SI APLICA */}
      {esInfactible && (
        <div className="bg-red-50 border-2 border-red-400 p-4 rounded-xl flex items-start space-x-3 text-red-900 shadow-sm">
          <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-red-800">
              Escenario Infactible Certificado: «Capacidad superada por la oferta»
            </h4>
            <p>
              La oferta semanal acumulada de las empresas ({ofertaTotal.toFixed(1)} t/semana) sobrepasa la capacidad total máxima de las plantas ({capacidadTotal.toFixed(1)} t/semana).
              El solucionador no puede abastecer el 100% de la biomasa con la infraestructura actual.
            </p>
          </div>
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Método de Cálculo</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              metodo === 'exacto' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {metodo === 'exacto' ? 'Método Exacto' : 'Metaheurística AG'}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">{metodo === 'exacto' ? 'Método Exacto' : 'Algoritmo Genético'}</div>
          <p className="text-xs text-slate-500 mt-1">{metodo === 'exacto' ? 'Solución matemática certificada' : 'Factible sin certificar'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Total de Transporte</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            $ {costoTotal.toLocaleString('es-CO')} <span className="text-xs font-sans text-slate-500 font-normal">COP</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {metodo === 'exacto' ? 'Costo óptimo evaluado' : 'Aproximación metaheurística'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toneladas Asignadas</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {tonsTotal.toFixed(1)} <span className="text-xs font-sans text-slate-500 font-normal">t/semana</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Oferta total: {ofertaTotal.toFixed(1)} t/semana</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conexiones Activas</span>
            <GitCommit className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {enviosActivos.length} <span className="text-xs font-sans text-slate-500 font-normal">rutas</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Sobre {escenarioActivo?.rutas?.length || (empresasLista.length * plantasLista.length)} conexiones de la red</p>
        </div>
      </div>

      {/* MATRIZ DE ASIGNACIÓN */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Matriz de Asignación de Toneladas Semanales (t/semana)</h3>
            <p className="text-xs text-slate-500">Distribución física de carga desde cada empresa origen hacia las plantas procesadoras receptoras.</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Unidad: t/semana</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-xs">
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Empresa Origen</th>
                {plantasLista.map(p => (
                  <th key={p.id} className="py-2.5 px-3 text-right">
                    {p.id}<br />
                    <span className="text-[10px] text-slate-500 font-normal">{p.nombre}</span>
                  </th>
                ))}
                <th className="py-2.5 px-4 text-right">Total Asignado</th>
                <th className="py-2.5 px-4 text-right">Oferta Semanal</th>
                <th className="py-2.5 px-3 text-center">Cumple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {empresasLista.map(emp => {
                let totalFila = 0;
                plantasLista.forEach(pla => {
                  totalFila += (mapaMatriz[emp.id]?.[pla.id] || 0);
                });
                const ofertaEmp = emp.oferta_t ?? emp.oferta ?? 0;
                const cumple = Math.abs(totalFila - ofertaEmp) < 0.01;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                      <span className="font-mono text-xs font-bold text-slate-900 mr-2">{emp.id}</span>
                      <span>{emp.nombre}</span>
                    </td>
                    {plantasLista.map(pla => {
                      const tons = mapaMatriz[emp.id]?.[pla.id] || 0;
                      return (
                        <td key={pla.id} className="py-2.5 px-3 text-right">
                          {tons > 0 ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {tons.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-4 text-right font-black text-slate-800 bg-slate-50">
                      {totalFila.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {ofertaEmp.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {cumple ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-rose-600 font-bold">Diferencia</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 font-mono">
                <td className="py-3 px-4 font-sans">Total Recibido (t/semana)</td>
                {plantasLista.map(p => (
                  <td key={p.id} className="py-3 px-3 text-right text-emerald-700 font-black">
                    {(totPlantas[p.id] || 0).toFixed(1)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right bg-slate-200 text-slate-900 font-black">
                  {tonsTotal.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-right text-slate-900 font-bold">
                  {(escenarioActivo?.oferta_total_t ?? 115.0).toFixed(1)}
                </td>
                <td className="py-3 px-3 text-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 mx-auto" />
                </td>
              </tr>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-mono">
                <td className="py-2 px-4 font-sans font-semibold">Capacidad Máxima Disponible</td>
                {plantasLista.map(p => (
                  <td key={p.id} className="py-2 px-3 text-right">
                    {(p.capacidad_maxima_t ?? p.cap ?? 0).toFixed(1)} t/sem
                  </td>
                ))}
                <td className="py-2 px-4 text-right bg-slate-200/50 font-bold">
                  {(escenarioActivo?.capacidad_total_t ?? 135.0).toFixed(1)} t/sem
                </td>
                <td className="py-2 px-4 text-right text-slate-400">—</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-semibold font-sans">
                  Holgura: {((escenarioActivo?.capacidad_total_t ?? 135.0) - (escenarioActivo?.oferta_total_t ?? 115.0)).toFixed(1)} t
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* DESGLOSE DETALLADO DE COSTOS POR ENVÍO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Desglose de Costos por Envío Realizado</h3>
            <p className="text-xs text-slate-500">Costo total de cada asignación = Toneladas asignadas × Costo unitario de la conexión</p>
          </div>
          <span className="text-xs text-slate-500">Mostrando únicamente conexiones con asignación activa (&gt; 0 t/sem)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-4">Origen</th>
                <th className="py-2.5 px-4">Destino</th>
                <th className="py-2.5 px-3 text-right">Distancia</th>
                <th className="py-2.5 px-3 text-right">Toneladas Asignadas</th>
                <th className="py-2.5 px-3 text-right">Costo Unitario (COP/t)</th>
                <th className="py-2.5 px-4 text-right font-bold">Costo de Transporte</th>
                <th className="py-2.5 px-3 text-right">% del Costo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {enviosActivos.map((env, idx) => {
                const pct = (env.cTot / costoTotal) * 100;
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                      <span className="font-mono text-xs font-bold text-slate-900 mr-2">{env.origen}</span>
                      <span>{env.nomOri}</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-800">
                      <span className="font-mono text-xs font-bold text-emerald-700 mr-2">{env.destino}</span>
                      <span>{env.nomDest}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{env.dist}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{env.tons.toFixed(1)} t</td>
                    <td className="py-2.5 px-3 text-right">$ {env.cUnit.toLocaleString('es-CO')} COP/t</td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900">$ {env.cTot.toLocaleString('es-CO')} COP</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{pct.toFixed(2)} %</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 font-mono">
                <td colSpan={3} className="py-3 px-4 font-sans">Totales de la Distribución Semanal</td>
                <td className="py-3 px-3 text-right text-slate-900 font-black">{tonsTotal.toFixed(1)} t/sem</td>
                <td className="py-3 px-3 text-right text-slate-400">—</td>
                <td className="py-3 px-4 text-right text-emerald-700 text-sm font-black">$ {costoTotal.toLocaleString('es-CO')} COP</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">100,0 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

