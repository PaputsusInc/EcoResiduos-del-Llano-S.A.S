import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Gauge, AlertTriangle, CheckCircle2, RotateCcw, Save } from 'lucide-react';
import { AlertaCapacidad } from '../../components/common/AlertaCapacidad';

export function Hu04CapacidadPlantasPage() {
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo } = useSession();

  const [capacidadesLocales, setCapacidadesLocales] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Reiniciar ediciones locales al cambiar el escenario activo
  useEffect(() => {
    setCapacidadesLocales({});
  }, [escenarioActivoId]);

  const plantas = escenarioActivo?.plantas || [];
  const ofertaTotal = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((sum, e) => sum + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t || 115.0);

  const obtenerCapacidad = (pla) => {
    return capacidadesLocales[pla.id] !== undefined ? capacidadesLocales[pla.id] : (pla.capacidad_maxima_t || 0);
  };

  const capacidadTotalActual = plantas.reduce((sum, pla) => sum + obtenerCapacidad(pla), 0);
  const superaCapacidad = ofertaTotal > capacidadTotalActual;

  const handleCambiarCapacidad = (plaId, valor) => {
    const num = parseFloat(valor);
    setCapacidadesLocales(prev => ({
      ...prev,
      [plaId]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleGuardarIndividual = async (plaId) => {
    const capVal = capacidadesLocales[plaId] !== undefined
      ? capacidadesLocales[plaId]
      : plantas.find(p => p.id === plaId)?.capacidad_maxima_t;

    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await api.actualizarCapacidad(escenarioActivoId, plaId, capVal);
      await recargarEscenarioActivo();
      setMensaje({ tipo: 'exito', texto: `Capacidad de ${plaId} actualizada a ${capVal.toFixed(1)} t/semana.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al actualizar capacidad' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Capacidad de Plantas Procesadoras
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Límites operativos semanales (t/semana). La variación de capacidad no altera la geometría ni distancias viales.
          </p>
        </div>
      </div>

      {/* Alerta de Capacidad Superada */}
      <AlertaCapacidad
        visible={superaCapacidad}
        detalle={`Capacidad total actual (${capacidadTotalActual.toFixed(1)} t/semana) es inferior a la oferta (${ofertaTotal.toFixed(1)} t/semana). Déficit: ${(ofertaTotal - capacidadTotalActual).toFixed(1)} t/semana.`}
      />

      {mensaje.texto && (
        <div className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Tarjetas Interactivas con Sliders de Capacidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plantas.map((pla) => {
          const cap = obtenerCapacidad(pla);
          const modificado = capacidadesLocales[pla.id] !== undefined && capacidadesLocales[pla.id] !== pla.capacidad_maxima_t;
          const participacion = capacidadTotalActual > 0 ? ((cap / capacidadTotalActual) * 100).toFixed(1) : '0';

          return (
            <div key={pla.id} className={`p-5 rounded-xl border bg-white shadow-xs space-y-4 ${
              modificado ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {pla.id}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">{pla.nombre}</h3>
                  <p className="text-xs text-slate-500">{pla.ubicacion}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">{cap.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 font-semibold ml-1">t/semana</span>
                  <p className="text-[11px] text-emerald-700 font-semibold">{participacion}% de la red</p>
                </div>
              </div>

              {/* Slider de Capacidad */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                  <span>0 t/sem</span>
                  <span>Capacidad Operativa</span>
                  <span>60 t/sem</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={cap}
                  onChange={(e) => handleCambiarCapacidad(pla.id, e.target.value)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={cap}
                    onChange={(e) => handleCambiarCapacidad(pla.id, e.target.value)}
                    className="w-20 text-center text-xs font-bold px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500">t/sem</span>
                </div>

                <button
                  onClick={() => handleGuardarIndividual(pla.id)}
                  disabled={cargando}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    modificado
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Hu04CapacidadPlantasPage;

