import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { AlertaCapacidad } from '../../components/common/AlertaCapacidad';
import { TarjetaKPI } from '../../components/common/TarjetaKPI';

export function Hu03OfertaEmpresasPage() {
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo } = useSession();

  const [ofertasLocales, setOfertasLocales] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Reiniciar ediciones locales al cambiar el escenario activo
  useEffect(() => {
    setOfertasLocales({});
  }, [escenarioActivoId]);

  const empresas = escenarioActivo?.empresas || [];
  const capacidadTotal = escenarioActivo?.plantas?.length
    ? escenarioActivo.plantas.reduce((sum, p) => sum + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t || 135.0);

  // Inicializar o sincronizar ofertas locales
  const obtenerOferta = (emp) => {
    return ofertasLocales[emp.id] !== undefined ? ofertasLocales[emp.id] : (emp.oferta_t || 0);
  };

  const ofertaTotalActual = empresas.reduce((sum, emp) => sum + obtenerOferta(emp), 0);
  const superaCapacidad = ofertaTotalActual > capacidadTotal;

  const handleCambiarOferta = (empId, valor) => {
    const num = parseFloat(valor);
    setOfertasLocales(prev => ({
      ...prev,
      [empId]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleVariacionPorcentual = (empId, factor) => {
    const actual = ofertasLocales[empId] !== undefined
      ? ofertasLocales[empId]
      : (empresas.find(e => e.id === empId)?.oferta_t || 0);
    const nuevo = Math.round(actual * (1 + factor) * 10.0) / 10.0;
    handleCambiarOferta(empId, nuevo);
  };

  const handleGuardarIndividual = async (empId) => {
    const ofertaVal = ofertasLocales[empId] !== undefined
      ? ofertasLocales[empId]
      : empresas.find(e => e.id === empId)?.oferta_t;

    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await api.actualizarOferta(escenarioActivoId, empId, ofertaVal);
      await recargarEscenarioActivo();
      setMensaje({ tipo: 'exito', texto: `Oferta de ${empId} actualizada a ${ofertaVal.toFixed(1)} t/semana.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al actualizar oferta' });
    } finally {
      setCargando(false);
    }
  };

  const handleRestaurarBase = () => {
    setOfertasLocales({});
    setMensaje({ tipo: 'exito', texto: `Valores restablecidos a los datos base del escenario (${escenarioActivoId || 'activo'}).` });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Oferta Semanal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste de biomasa estimada por empresa (t/semana). La actualización de oferta no altera distancias ni geometrías viales.
          </p>
        </div>

        <button
          onClick={handleRestaurarBase}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restaurar Base (115 t/sem)</span>
        </button>
      </div>

      {/* Alerta de Capacidad Superada */}
      <AlertaCapacidad
        visible={superaCapacidad}
        detalle={`Oferta simulada (${ofertaTotalActual.toFixed(1)} t/semana) supera la capacidad instalada (${capacidadTotal.toFixed(1)} t/semana). Déficit de ${(ofertaTotalActual - capacidadTotal).toFixed(1)} t/semana.`}
      />

      {mensaje.texto && (
        <div className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Barra de Balance Oferta vs Capacidad en Tiempo Real */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">Balance de Masa en Red</span>
          <span className="font-semibold text-slate-600">
            Oferta: <strong className={superaCapacidad ? "text-rose-600" : "text-emerald-700"}>{ofertaTotalActual.toFixed(1)} t/sem</strong> / Capacidad: <strong>{capacidadTotal.toFixed(1)} t/sem</strong>
          </span>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${Math.min(100, (ofertaTotalActual / capacidadTotal) * 100)}%` }}
            className={`transition-all ${superaCapacidad ? 'bg-rose-600' : 'bg-emerald-600'}`}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
          <span>0.0 t/sem</span>
          <span>{superaCapacidad ? `Exceso: +${(ofertaTotalActual - capacidadTotal).toFixed(1)} t/sem` : `Margen disponible: +${(capacidadTotal - ofertaTotalActual).toFixed(1)} t/sem`}</span>
          <span>Capacidad Máx: {capacidadTotal.toFixed(1)} t/sem</span>
        </div>
      </div>

      {/* Tabla Editable de Oferta */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Editor de Ofertas por Nodo Generador
          </h3>
          <span className="text-xs text-slate-500">Valores en <strong>t/semana</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Residuo</th>
                <th className="px-4 py-3 text-center">Oferta Actual (t/semana)</th>
                <th className="px-4 py-3 text-center">Variación Rápida</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
              {empresas.map((emp) => {
                const val = obtenerOferta(emp);
                const modificado = ofertasLocales[emp.id] !== undefined && ofertasLocales[emp.id] !== emp.oferta_t;
                return (
                  <tr key={emp.id} className={modificado ? "bg-amber-50/50" : "hover:bg-slate-50/80 transition-colors"}>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800">{emp.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{emp.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{emp.tipo_residuo}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={val}
                          onChange={(e) => handleCambiarOferta(emp.id, e.target.value)}
                          className="w-24 text-center font-black text-sm px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">t/sem</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => handleVariacionPorcentual(emp.id, -0.10)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          title="-10%"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => handleVariacionPorcentual(emp.id, 0.10)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          title="+10%"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() => handleVariacionPorcentual(emp.id, 0.25)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          title="+25%"
                        >
                          +25%
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleGuardarIndividual(emp.id)}
                        disabled={cargando}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                          modificado
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar</span>
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

export default Hu03OfertaEmpresasPage;

