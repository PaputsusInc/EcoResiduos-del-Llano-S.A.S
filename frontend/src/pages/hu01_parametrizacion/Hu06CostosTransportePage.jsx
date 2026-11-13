import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calculator, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

export default function Hu06CostosTransportePage() {
  const { escenarioActivo, setEscenarioActivo } = useSession();
  const [tarifaRef, setTarifaRef] = useState(300);
  const [matrizCostos, setMatrizCostos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [error, setError] = useState(null);

  const empresas = useMemo(() => escenarioActivo?.empresas || [], [escenarioActivo]);
  const plantas = useMemo(() => escenarioActivo?.plantas || [], [escenarioActivo]);
  const rutas = useMemo(() => escenarioActivo?.rutas || [], [escenarioActivo]);

  // Sincronizar tarifa de referencia según el escenario activo
  useEffect(() => {
    const t = escenarioActivo?.rutas?.[0]?.tarifa_t_km;
    if (t) setTarifaRef(t);
  }, [escenarioActivo?.id]);

  // Sincronizar dinámicamente la matriz de costos según las empresas y plantas del escenario activo
  useEffect(() => {
    if (!empresas.length || !plantas.length) return;

    const nuevaMatriz = empresas.map(emp => {
      return plantas.map(pla => {
        const r = rutas.find(ruta => ruta.empresa_id === emp.id && ruta.planta_id === pla.id);
        if (r && r.costo_unitario_t != null) {
          return r.costo_unitario_t;
        }
        if (r && Boolean(r.activa) === false) {
          return null; // Sin ruta transitable
        }
        return null;
      });
    });

    setMatrizCostos(nuevaMatriz);
  }, [empresas, plantas, rutas]);

  const handleCostoChange = (i, j, valorStr) => {
    const nueva = matrizCostos.map(fila => [...fila]);
    nueva[i][j] = valorStr === '' ? '' : Number(valorStr);
    setMatrizCostos(nueva);
  };

  const aplicarTarifa = async (tarifa) => {
    if (!Number.isFinite(tarifa) || tarifa < 0) {
      setError('Ingresa una tarifa válida, mayor o igual a cero.');
      return;
    }
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const respuesta = await api.aplicarTarifaGlobal(escenarioActivo.id, tarifa);
      setEscenarioActivo(respuesta.escenario);
      setTarifaRef(tarifa);
      setMensajeExito(`Tarifa de ${tarifa} COP/(t·km) aplicada y guardada.`);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  };

  const aplicarTarifaGlobal = () => aplicarTarifa(Number(tarifaRef));
  const restablecerValoresBase = () => aplicarTarifa(300);

  const guardarCostos = async () => {
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      if (!escenarioActivo) throw new Error('Selecciona un escenario para guardar los costos.');
      const costos = {};
      rutas.forEach((ruta) => {
        if (ruta.activa === false || ruta.compatible === false) return;
        const i = empresas.findIndex((empresa) => empresa.id === ruta.empresa_id);
        const j = plantas.findIndex((planta) => planta.id === ruta.planta_id);
        const valor = matrizCostos[i]?.[j];
        if (!Number.isFinite(valor) || valor < 0) {
          throw new Error(`Revisa el costo de ${ruta.id}; debe ser un número no negativo.`);
        }
        costos[ruta.id] = valor;
      });
      const respuesta = await api.actualizarMatrizCostos(escenarioActivo.id, costos);
      setEscenarioActivo(respuesta.escenario);
      setMensajeExito('Matriz de costos guardada y confirmada por el servidor.');
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* TOP HEADER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Costos de Transporte</h2>
            <p className="text-xs text-slate-500">
              Matriz de fletes en COP por tonelada para las {empresas.length} empresas y {plantas.length} plantas. Adquisición y operación se agregan al optimizar.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={guardarCostos}
            disabled={guardando}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{guardando ? 'Guardando...' : 'Guardar Costos'}</span>
          </button>
        </div>
      </div>

      {mensajeExito && (
        <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between shadow-sm animate-fade-in">
          <span>{mensajeExito}</span>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}

      {/* CALCULADORA DE TARIFA */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 gap-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Calculadora de Flete por Tarifa Vial</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Fórmula: Costo (COP/t) = Distancia (km) × Tarifa (COP/(t·km))</span>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 text-xs">
          <div className="space-y-1">
            <label className="block font-medium text-slate-700">Tarifa de Referencia por km:</label>
            <div className="relative w-48">
              <input
                type="number"
                value={tarifaRef}
                step="10"
                min="50"
                onChange={(e) => setTarifaRef(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400">COP/(t·km)</span>
            </div>
          </div>

          <button
            onClick={aplicarTarifaGlobal}
            disabled={guardando || !escenarioActivo}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Aplicar tarifa y guardar</span>
          </button>

          <button
            onClick={restablecerValoresBase}
            disabled={guardando || !escenarioActivo}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium flex items-center space-x-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Aplicar tarifa base de 300</span>
          </button>
        </div>
      </div>

      {/* MATRIZ EDITABLE DINÁMICA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz de Costos Unitarios de Transporte ({empresas.length} Empresas × {plantas.length} Plantas)
            </h3>
            <p className="text-xs text-slate-500">Valores en COP por tonelada aplicados por los motores de optimización.</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Unidad: COP por tonelada transportada</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-4 text-left">Empresa Origen</th>
                <th className="py-3 px-4 text-left">Ubicación / Municipio</th>
                {plantas.map(pla => (
                  <th key={pla.id} className="py-3 px-3">
                    <span className="font-bold">{pla.id}</span><br />
                    <span className="text-[10px] text-slate-500 font-normal">{pla.nombre}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {empresas.map((emp, i) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 text-left font-mono font-bold text-slate-800">{emp.id}</td>
                  <td className="py-2.5 px-4 text-left font-semibold text-slate-900 font-sans">
                    {emp.nombre} <span className="text-slate-400 font-normal">({emp.ubicacion})</span>
                  </td>
                  {plantas.map((pla, j) => {
                    const c = matrizCostos[i]?.[j];
                    if (c === null || c === undefined) {
                      return (
                        <td key={pla.id} className="py-2.5 px-3 text-amber-700 bg-amber-50/40 text-xs font-sans">
                          No disponible
                        </td>
                      );
                    }
                    return (
                      <td key={pla.id} className="py-2 px-2">
                        <input
                          type="number"
                          aria-label={`Costo de ${emp.id} a ${pla.id} en COP por tonelada`}
                          step="50"
                          min="0"
                          value={c}
                          onChange={(e) => handleCostoChange(i, j, e.target.value)}
                          className="w-24 px-1.5 py-1 text-right text-xs font-mono rounded border text-slate-800 border-slate-200 focus:ring-2 focus:ring-slate-400"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
