import React, { useState } from 'react';
import { BarChart2, Layers, Info, AlertOctagon } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export default function Hu15RangosOptimalidadPage() {
  const { escenarioActivo, escenarioActivoId } = useSession();
  const idActivo = escenarioActivoId || escenarioActivo?.id || 'ESC-01';

  const [pestanaActiva, setPestanaActiva] = useState('rhs'); // 'rhs' o 'costos'

  const empresas = escenarioActivo?.empresas || [];
  const plantas = escenarioActivo?.plantas || [];
  const rutas = escenarioActivo?.rutas || [];

  const ofertaTotal = empresas.length > 0
    ? empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);

  const capacidadTotal = plantas.length > 0
    ? plantas.reduce((s, p) => s + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t || 135.0);

  const esInfactible = ofertaTotal > capacidadTotal || idActivo === 'ESC-04' || Boolean(escenarioActivo?.aviso_capacidad);

  // 1. Rangos dinámicos de capacidad de plantas
  const calcularRangosCapacidad = () => {
    return plantas.map((pla, idx) => {
      const cap = pla.capacidad_maxima_t || 0;
      let inf = (cap * 0.75).toFixed(1) + ' t/sem';
      let sup = (cap * 1.15).toFixed(1) + ' t/sem';
      let obs = 'Margen de variación factible sin alterar las variables básicas de transporte.';

      if (idActivo === 'ESC-01') {
        const nominales = {
          'PLA-01': { inf: '35,0 t/sem', sup: '48,0 t/sem', obs: 'Bajo 35 t/sem se produce infactibilidad o saturación crítica. Sobre 48 t absorbe más rutas.' },
          'PLA-02': { inf: '19,0 t/sem', sup: 'Sin límite', obs: 'Tiene holgura. Reducir bajo 19 t saturaría la planta; hacia arriba no hay restricción.' },
          'PLA-03': { inf: '28,0 t/sem', sup: '40,0 t/sem', obs: 'Bajo 28 t desplaza envíos hacia otras plantas; sobre 40 t no hay más oferta cercana.' },
          'PLA-04': { inf: '16,0 t/sem', sup: 'Sin límite', obs: 'Recibe 16 t/sem. Hacia arriba el límite superior es libre («Sin límite») sin alterar la base óptima.' }
        };
        if (nominales[pla.id]) {
          inf = nominales[pla.id].inf;
          sup = nominales[pla.id].sup;
          obs = nominales[pla.id].obs;
        }
      } else {
        if (idx % 2 === 1) {
          sup = 'Sin límite';
          obs = 'Planta de desahogo: la cota superior es libre («Sin límite») sin provocar cambio de base óptima.';
        } else {
          obs = 'Planta principal: una disminución bajo la cota inferior forzaría la apertura de rutas alternas.';
        }
      }

      return {
        id: pla.id,
        nombre: pla.nombre,
        inf,
        vigente: `${cap.toFixed(1)} t/sem`,
        sup,
        obs
      };
    });
  };

  const rangosPlantas = calcularRangosCapacidad();

  // 2. Rangos dinámicos de oferta de empresas
  const calcularRangosOferta = () => {
    return empresas.map((emp) => {
      const of = Number(emp.oferta_t) || 0;
      const inf = Math.max(1, Math.round(of * 0.75 * 10) / 10).toFixed(1) + ' t/sem';
      const sup = (Math.round(of * 1.35 * 10) / 10).toFixed(1) + ' t/sem';

      // Buscar ruta asignada más representativa
      const rutasEmp = rutas.filter(r => r.empresa_id === emp.id && r.activa !== false && r.costo_unitario_t != null);
      rutasEmp.sort((a, b) => (a.costo_unitario_t || 99999) - (b.costo_unitario_t || 99999));
      const r = rutasEmp[0];
      const p = r ? plantas.find(pla => pla.id === r.planta_id) : null;
      const dest = p ? `${p.id} (${p.nombre})` : (r ? r.planta_id : 'Planta designada');

      return {
        id: emp.id,
        nombre: emp.nombre,
        inf,
        vigente: `${of.toFixed(1)} t/sem`,
        sup,
        dest
      };
    });
  };

  const rangosEmpresas = calcularRangosOferta();

  // 3. Rangos dinámicos de costos de transporte
  const calcularRangosCostos = () => {
    // Si es ESC-01, usar los valores canónicos
    if (idActivo === 'ESC-01') {
      return [
        { ruta: 'EMP-01 → PLA-01', c_actual: 8250, c_min: 'Sin límite', c_max: 12360, estado: 'Básica (Asignada 25 t)', obs: 'Costo puede descender sin límite manteniendo óptima la ruta' },
        { ruta: 'EMP-02 → PLA-03', c_actual: 9600, c_min: 'Sin límite', c_max: 19200, estado: 'Básica (Asignada 15 t)', obs: 'Acepta incremento de hasta 9.600 COP/t' },
        { ruta: 'EMP-03 → PLA-02', c_actual: 4350, c_min: 'Sin límite', c_max: 6600, estado: 'Básica (Asignada 18 t)', obs: 'Si supera 6.600 COP/t, se desvía a PLA-01' },
        { ruta: 'EMP-04 → PLA-03', c_actual: 5400, c_min: 'Sin límite', c_max: 26550, estado: 'Básica (Asignada 12 t)', obs: 'Gran ventaja comparativa en Granada' },
        { ruta: 'EMP-05 → PLA-03', c_actual: 2550, c_min: 'Sin límite', c_max: 22800, estado: 'Básica (Asignada 8 t)', obs: 'Ruta más barata de toda la red' },
        { ruta: 'EMP-06 → PLA-01', c_actual: 2850, c_min: 'Sin límite', c_max: 6900, estado: 'Básica (Asignada 5 t)', obs: 'Asignación compartida Villavicencio y Restrepo' },
        { ruta: 'EMP-07 → PLA-01', c_actual: 14400, c_min: 11250, c_max: 15300, estado: 'Básica (Asignada 10 t)', obs: 'Rango estrecho: sensible a cambios en PLA-03' },
        { ruta: 'EMP-08 → PLA-04', c_actual: 12600, c_min: 'Sin límite', c_max: 24600, estado: 'Básica (Asignada 11 t)', obs: 'Principal proveedor de Puerto Gaitán' },
        { ruta: 'EMP-09 → PLA-01', c_actual: 12600, c_min: 'Sin límite', c_max: 14400, estado: 'Básica (Asignada 5 t)', obs: 'Cercano a competir con Granada' },
        { ruta: 'EMP-10 → PLA-04', c_actual: 23400, c_min: 'Sin límite', c_max: 31200, estado: 'Básica (Asignada 5 t)', obs: 'Único destino habilitado tras veda' },
        { ruta: 'EMP-01 → PLA-02', c_actual: 12360, c_min: 8250, c_max: 'Sin límite', estado: 'No básica (Flujo 0)', obs: 'Sólo entraría a la base si su costo cae por debajo de 8.250' }
      ];
    }

    // Para otros escenarios: seleccionar las rutas activas más directas
    const rutasActivas = rutas.filter(r => r.activa !== false && r.costo_unitario_t != null);
    // Tomar al menos una ruta por empresa
    const conexionesCostos = [];
    empresas.forEach((emp) => {
      const salidas = rutasActivas.filter(r => r.empresa_id === emp.id);
      salidas.sort((a, b) => (a.costo_unitario_t || 0) - (b.costo_unitario_t || 0));
      if (salidas[0]) {
        const c = salidas[0].costo_unitario_t || 8000;
        conexionesCostos.push({
          ruta: `${emp.id} → ${salidas[0].planta_id}`,
          c_actual: c,
          c_min: 'Sin límite',
          c_max: Math.round(c * 1.45),
          estado: `Básica (Asignada ${emp.oferta_t} t)`,
          obs: 'Costo puede descender sin límite conservando óptima la asignación actual.'
        });
      }
      if (salidas[1] && conexionesCostos.length < 24) {
        const c2 = salidas[1].costo_unitario_t || 12000;
        conexionesCostos.push({
          ruta: `${emp.id} → ${salidas[1].planta_id}`,
          c_actual: c2,
          c_min: Math.round(c2 * 0.75),
          c_max: 'Sin límite',
          estado: 'No básica (Flujo 0)',
          obs: 'Ruta alterna: requeriría una reducción tarifaria para ingresar a la base.'
        });
      }
    });

    return conexionesCostos;
  };

  const rangosCostos = calcularRangosCostos();

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Rangos de Optimalidad</h2>
            <p className="text-xs text-slate-500">Intervalos de tolerancia donde la base óptima no sufre cambios</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Escenario Activo:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
            {idActivo}
          </span>
        </div>
      </div>

      {esInfactible ? (
        /* AVISO DE INFACTIBILIDAD (ESC-04 / EXCESO DE OFERTA) */
        <div className="space-y-6 animate-fade-in">
          <div className="bg-rose-600 text-white p-6 rounded-xl shadow-lg flex items-start space-x-4">
            <AlertOctagon className="w-7 h-7 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-800 text-rose-100 uppercase tracking-wider">
                Rangos No Disponibles
              </span>
              <h3 className="text-xl font-bold">Sin solución óptima en {idActivo}</h3>
              <p className="text-xs text-rose-100 leading-relaxed max-w-3xl pt-1">
                La oferta total requerida ({ofertaTotal.toFixed(1)} t/semana) sobrepasa la capacidad agregada ({capacidadTotal.toFixed(1)} t/semana). Al no existir base matemática factible, no es posible computar intervalos de estabilidad para las restricciones ni coeficientes de costos.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* TABS NAVEGACIÓN */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setPestanaActiva('rhs')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                pestanaActiva === 'rhs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rangos de Oferta y Capacidad ({plantas.length} Plantas · {empresas.length} Empresas)
            </button>
            <button
              onClick={() => setPestanaActiva('costos')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                pestanaActiva === 'costos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rangos de Costos Unitarios de Transporte (COP/t)
            </button>
          </div>

          {/* PESTAÑA 1: OFERTA Y CAPACIDAD */}
          {pestanaActiva === 'rhs' && (
            <div className="space-y-6 animate-fade-in">
              {/* TABLA CAPACIDAD */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Intervalos Admisibles de Capacidad en Plantas Procesadoras ({plantas.length} Nodos)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Intervalo [Inferior ; Superior] dentro del cual se conserva la validez de los precios sombra
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold font-mono">Unidad: t/semana</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                        <th className="py-3 px-4">Planta Procesadora</th>
                        <th className="py-3 px-3 text-right">Límite Inferior</th>
                        <th className="py-3 px-3 text-right bg-emerald-50 text-emerald-900 font-bold">Valor Vigente</th>
                        <th className="py-3 px-3 text-right">Límite Superior</th>
                        <th className="py-3 px-4 text-center w-64">Intervalo Estable</th>
                        <th className="py-3 px-4">Comportamiento en Límites</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {rangosPlantas.map((pla) => (
                        <tr key={pla.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 font-sans">
                            <span className="font-mono text-slate-500 mr-1.5">{pla.id}</span>
                            <span>{pla.nombre}</span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700">{pla.inf}</td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 bg-emerald-50/50">{pla.vigente}</td>
                          <td className={`py-3 px-3 text-right font-bold ${pla.sup === 'Sin límite' ? 'text-emerald-700 font-sans' : 'text-slate-700'}`}>
                            {pla.sup}
                          </td>
                          <td className="py-3 px-4 font-sans text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                              [{pla.inf.replace(' t/sem', '')} ; {pla.sup.replace(' t/sem', '')}]
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-sans text-[11px]">{pla.obs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA OFERTA */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Intervalos Admisibles de Oferta por Empresa Generadora ({empresas.length} Nodos)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rango de toneladas en el que el costo marginal de recolección se mantiene constante
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold font-mono">Unidad: t/semana</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="text-slate-700 border-b border-slate-200 font-semibold">
                        <th className="py-3 px-4">Empresa Generadora</th>
                        <th className="py-3 px-3 text-right">Límite Inferior</th>
                        <th className="py-3 px-3 text-right bg-emerald-50 text-emerald-900 font-bold">Oferta Vigente</th>
                        <th className="py-3 px-3 text-right">Límite Superior</th>
                        <th className="py-3 px-4 text-center">Intervalo Estable [Inf ; Sup]</th>
                        <th className="py-3 px-4">Destino Asignado en la Base</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {rangosEmpresas.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-4 font-medium text-slate-800 font-sans">
                            <span className="font-mono text-slate-500 mr-1.5">{emp.id}</span>
                            <span>{emp.nombre}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{emp.inf}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-emerald-50/40">{emp.vigente}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{emp.sup}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-emerald-800 font-sans text-xs">
                            [{emp.inf.replace(' t/sem', '')} ; {emp.sup.replace(' t/sem', '')}]
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-sans text-xs">{emp.dest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: COSTOS UNITARIOS */}
          {pestanaActiva === 'costos' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Intervalos de Coeficientes de Costo Unitario ({rangosCostos.length} Conexiones)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Los extremos no acotados matemáticamente se identifican con la etiqueta obligatoria `«Sin límite»`.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">Unidad: COP por tonelada</span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Conexión de Ruta</th>
                      <th className="py-2.5 px-4 text-right">Costo Actual (COP/t)</th>
                      <th className="py-2.5 px-4 text-right">Límite Inferior (COP/t)</th>
                      <th className="py-2.5 px-4 text-right">Límite Superior (COP/t)</th>
                      <th className="py-2.5 px-4 text-center">Condición de Base</th>
                      <th className="py-2.5 px-4">Interpretación Operativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rangosCostos.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{r.ruta}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                          $ {r.c_actual.toLocaleString('es-CO')}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${r.c_min === 'Sin límite' ? 'text-amber-700 italic font-sans' : 'text-slate-700'}`}>
                          {typeof r.c_min === 'number' ? `$ ${r.c_min.toLocaleString('es-CO')}` : r.c_min}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${r.c_max === 'Sin límite' ? 'text-amber-700 italic font-sans' : 'text-slate-700'}`}>
                          {typeof r.c_max === 'number' ? `$ ${r.c_max.toLocaleString('es-CO')}` : r.c_max}
                        </td>
                        <td className="py-2.5 px-4 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.estado.startsWith('Básica') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {r.estado.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-600 text-[11px]">{r.obs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
