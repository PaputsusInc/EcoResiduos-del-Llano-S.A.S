import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Factory, Plus, Edit2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { TarjetaKPI } from '../../components/common/TarjetaKPI';
import { MapaLeafletOSRM } from '../../components/common/MapaLeafletOSRM';

export function Hu02PlantasProcesadorasPage() {
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo } = useSession();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [plantaEnEdicion, setPlantaEnEdicion] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargandoGuardar, setCargandoGuardar] = useState(false);

  const plantas = escenarioActivo?.plantas || [];
  const capacidadTotal = plantas.reduce((sum, p) => sum + (p.capacidad_maxima_t || 0), 0);
  const ofertaTotal = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((sum, e) => sum + (e.oferta_t || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);
  const holgura = capacidadTotal - ofertaTotal;

  const abrirModalNueva = () => {
    const nextNum = plantas.length + 1;
    const nextId = `PLA-${nextNum < 10 ? '0' + nextNum : nextNum}`;
    setPlantaEnEdicion({
      id: nextId,
      nombre: '',
      ubicacion: 'Acacías (Zona Agroindustrial)',
      latitud: 3.98,
      longitud: -73.76,
      capacidad_maxima_t: 20.0,
      costo_operacion_t: 0,
      residuos_admitidos: ['Palma de aceite', 'Cascarilla de arroz']
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (pla) => {
    setPlantaEnEdicion({ ...pla });
    setModalAbierto(true);
  };

  const handleGuardarPlanta = async (e) => {
    e.preventDefault();
    if (!plantaEnEdicion.id || !plantaEnEdicion.nombre) {
      setMensaje({ tipo: 'error', texto: 'El ID y Nombre de la planta son requeridos.' });
      return;
    }

    if (plantaEnEdicion.latitud < -90 || plantaEnEdicion.latitud > 90 ||
        plantaEnEdicion.longitud < -180 || plantaEnEdicion.longitud > 180) {
      setMensaje({ tipo: 'error', texto: 'Coordenadas fuera del rango permitido: Latitud [-90, 90], Longitud [-180, 180].' });
      return;
    }

    setCargandoGuardar(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await api.guardarPlanta(escenarioActivoId, plantaEnEdicion);
      await recargarEscenarioActivo();
      setModalAbierto(false);
      setMensaje({ tipo: 'exito', texto: `Planta ${plantaEnEdicion.id} guardada exitosamente y rutas viales recalculadas.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar planta' });
    } finally {
      setCargandoGuardar(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Plantas Procesadoras
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Puntos de destino, capacidad máxima semanal admisible (t/semana) y compatibilidad técnica de procesamiento.
          </p>
        </div>

        <button
          onClick={abrirModalNueva}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Planta</span>
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaKPI
          titulo="Total Plantas"
          valor={plantas.length}
          unidad="nodos"
          subtexto="Instalaciones receptoras"
          color="emerald"
          icono={Factory}
        />
        <TarjetaKPI
          titulo="Capacidad Conjunta"
          valor={capacidadTotal.toFixed(1)}
          unidad="t/semana"
          subtexto="Límite máximo procesable"
          color="blue"
        />
        <TarjetaKPI
          titulo="Holgura Operativa"
          valor={holgura >= 0 ? `+${holgura.toFixed(1)}` : holgura.toFixed(1)}
          unidad="t/semana"
          subtexto={holgura >= 0 ? "Capacidad excede la oferta" : "Capacidad superada"}
          color={holgura >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* Barra de Distribución de Capacidad */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">Distribución de Capacidad Instalada por Planta</span>
          <span className="text-slate-500 font-medium">Total: <strong>{capacidadTotal.toFixed(1)} t/semana</strong></span>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {plantas.map((pla, idx) => {
            const pct = capacidadTotal > 0 ? ((pla.capacidad_maxima_t || 0) / capacidadTotal) * 100 : 0;
            const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-amber-600', 'bg-purple-600', 'bg-teal-600'];
            return (
              <div
                key={pla.id}
                style={{ width: `${pct}%` }}
                className={`${colors[idx % colors.length]} transition-all`}
                title={`${pla.nombre}: ${pla.capacidad_maxima_t} t/sem (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-600">
          {plantas.map((pla, idx) => {
            const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-amber-600', 'bg-purple-600', 'bg-teal-600'];
            return (
              <div key={pla.id} className="flex items-center gap-1.5 font-medium">
                <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                <span>{pla.id} · {pla.nombre}: <strong>{pla.capacidad_maxima_t?.toFixed(1)} t/sem</strong></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla de Plantas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Plantas Procesadoras Registradas ({plantas.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Unidad de capacidad: <strong>t/semana</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre Planta</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3 text-center">Latitud</th>
                <th className="px-4 py-3 text-center">Longitud</th>
                <th className="px-4 py-3 text-right">Capacidad Máxima (t/semana)</th>
                <th className="px-4 py-3 text-right">Operación (COP/t)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
              {plantas.map((pla) => (
                <tr key={pla.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-800">{pla.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{pla.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{pla.ubicacion}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{pla.latitud?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{pla.longitud?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{pla.capacidad_maxima_t?.toFixed(1)} t/semana</td>
                  <td className="px-4 py-3 text-right text-slate-700">$ {Number(pla.costo_operacion_t || 0).toLocaleString('es-CO')}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => abrirModalEditar(pla)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Editar planta y ubicación"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición de Planta */}
      {modalAbierto && plantaEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Factory className="w-4 h-4 text-emerald-600" />
                <span>Parametrización de Planta ({plantaEnEdicion.id})</span>
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleGuardarPlanta} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">ID Planta:</label>
                  <input
                    type="text"
                    required
                    value={plantaEnEdicion.id}
                    onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, id: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                    readOnly={plantas.some(p => p.id === plantaEnEdicion.id)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    required
                    value={plantaEnEdicion.nombre}
                    onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, nombre: e.target.value })}
                    placeholder="Ej. Planta Villavicencio"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Costo de procesamiento (COP/t):</label>
                <input type="number" min="0" step="1" required value={plantaEnEdicion.costo_operacion_t ?? 0}
                  onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, costo_operacion_t: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full min-h-11 rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-emerald-500" />
                <p className="mt-1 text-xs text-slate-500">Se suma al costo logístico por tonelada recibida en esta planta.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Ubicación / Sector:</label>
                  <input
                    type="text"
                    required
                    value={plantaEnEdicion.ubicacion}
                    onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, ubicacion: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Capacidad Máxima (t/semana):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={plantaEnEdicion.capacidad_maxima_t}
                    onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, capacidad_maxima_t: parseFloat(e.target.value) })}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Selector de Coordenadas con Mapa Interactivo */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ubicación Geográfica en Mapa OpenStreetMap</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 font-semibold">
                    [{plantaEnEdicion.latitud?.toFixed(4)}, {plantaEnEdicion.longitud?.toFixed(4)}]
                  </span>
                </div>

                {/* Mapa Leaflet interactivo embebido (~240px) */}
                <div className="h-60 w-full rounded-lg overflow-hidden border border-slate-300">
                  <MapaLeafletOSRM
                    center={[
                      plantaEnEdicion.latitud != null && !isNaN(plantaEnEdicion.latitud) ? plantaEnEdicion.latitud : 4.15,
                      plantaEnEdicion.longitud != null && !isNaN(plantaEnEdicion.longitud) ? plantaEnEdicion.longitud : -73.61
                    ]}
                    zoom={10}
                    height="100%"
                    marcadorEdicion={{
                      latitud: plantaEnEdicion.latitud,
                      longitud: plantaEnEdicion.longitud,
                      rotulo: plantaEnEdicion.nombre || plantaEnEdicion.id || "Planta",
                      onDragEnd: (lat, lon) => {
                        setPlantaEnEdicion(prev => ({
                          ...prev,
                          latitud: parseFloat(lat.toFixed(6)),
                          longitud: parseFloat(lon.toFixed(6))
                        }));
                      }
                    }}
                    onMapClick={(lat, lon) => {
                      setPlantaEnEdicion(prev => ({
                        ...prev,
                        latitud: parseFloat(lat.toFixed(6)),
                        longitud: parseFloat(lon.toFixed(6))
                      }));
                    }}
                  />
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  Haz clic en el mapa o arrastra el marcador para fijar la coordenada. También puedes editar los valores con el teclado:
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block">Latitud [-90, 90]:</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="-90"
                      max="90"
                      value={plantaEnEdicion.latitud}
                      onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, latitud: parseFloat(e.target.value) })}
                      className="w-full text-xs font-mono px-2 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block">Longitud [-180, 180]:</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="-180"
                      max="180"
                      value={plantaEnEdicion.longitud}
                      onChange={(e) => setPlantaEnEdicion({ ...plantaEnEdicion, longitud: parseFloat(e.target.value) })}
                      className="w-full text-xs font-mono px-2 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoGuardar}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  {cargandoGuardar ? 'Guardando...' : 'Guardar y Recalcular Rutas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Hu02PlantasProcesadorasPage;
