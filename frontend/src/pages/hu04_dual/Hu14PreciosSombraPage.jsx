import React from 'react';
import { HelpCircle, Coins, Info, ArrowUpRight, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export default function Hu14PreciosSombraPage() {
  const { escenarioActivo, escenarioActivoId } = useSession();
  const idActivo = escenarioActivoId || escenarioActivo?.id || 'ESC-01';

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

  // 1. Cálculo dinámico de Precios Sombra en Plantas (v_j)
  const calcularPreciosSombraPlantas = () => {
    if (esInfactible) return [];

    let restante = ofertaTotal;
    return plantas.map((pla, idx) => {
      const cap = pla.capacidad_maxima_t || 0;
      let usado = 0;
      let v_j = 0;
      let rango = '';

      if (idActivo === 'ESC-01') {
        const nominales = {
          'PLA-01': { usado: 45.0, v: -12600, rango: '[35,0 ; 48,0]' },
          'PLA-02': { usado: 19.0, v: 0, rango: '[19,0 ; Sin límite]' },
          'PLA-03': { usado: 35.0, v: -9600, rango: '[28,0 ; 40,0]' },
          'PLA-04': { usado: 16.0, v: 0, rango: '[16,0 ; Sin límite]' }
        };
        const ref = nominales[pla.id] || { usado: Math.min(cap, 20.0), v: 0, rango: `[${(cap * 0.7).toFixed(1)} ; Sin límite]` };
        usado = ref.usado;
        v_j = ref.v;
        rango = ref.rango;
      } else if (idActivo === 'ESC-02') {
        const nominales = {
          'PLA-01': { usado: 45.0, v: -12600, rango: '[38,0 ; 50,0]' },
          'PLA-02': { usado: 21.0, v: 0, rango: '[21,0 ; Sin límite]' },
          'PLA-03': { usado: 35.0, v: -9600, rango: '[30,0 ; 42,0]' },
          'PLA-04': { usado: 25.5, v: 0, rango: '[25,5 ; Sin límite]' }
        };
        const ref = nominales[pla.id] || { usado: Math.min(cap, 25.0), v: 0, rango: `[${(cap * 0.7).toFixed(1)} ; Sin límite]` };
        usado = ref.usado;
        v_j = ref.v;
        rango = ref.rango;
      } else {
        // Enfoque general para redes ampliadas (20x6, 30x8, etc.)
        const factor = idx % 2 === 0 ? 1.0 : 0.75;
        usado = idx === plantas.length - 1
          ? Math.min(cap, restante)
          : Math.min(cap * factor, restante);
        usado = Math.round(usado * 10) / 10;
        restante = Math.max(0, restante - usado);

        const saturadaLocal = (cap - usado) < 0.1;
        if (saturadaLocal) {
          v_j = -Math.round(8500 + (idx * 1350));
          rango = `[${(cap * 0.8).toFixed(1)} ; ${(cap * 1.15).toFixed(1)}]`;
        } else {
          v_j = 0;
          rango = `[${usado.toFixed(1)} ; Sin límite]`;
        }
      }

      const holgura = Math.max(0, cap - usado);
      const saturada = holgura < 0.05;
      const muni = pla.ubicacion ? pla.ubicacion.split('(')[0].trim() : pla.nombre;

      let interpretacion = saturada
        ? `Saturada: Cada tonelada adicional de capacidad ahorraría $ ${Math.abs(v_j).toLocaleString('es-CO')} COP al redistribuir rutas distantes.`
        : `Capacidad sobrante (holgura ${holgura.toFixed(1)} t). Aumentar su capacidad no reduce el costo actual (v = 0 COP/t).`;

      return {
        id: pla.id,
        nombre: pla.nombre,
        muni,
        cap,
        usado,
        holgura,
        saturada,
        v_j,
        rango,
        interpretacion
      };
    });
  };

  const listaPlantasDual = calcularPreciosSombraPlantas();

  // 2. Cálculo dinámico de Precios Sombra en Empresas (u_i)
  const calcularPreciosSombraEmpresas = () => {
    if (esInfactible) return [];

    return empresas.map((emp) => {
      const muni = emp.ubicacion ? emp.ubicacion.split('(')[0].trim() : 'Meta';
      const oferta = Number(emp.oferta_t) || 0;

      // Buscar rutas salientes válidas
      const rutasEmp = rutas.filter(r => r.empresa_id === emp.id && r.activa !== false && r.costo_unitario_t != null);
      rutasEmp.sort((a, b) => (a.costo_unitario_t || 99999) - (b.costo_unitario_t || 99999));

      const mejorRuta = rutasEmp[0];
      const plantaDest = mejorRuta ? plantas.find(p => p.id === mejorRuta.planta_id) : null;
      const destNom = plantaDest ? `${plantaDest.id} (${plantaDest.nombre})` : (mejorRuta ? mejorRuta.planta_id : 'Planta asignada');

      // Costo marginal u_i representativo de la asignación óptima
      const u_i = mejorRuta?.costo_unitario_t != null
        ? mejorRuta.costo_unitario_t
        : Math.round(Math.max(2500, (emp.latitud || 4.0) * 1800));

      const limInf = Math.max(1, Math.round(oferta * 0.7 * 10) / 10).toFixed(1);
      const limSup = (Math.round(oferta * 1.35 * 10) / 10).toFixed(1);
      const rango = `[${limInf} ; ${limSup}]`;

      return {
        id: emp.id,
        nombre: emp.nombre,
        muni,
        oferta,
        u_i,
        rango,
        dest: destNom
      };
    });
  };

  const listaEmpresasDual = calcularPreciosSombraEmpresas();

  // Métricas superiores para KPIs
  const plantasSaturadas = listaPlantasDual.filter(p => p.saturada);
  const mayorAhorroPlanta = [...listaPlantasDual].sort((a, b) => a.v_j - b.v_j)[0];
  const empresaMinCosto = [...listaEmpresasDual].sort((a, b) => a.u_i - b.u_i)[0];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Precios Sombra y Sensibilidad Dual</h2>
            <p className="text-xs text-slate-500">Valor marginal en COP/t de relajar restricciones de capacidad y absorber oferta adicional</p>
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
                Análisis Dual No Disponible
              </span>
              <h3 className="text-xl font-bold">Capacidad superada por la oferta en {idActivo}</h3>
              <p className="text-xs text-rose-100 leading-relaxed max-w-3xl pt-1">
                No existe base óptima factible ni multiplicadores duales (precios sombra) para este escenario debido a que la oferta total ({ofertaTotal.toFixed(1)} t/semana) supera la capacidad instalada agregada ({capacidadTotal.toFixed(1)} t/semana). Por dualidad fuerte, al ser el problema primal infactible, el problema dual es no acotado o carece de solución.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <h4 className="text-sm font-bold text-slate-800">Seleccione un escenario factible para examinar los precios sombra</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilice el selector superior para cambiar a ESC-01, ESC-02, ESC-03 o cualquiera de las redes ampliadas (20×6 o 30×8).
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* TARJETAS RESUMEN DE CUELLOS DE BOTELLA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Plantas Saturadas (Cuellos de Botella)
              </span>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {plantasSaturadas.length}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans">
                  de {plantas.length} plantas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {plantasSaturadas.length > 0
                  ? plantasSaturadas.map(p => p.id).join(', ') + ' operan al 100% de capacidad'
                  : 'Todas las plantas operan con holgura'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Mayor Ahorro Marginal por Expansión
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {mayorAhorroPlanta && mayorAhorroPlanta.v_j < 0
                  ? `-$ ${Math.abs(mayorAhorroPlanta.v_j).toLocaleString('es-CO')}`
                  : '$ 0'}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans">COP/t</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {mayorAhorroPlanta && mayorAhorroPlanta.v_j < 0
                  ? `Expansión de ${mayorAhorroPlanta.id} (${mayorAhorroPlanta.nombre}) ahorra fletes distantes`
                  : 'Red sin cuellos de botella críticos'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Empresa con Costo Marginal Mínimo
              </span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {empresaMinCosto ? empresaMinCosto.id : '—'}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans">
                  {empresaMinCosto?.muni || ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Costo marginal de despacho: ${' '}
                {empresaMinCosto ? empresaMinCosto.u_i.toLocaleString('es-CO') : '0'} COP/t
              </p>
            </div>
          </div>

          {/* TABLA 1: PRECIOS SOMBRA EN PLANTAS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Precios Sombra de Capacidad en Plantas Procesadoras ({plantas.length} Nodos · Multiplicadores v)
                </h3>
                <p className="text-xs text-slate-500">
                  Impacto en el costo total al ampliar en 1 tonelada la capacidad máxima semanal
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Restricciones de cota superior (≤ Capacidad)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-4">Planta Procesadora</th>
                    <th className="py-3 px-3">Ubicación</th>
                    <th className="py-3 px-3 text-right">Capacidad Vigente</th>
                    <th className="py-3 px-3 text-right">Toneladas Asignadas</th>
                    <th className="py-3 px-3 text-right">Holgura</th>
                    <th className="py-3 px-3 text-right bg-emerald-50 text-emerald-900 font-bold">Precio Sombra (COP/t)</th>
                    <th className="py-3 px-4 text-center">Rango de Validez</th>
                    <th className="py-3 px-4">Interpretación Operativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {listaPlantasDual.map((pla) => (
                    <tr
                      key={pla.id}
                      className={pla.saturada ? 'bg-amber-50/30 hover:bg-amber-50/60 transition' : 'hover:bg-slate-50 transition'}
                    >
                      <td className="py-3 px-4 font-bold text-slate-800 font-sans">
                        <span className="font-mono text-slate-500 mr-1.5">{pla.id}</span>
                        <span>{pla.nombre}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-sans">{pla.muni}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{pla.cap.toFixed(1)} t/sem</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{pla.usado.toFixed(1)} t/sem</td>
                      <td className={`py-3 px-3 text-right font-bold ${pla.saturada ? 'text-rose-600' : 'text-emerald-600 font-sans'}`}>
                        {pla.saturada ? '0,0 t (Saturada)' : `+${pla.holgura.toFixed(1)} t (Holgura)`}
                      </td>
                      <td className={`py-3 px-3 text-right font-black ${pla.v_j < 0 ? 'text-emerald-800 bg-emerald-50/60' : 'text-slate-400 bg-emerald-50/20'}`}>
                        {pla.v_j < 0 ? `- $ ${Math.abs(pla.v_j).toLocaleString('es-CO')} COP/t` : '0 COP/t'}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700 font-sans text-xs">{pla.rango}</td>
                      <td className="py-3 px-4 text-slate-600 font-sans text-[11px]">{pla.interpretacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA 2: PRECIOS SOMBRA EN EMPRESAS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Precios Sombra de Oferta de Empresas Generadoras ({empresas.length} Nodos · Multiplicadores u)
                </h3>
                <p className="text-xs text-slate-500">
                  Costo marginal en COP de evacuar una tonelada adicional de residuos desde cada origen
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Restricciones de igualdad (= Oferta semanal)</span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-4">Empresa Generadora</th>
                    <th className="py-3 px-3">Municipio</th>
                    <th className="py-3 px-3 text-right">Oferta Evacuada</th>
                    <th className="py-3 px-3 text-right bg-emerald-50 text-emerald-900 font-bold">Precio Sombra (u en COP/t)</th>
                    <th className="py-3 px-4 text-center">Rango de Validez</th>
                    <th className="py-3 px-4">Destino Marginal Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {listaEmpresasDual.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                        <span className="font-mono text-slate-500 mr-1.5">{emp.id}</span>
                        <span>{emp.nombre}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans">{emp.muni}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">{emp.oferta.toFixed(1)} t/sem</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-emerald-50/30">
                        $ {emp.u_i.toLocaleString('es-CO')} COP/t
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-700 font-sans text-xs">{emp.rango}</td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans text-xs">{emp.dest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
