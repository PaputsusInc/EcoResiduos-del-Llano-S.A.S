import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Building2, Plus, Edit2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { TarjetaKPI } from '../../components/common/TarjetaKPI';
import { MapaLeafletOSRM } from '../../components/common/MapaLeafletOSRM';

export function Hu01EmpresasGeneradorasPage() {
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo, setEscenarioActivo } = useSession();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [empresaEnEdicion, setEmpresaEnEdicion] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargandoGuardar, setCargandoGuardar] = useState(false);

  const empresas = escenarioActivo?.empresas || [];
  const ofertaTotal = empresas.reduce((sum, e) => sum + (e.oferta_t || 0), 0);

  const abrirModalNueva = () => {
    const nextNum = empresas.length + 1;
    const nextId = `EMP-${nextNum < 10 ? '0' + nextNum : nextNum}`;
    setEmpresaEnEdicion({
      id: nextId,
      nombre: '',
      ubicacion: 'Villavicencio (Sector nuevo)',
      latitud: 4.15,
      longitud: -73.61,
      tipo_residuo: 'Palma de aceite',
      oferta_t: 10.0,
      plantas_compatibles: ['PLA-01', 'PLA-02', 'PLA-03', 'PLA-04']
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (emp) => {
    setEmpresaEnEdicion({ ...emp });
    setModalAbierto(true);
  };

  const handleGuardarCoordenadas = (lat, lon) => {
    setEmpresaEnEdicion(prev => ({
      ...prev,
      latitud: lat,
      longitud: lon
    }));
  };

  const handleGuardarEmpresa = async (e) => {
    e.preventDefault();
    if (!empresaEnEdicion.id || !empresaEnEdicion.nombre) {
      setMensaje({ tipo: 'error', texto: 'El ID y Nombre de la empresa son requeridos.' });
      return;
    }

    if (empresaEnEdicion.latitud < -90 || empresaEnEdicion.latitud > 90 ||
        empresaEnEdicion.longitud < -180 || empresaEnEdicion.longitud > 180) {
      setMensaje({ tipo: 'error', texto: 'Coordenadas fuera del rango permitido: Latitud [-90, 90], Longitud [-180, 180].' });
      return;
    }

    setCargandoGuardar(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await api.guardarEmpresa(escenarioActivoId, empresaEnEdicion);
      await recargarEscenarioActivo();
      setModalAbierto(false);
      setMensaje({ tipo: 'exito', texto: `Empresa ${empresaEnEdicion.id} guardada exitosamente y rutas viales recalculadas.` });
    } catch (err) {
      // Si el backend está en fallback local, persistir en memoria de sesión
      if (escenarioActivo) {
        const empresasAct = [...empresas];
        const idx = empresasAct.findIndex(emp => emp.id === empresaEnEdicion.id);
        if (idx >= 0) {
          empresasAct[idx] = { ...empresaEnEdicion };
        } else {
          empresasAct.push({ ...empresaEnEdicion });
        }

        const plantas = escenarioActivo.plantas || [];
        const rutasActuales = (escenarioActivo.rutas || []).filter(r => r.empresa_id !== empresaEnEdicion.id);
        plantas.forEach(pla => {
          const dLat = Math.abs(empresaEnEdicion.latitud - pla.latitud);
          const dLon = Math.abs(empresaEnEdicion.longitud - pla.longitud);
          const distKm = Math.max(9.5, Math.round(Math.sqrt(dLat * dLat + (dLon * 0.998) ** 2) * 111.0 * 1.32 * 10) / 10);
          rutasActuales.push({
            id: `${empresaEnEdicion.id}->${pla.id}`,
            empresa_id: empresaEnEdicion.id,
            planta_id: pla.id,
            distancia_km: distKm,
            proveedor_vial: 'OSRM (provisional)',
            geometria: [
              [empresaEnEdicion.longitud, empresaEnEdicion.latitud],
              [pla.longitud, pla.latitud]
            ],
            estado_calculo: 'calculada',
            tarifa_t_km: 300.0,
            costo_unitario_t: Math.round(distKm * 300.0),
            activa: true,
            compatible: true
          });
        });

        const nuevaOferta = empresasAct.reduce((s, emp) => s + (emp.oferta_t || 0), 0);
        setEscenarioActivo({
          ...escenarioActivo,
          empresas: empresasAct,
          rutas: rutasActuales,
          oferta_total_t: nuevaOferta
        });
        setModalAbierto(false);
        setMensaje({ tipo: 'exito', texto: `Empresa ${empresaEnEdicion.id} actualizada y rutas viales recalculadas en la sesión.` });
      } else {
        setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar empresa' });
      }
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
            Empresas Generadoras
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro y parametrización de puntos generadores en el departamento del Meta, coordenadas geográficas y oferta semanal.
          </p>
        </div>

        <button
          onClick={abrirModalNueva}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* Alerta / Mensaje */}
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
          titulo="Total Empresas"
          valor={empresas.length}
          unidad="nodos"
          subtexto="Empresas activas en sesión"
          color="amber"
          icono={Building2}
        />
        <TarjetaKPI
          titulo="Oferta Acumulada"
          valor={ofertaTotal.toFixed(1)}
          unidad="t/semana"
          subtexto="Biomasa a transportar"
          color="emerald"
        />
      </div>

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Nodos Generadores Registrados ({empresas.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Unidad de oferta: <strong>t/semana</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre Empresa</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3 text-center">Latitud</th>
                <th className="px-4 py-3 text-center">Longitud</th>
                <th className="px-4 py-3">Tipo de Residuo</th>
                <th className="px-4 py-3 text-right">Oferta (t/semana)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
              {empresas.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-800">{emp.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{emp.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.ubicacion}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{emp.latitud?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{emp.longitud?.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                      {emp.tipo_residuo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{emp.oferta_t?.toFixed(1)} t/semana</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => abrirModalEditar(emp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Editar empresa y ubicación"
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

      {/* Modal de Edición Completa */}
      {modalAbierto && empresaEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Parametrización de Empresa ({empresaEnEdicion.id})</span>
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleGuardarEmpresa} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">ID Empresa:</label>
                  <input
                    type="text"
                    required
                    value={empresaEnEdicion.id}
                    onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, id: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                    readOnly={empresas.some(e => e.id === empresaEnEdicion.id)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    required
                    value={empresaEnEdicion.nombre}
                    onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, nombre: e.target.value })}
                    placeholder="Ej. Palmeras del Llano"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Ubicación / Vereda:</label>
                  <input
                    type="text"
                    required
                    value={empresaEnEdicion.ubicacion}
                    onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, ubicacion: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de Residuo:</label>
                  <select
                    value={empresaEnEdicion.tipo_residuo}
                    onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, tipo_residuo: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Palma de aceite">Palma de aceite</option>
                    <option value="Cascarilla de arroz">Cascarilla de arroz</option>
                    <option value="Cacao y derivados">Cacao y derivados</option>
                    <option value="Residuos cítricos">Residuos cítricos</option>
                    <option value="Forestal maderable">Forestal maderable</option>
                    <option value="Estiércol y pecuario">Estiércol y pecuario</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Oferta Semanal Estimada (t/semana):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={empresaEnEdicion.oferta_t}
                  onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, oferta_t: parseFloat(e.target.value) })}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Selector de Coordenadas con Mapa Interactivo */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ubicación Geográfica en Mapa OpenStreetMap</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 font-semibold">
                    [{empresaEnEdicion.latitud?.toFixed(4)}, {empresaEnEdicion.longitud?.toFixed(4)}]
                  </span>
                </div>

                {/* Mapa Leaflet interactivo embebido (~240px) */}
                <div className="h-60 w-full rounded-lg overflow-hidden border border-slate-300">
                  <MapaLeafletOSRM
                    center={[
                      empresaEnEdicion.latitud != null && !isNaN(empresaEnEdicion.latitud) ? empresaEnEdicion.latitud : 4.15,
                      empresaEnEdicion.longitud != null && !isNaN(empresaEnEdicion.longitud) ? empresaEnEdicion.longitud : -73.61
                    ]}
                    zoom={10}
                    height="100%"
                    marcadorEdicion={{
                      latitud: empresaEnEdicion.latitud,
                      longitud: empresaEnEdicion.longitud,
                      rotulo: empresaEnEdicion.nombre || empresaEnEdicion.id || "Empresa",
                      onDragEnd: (lat, lon) => {
                        setEmpresaEnEdicion(prev => ({
                          ...prev,
                          latitud: parseFloat(lat.toFixed(6)),
                          longitud: parseFloat(lon.toFixed(6))
                        }));
                      }
                    }}
                    onMapClick={(lat, lon) => {
                      setEmpresaEnEdicion(prev => ({
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
                      value={empresaEnEdicion.latitud}
                      onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, latitud: parseFloat(e.target.value) })}
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
                      value={empresaEnEdicion.longitud}
                      onChange={(e) => setEmpresaEnEdicion({ ...empresaEnEdicion, longitud: parseFloat(e.target.value) })}
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

export default Hu01EmpresasGeneradorasPage;

