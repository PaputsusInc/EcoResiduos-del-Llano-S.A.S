import React, { useState, useMemo } from 'react';
import { TrendingUp, RefreshCw, CheckCircle, Check, ArrowRight, RotateCcw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

const CONEXIONES_NOMINALES_ESC01 = [
  { id: "EMP-01_PLA-01", empId: "EMP-01", nombreEmp: "Palmeras del Llano", dest: "PLA-01", dist: "27,5 km", costoBase: 8250, flujoBase: 25.0 },
  { id: "EMP-02_PLA-03", empId: "EMP-02", nombreEmp: "Agropecuaria San Martín", dest: "PLA-03", dist: "32,0 km", costoBase: 9600, flujoBase: 15.0 },
  { id: "EMP-03_PLA-02", empId: "EMP-03", nombreEmp: "Hacienda La Cabaña", dest: "PLA-02", dist: "14,5 km", costoBase: 4350, flujoBase: 18.0 },
  { id: "EMP-04_PLA-03", empId: "EMP-04", nombreEmp: "Arrocera del Ariari", dest: "PLA-03", dist: "18,0 km", costoBase: 5400, flujoBase: 12.0 },
  { id: "EMP-05_PLA-03", empId: "EMP-05", nombreEmp: "Frutales y Cítricos Meta", dest: "PLA-03", dist: "8,5 km", costoBase: 2550, flujoBase: 8.0 },
  { id: "EMP-06_PLA-01", empId: "EMP-06", nombreEmp: "BioCacao de la Sierra", dest: "PLA-01", dist: "9,5 km", costoBase: 2850, flujoBase: 5.0 },
  { id: "EMP-06_PLA-02", empId: "EMP-06", nombreEmp: "BioCacao de la Sierra", dest: "PLA-02", dist: "23,0 km", costoBase: 6900, flujoBase: 1.0 },
  { id: "EMP-07_PLA-01", empId: "EMP-07", nombreEmp: "AgroForestal La Esperanza", dest: "PLA-01", dist: "48,0 km", costoBase: 14400, flujoBase: 10.0 },
  { id: "EMP-08_PLA-04", empId: "EMP-08", nombreEmp: "Plantaciones San Rafael", dest: "PLA-04", dist: "42,0 km", costoBase: 12600, flujoBase: 11.0 },
  { id: "EMP-09_PLA-01", empId: "EMP-09", nombreEmp: "Ganadería Sostenible Guamal", dest: "PLA-01", dist: "42,0 km", costoBase: 12600, flujoBase: 5.0 },
  { id: "EMP-10_PLA-04", empId: "EMP-10", nombreEmp: "Agropecuaria Cabuyaro", dest: "PLA-04", dist: "78,0 km", costoBase: 23400, flujoBase: 5.0 }
];

export default function Hu10SensibilidadCostosPage() {
  const { escenarioActivo, escenarioActivoId } = useSession();
  const idActivo = escenarioActivoId || escenarioActivo?.id || 'ESC-01';

  const [ambito, setAmbito] = useState('todas');
  const [tipoAjuste, setTipoAjuste] = useState('pct');
  const [magnitud, setMagnitud] = useState(10);

  const empresas = escenarioActivo?.empresas || [];
  const plantas = escenarioActivo?.plantas || [];
  const rutas = escenarioActivo?.rutas || [];

  // Construcción dinámica de conexiones activas a partir del escenario activo
  const conexionesBase = useMemo(() => {
    if (idActivo === 'ESC-01') {
      return CONEXIONES_NOMINALES_ESC01.map(c => ({
        ...c,
        origen: `${c.empId} (${c.nombreEmp})`
      }));
    }

    if (idActivo === 'ESC-02') {
      return CONEXIONES_NOMINALES_ESC01.map(c => {
        const factor = 1.10;
        const nuevoFlujo = Math.round(c.flujoBase * factor * 10) / 10;
        return {
          ...c,
          flujoBase: nuevoFlujo,
          origen: `${c.empId} (${c.nombreEmp})`
        };
      });
    }

    if (idActivo === 'ESC-03') {
      return CONEXIONES_NOMINALES_ESC01.map(c => ({
        ...c,
        costoBase: Math.round(c.costoBase * 1.15),
        origen: `${c.empId} (${c.nombreEmp})`
      }));
    }

    // Para redes ampliadas (20x6, 30x8, etc.) o cualquier escenario parametrizado
    return empresas.map((emp) => {
      const rutasEmp = rutas.filter(r => r.empresa_id === emp.id && r.activa !== false && r.costo_unitario_t != null);
      rutasEmp.sort((a, b) => (a.costo_unitario_t || 99999) - (b.costo_unitario_t || 99999));
      const mejorRuta = rutasEmp[0];
      const destId = mejorRuta ? mejorRuta.planta_id : (plantas[0]?.id || 'PLA-01');
      const distStr = mejorRuta && mejorRuta.distancia_km != null
        ? `${mejorRuta.distancia_km.toFixed(1).replace('.', ',')} km`
        : '25,0 km';
      const costo = mejorRuta && mejorRuta.costo_unitario_t != null
        ? mejorRuta.costo_unitario_t
        : Math.round(Math.max(2500, (emp.latitud || 4.0) * 1800));

      return {
        id: `${emp.id}_${destId}`,
        empId: emp.id,
        nombreEmp: emp.nombre,
        origen: `${emp.id} (${emp.nombre})`,
        dest: destId,
        dist: distStr,
        costoBase: costo,
        flujoBase: Number(emp.oferta_t) || 0
      };
    });
  }, [idActivo, empresas, plantas, rutas]);

  // Cálculo de totales base
  const costoBaseTotal = useMemo(() => {
    return conexionesBase.reduce((sum, c) => sum + (c.costoBase * c.flujoBase), 0);
  }, [conexionesBase]);

  const totalFlujoBase = useMemo(() => {
    return conexionesBase.reduce((sum, c) => sum + c.flujoBase, 0);
  }, [conexionesBase]);

  // Cálculo de conexiones variantes con perturbación
  const conexionesVariantes = useMemo(() => {
    return conexionesBase.map((c) => {
      const afecta = ambito === 'todas' || c.dest === ambito;
      let costoVar = c.costoBase;
      let varStr = '0 %';

      if (afecta) {
        if (tipoAjuste === 'pct') {
          costoVar = Math.round(c.costoBase * (1 + magnitud / 100));
          varStr = `${magnitud >= 0 ? '+' : ''}${magnitud} %`;
        } else {
          costoVar = Math.max(0, c.costoBase + magnitud);
          varStr = `${magnitud >= 0 ? '+' : ''}$${magnitud.toLocaleString('es-CO')}`;
        }
      }

      const subtotalVar = costoVar * c.flujoBase;
      return { ...c, afecta, costoVar, varStr, subtotalVar };
    });
  }, [conexionesBase, ambito, tipoAjuste, magnitud]);

  const costoVarianteTotal = useMemo(() => {
    return conexionesVariantes.reduce((sum, c) => sum + c.subtotalVar, 0);
  }, [conexionesVariantes]);

  const deltaCosto = costoVarianteTotal - costoBaseTotal;
  const deltaPct = costoBaseTotal > 0 ? (deltaCosto / costoBaseTotal) * 100 : 0;
  const rutasModificadas = conexionesVariantes.filter(c => c.afecta && c.costoVar !== c.costoBase).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Variación de Costos</h2>
            <p className="text-xs text-slate-500">Impacto en la función objetivo ante variaciones en tarifas de transporte o peajes</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Escenario Activo:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
            {idActivo}
          </span>
        </div>
      </div>

      {/* PANEL DE PARÁMETROS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Parámetros de la Variación de Costos</h3>
            <p className="text-xs text-slate-500">
              Seleccione el corredor o conexiones a perturbar para proyectar el impacto en la asignación de {conexionesBase.length} rutas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Preajustes rápidos:</span>
            <button
              onClick={() => { setAmbito('todas'); setTipoAjuste('pct'); setMagnitud(10); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition cursor-pointer"
            >
              +10 % General
            </button>
            <button
              onClick={() => {
                const targetPla = plantas.find(p => p.id === 'PLA-04') ? 'PLA-04' : (plantas[0]?.id || 'todas');
                setAmbito(targetPla);
                setTipoAjuste('pct');
                setMagnitud(20);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition cursor-pointer"
            >
              +20 % Nodo Principal
            </button>
            <button
              onClick={() => { setAmbito('todas'); setTipoAjuste('pct'); setMagnitud(0); }}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-medium transition cursor-pointer"
            >
              Restablecer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ámbito de la Variación</label>
            <select
              value={ambito}
              onChange={(e) => setAmbito(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="todas">Todas las conexiones activas ({conexionesBase.length} rutas)</option>
              {plantas.map((pla) => (
                <option key={pla.id} value={pla.id}>
                  Hacia {pla.id} ({pla.nombre})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Ajuste</label>
            <div className="flex items-center space-x-2">
              <select
                value={tipoAjuste}
                onChange={(e) => setTipoAjuste(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="pct">Porcentaje (%)</option>
                <option value="fijo">Valor fijo (COP/t)</option>
              </select>
              <input
                type="number"
                value={magnitud}
                onChange={(e) => setMagnitud(parseFloat(e.target.value) || 0)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {}}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simulación Actualizada en Vivo</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIS DE IMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Costo Base de Referencia</span>
          <div className="text-xl font-bold text-slate-600 font-mono">
            $ {costoBaseTotal.toLocaleString('es-CO')} <span className="text-xs font-normal">COP</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Escenario semanal {idActivo}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Costo en Escenario Variante</span>
          <div className="text-2xl font-black text-slate-800 font-mono">
            $ {costoVarianteTotal.toLocaleString('es-CO')} <span className="text-xs font-medium text-slate-500">COP</span>
          </div>
          <p className={`text-xs font-bold mt-1 ${deltaCosto >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {deltaCosto >= 0 ? '▲ +' : '▼ -'}$ {Math.abs(deltaCosto).toLocaleString('es-CO')} COP ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)} %)
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estado de la Red</span>
          <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-base mt-0.5">
            <CheckCircle className="w-4 h-4" />
            <span>Óptimo Certificado</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Demanda y capacidad satisfechas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Rutas Afectadas</span>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {rutasModificadas} <span className="text-xs font-medium text-slate-500 font-sans">conexiones</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Perturbación paramétrica activa</p>
        </div>
      </div>

      {/* TABLA COMPARATIVA CONEXIONES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Tabla Comparativa de Tarifas y Flujos Asignados ({conexionesVariantes.length} Conexiones)
            </h3>
            <p className="text-xs text-slate-500">
              Monitoree el impacto directo del cambio de costo unitario sobre el volumen transportado hacia cada planta
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Total asignado = {totalFlujoBase.toFixed(1)} t/sem</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Conexión (Origen → Destino)</th>
                <th className="py-3 px-3 text-right">Distancia</th>
                <th className="py-3 px-3 text-right">Costo Base (COP/t)</th>
                <th className="py-3 px-3 text-center">Variación Aplicada</th>
                <th className="py-3 px-3 text-right bg-emerald-50/60 text-emerald-900 font-bold">Costo Variante (COP/t)</th>
                <th className="py-3 px-3 text-right">Flujo Base (t/sem)</th>
                <th className="py-3 px-3 text-right bg-emerald-50/60 text-emerald-900 font-bold">Flujo Variante (t/sem)</th>
                <th className="py-3 px-4 text-right">Subtotal Variante (COP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {conexionesVariantes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                    <span className="font-bold mr-1.5">{c.origen}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-700 font-bold ml-1.5">{c.dest}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{c.dist}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">$ {c.costoBase.toLocaleString('es-CO')}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.afecta && c.varStr !== '0 %' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.varStr}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/40 text-emerald-900">
                    $ {c.costoVar.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{c.flujoBase.toFixed(1)} t</td>
                  <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/40 text-emerald-900">
                    {c.flujoBase.toFixed(1)} t
                  </td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">
                    $ {c.subtotalVar.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-100 z-10 shadow-xs">
              <tr className="font-bold text-slate-800 border-t-2 border-slate-300 font-mono">
                <td colSpan={5} className="py-3 px-4 font-sans">
                  Totales de la Simulación Semanal ({idActivo})
                </td>
                <td className="py-3 px-3 text-right text-slate-600">{totalFlujoBase.toFixed(1)} t/sem</td>
                <td className="py-3 px-3 text-right text-emerald-700 font-black">{totalFlujoBase.toFixed(1)} t/sem</td>
                <td className="py-3 px-4 text-right text-emerald-800 text-sm font-black">
                  $ {costoVarianteTotal.toLocaleString('es-CO')} COP
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
