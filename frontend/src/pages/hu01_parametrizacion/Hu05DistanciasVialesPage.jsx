import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Route, Map as MapIcon, Grid, ListFilter, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MapaLeafletOSRM } from '../../components/common/MapaLeafletOSRM';

export function Hu05DistanciasVialesPage() {
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo } = useSession();

  const [vistaActiva, setVistaActiva] = useState('MATRIZ'); // MATRIZ, LISTA, MAPA
  const [empresaFiltro, setEmpresaFiltro] = useState('TODOS');
  const [plantaFiltro, setPlantaFiltro] = useState('TODAS');
  const [rutas, setRutas] = useState([]);
  const [cargandoRutas, setCargandoRutas] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const empresas = escenarioActivo?.empresas || [];
  const plantas = escenarioActivo?.plantas || [];

  const cargarRutas = async () => {
    setCargandoRutas(true);
    try {
      const data = await api.consultarRutas(escenarioActivoId, empresaFiltro, plantaFiltro);
      if (data?.rutas) {
        setRutas(data.rutas);
      }
    } catch (err) {
      console.warn("Error cargando rutas del backend, usando rutas de la sesión:", err.message);
      if (escenarioActivo?.rutas) {
        let filtradas = escenarioActivo.rutas;
        if (empresaFiltro !== 'TODOS') filtradas = filtradas.filter(r => r.empresa_id === empresaFiltro);
        if (plantaFiltro !== 'TODAS') filtradas = filtradas.filter(r => r.planta_id === plantaFiltro);
        setRutas(filtradas);
      }
    } finally {
      setCargandoRutas(false);
    }
  };

  useEffect(() => {
    cargarRutas();
  }, [escenarioActivoId, empresaFiltro, plantaFiltro]);

  const handleReintentar = async (rutaId) => {
    setReintentando(true);
    setMensaje({ tipo: '', texto: '' });
    try {
      await api.reintentarRutaOsrm(escenarioActivoId, rutaId);
      await recargarEscenarioActivo();
      await cargarRutas();
      setMensaje({ tipo: 'exito', texto: `Ruta ${rutaId} recalculada exitosamente con OSRM.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al reintentar OSRM' });
    } finally {
      setReintentando(false);
    }
  };

  // Preparar matriz de distancias dinámica
  const obtenerDistancia = (empId, plaId) => {
    const rId = `${empId}->${plaId}`;
    const r = rutas.find(x => x.id === rId) || (escenarioActivo?.rutas || []).find(x => x.id === rId);
    return r?.distancia_km;
  };

  // Preparar polilínea seleccionada para el mapa
  const rutaSeleccionada = rutas.find(r =>
    (empresaFiltro !== 'TODOS' ? r.empresa_id === empresaFiltro : true) &&
    (plantaFiltro !== 'TODAS' ? r.planta_id === plantaFiltro : true) &&
    r.geometria && r.geometria.length > 0
  );

  const polilineasMapa = [];
  if (rutaSeleccionada && Array.isArray(rutaSeleccionada.geometria)) {
    // GeoJSON viene como [lon, lat], Leaflet requiere [lat, lon]
    const coordsLeaflet = rutaSeleccionada.geometria.map(pt => [pt[1], pt[0]]);
    polilineasMapa.push({
      ruta_id: rutaSeleccionada.id,
      coordenadas: coordsLeaflet,
      destacado: true,
      color: '#059669',
      tooltip: `${rutaSeleccionada.id}: ${rutaSeleccionada.distancia_km} km`
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Rutas y Distancias Viales
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo de distancias sobre red vial real con trazado OSRM. Unidad de distancia: <strong>km</strong>.
          </p>
        </div>

        {/* Conmutador de 3 Vistas */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setVistaActiva('MATRIZ')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'MATRIZ' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Matriz 10×4</span>
          </button>
          <button
            onClick={() => setVistaActiva('LISTA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'LISTA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Listado 40 Conexiones</span>
          </button>
          <button
            onClick={() => setVistaActiva('MAPA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'MAPA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Mapa Vial OSRM</span>
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* VISTA 1: MATRIZ 10 x 4 */}
      {vistaActiva === 'MATRIZ' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Matriz de Distancias Viales (10 Empresas × 4 Plantas)
              </h3>
              <p className="text-[11px] text-slate-500">
                Se resalta en verde esmeralda la planta vial más cercana por fila. En ámbar las conexiones bloqueadas («No disponible»).
              </p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">Unidad: <strong>km</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa Generadora</th>
                  {plantas.map(pla => (
                    <th key={pla.id} className="px-4 py-3">
                      <div>{pla.id}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{pla.nombre.replace('Planta ', '')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {empresas.map((emp) => {
                  // Hallar el mínimo de la fila para destacarlo
                  const distanciasFila = plantas.map(p => obtenerDistancia(emp.id, p.id)).filter(d => d != null);
                  const minDist = distanciasFila.length > 0 ? Math.min(...distanciasFila) : null;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-left">
                        <strong className="text-slate-900">{emp.id}</strong>
                        <span className="text-slate-500 text-[11px] ml-2">({emp.nombre})</span>
                      </td>
                      {plantas.map(pla => {
                        const dist = obtenerDistancia(emp.id, pla.id);
                        const esMin = dist != null && dist === minDist;
                        return (
                          <td key={pla.id} className="px-4 py-3">
                            {dist != null ? (
                              <span className={`px-2.5 py-1 rounded-md font-bold font-mono ${
                                esMin
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'text-slate-700'
                              }`}>
                                {dist.toFixed(1)} km
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                                No disponible
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: LISTADO DE 40 CONEXIONES */}
      {vistaActiva === 'LISTA' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Catálogo de Conexiones de Red ({rutas.length})
            </h3>

            {/* Filtros */}
            <div className="flex items-center gap-3 text-xs">
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="TODOS">Todas las Empresas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.id} · {e.nombre}</option>)}
              </select>

              <select
                value={plantaFiltro}
                onChange={(e) => setPlantaFiltro(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="TODAS">Todas las Plantas</option>
                {plantas.map(p => <option key={p.id} value={p.id}>{p.id} · {p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto px-6 pb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">ID Conexión</th>
                  <th className="px-4 py-2.5">Origen</th>
                  <th className="px-4 py-2.5">Destino</th>
                  <th className="px-4 py-2.5 text-right">Distancia (km)</th>
                  <th className="px-4 py-2.5 text-center">Estado OSRM</th>
                  <th className="px-4 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {rutas.map((ruta) => (
                  <tr key={ruta.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">{ruta.id}</td>
                    <td className="px-4 py-2.5">{ruta.empresa_id}</td>
                    <td className="px-4 py-2.5">{ruta.planta_id}</td>
                    <td className="px-4 py-2.5 text-right font-black">
                      {ruta.distancia_km != null ? `${ruta.distancia_km.toFixed(1)} km` : (
                        <span className="text-amber-700">No disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ruta.estado_consulta === 'calculada' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        ruta.estado_consulta === 'sin_ruta' ? 'bg-slate-100 text-slate-600 border border-slate-300' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ruta.estado_consulta}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleReintentar(ruta.id)}
                        disabled={reintentando}
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Reintentar consulta vial con OSRM"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: RECORRIDOS EN MAPA LEAFLET + OSRM */}
      {vistaActiva === 'MAPA' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-700">Trazar Conexión Vial:</span>
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
              >
                {empresas.map(e => <option key={e.id} value={e.id}>{e.id} · {e.nombre}</option>)}
              </select>

              <span>➔</span>

              <select
                value={plantaFiltro}
                onChange={(e) => setPlantaFiltro(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
              >
                {plantas.map(p => <option key={p.id} value={p.id}>{p.id} · {p.nombre}</option>)}
              </select>
            </div>

            {rutaSeleccionada && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Distancia: <strong className="text-emerald-700 text-sm">{rutaSeleccionada.distancia_km != null ? `${rutaSeleccionada.distancia_km} km` : 'No disponible'}</strong>
                </span>
                <button
                  onClick={() => handleReintentar(rutaSeleccionada.id)}
                  disabled={reintentando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar Ruta OSRM</span>
                </button>
              </div>
            )}
          </div>

          <MapaLeafletOSRM
            center={[4.15, -73.61]}
            zoom={9}
            empresas={empresas}
            plantas={plantas}
            polilineas={polilineasMapa}
            height="520px"
          />
        </div>
      )}
    </div>
  );
}

export default Hu05DistanciasVialesPage;

