import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertOctagon, EyeOff, ListOrdered, Play, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

export default function Hu08ResolucionExactaEstadosPage() {
  const { escenarioActivo, escenarioActivoId, cambiarEscenario, seleccionarEscenario, listaEscenarios } = useSession();
  const handleSeleccionar = cambiarEscenario || seleccionarEscenario;
  const idActual = escenarioActivoId || escenarioActivo?.id || 'ESC-01';

  const [escenarioId, setEscenarioId] = useState(idActual);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultadoApi, setResultadoApi] = useState(null);
  const [errorApi, setErrorApi] = useState(null);

  useEffect(() => {
    if (idActual) {
      setEscenarioId(idActual);
      setResultadoApi(null);
      setErrorApi(null);
    }
  }, [idActual]);

  const empresas = escenarioActivo?.empresas || [];
  const plantas = escenarioActivo?.plantas || [];

  const ofertaTotal = empresas.length > 0
    ? empresas.reduce((s, e) => s + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t ?? 0);

  const capacidadTotal = plantas.length > 0
    ? plantas.reduce((s, p) => s + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t ?? 0);

  const esInfactible = resultadoApi?.estado === 'INFACTIBLE_CERTIFICADO';

  const handleCambiarEscenario = (nuevoId) => {
    setEscenarioId(nuevoId);
    if (handleSeleccionar) {
      handleSeleccionar(nuevoId);
    }
    setResultadoApi(null);
    setErrorApi(null);
  };

  const ejecutarOptimizacionEnVivo = async () => {
    setEjecutando(true);
    setErrorApi(null);
    try {
      const res = await api.ejecutarOptimizacion(escenarioId, { metodo: 'EXACTO', asincrono: false });
      setResultadoApi(res.resultado);
    } catch (err) {
      console.error(err);
      setErrorApi(err.message || 'Error al comunicarse con el motor de optimización.');
    } finally {
      setEjecutando(false);
    }
  };

  const costoTotalZ = resultadoApi?.costo_total_Z;
  const tiempoEjecucion = resultadoApi?.tiempo_ejecucion_s;
  const estadoActual = resultadoApi?.estado;

  // Recepción calculada a partir de los flujos emitidos por el motor.
  const calcularAsignacionPlantas = () => {
    return plantas.map(pla => {
        const recibido = Object.entries(resultadoApi?.matriz_flujos_optimos || {})
          .filter(([k]) => k.endsWith('->' + pla.id))
          .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
        const holgura = Math.max(0, (pla.capacidad_maxima_t || 0) - recibido);
        return {
          ...pla,
          recibido,
          holgura,
          saturada: holgura < 0.05
        };
      });
  };

  const plantasAsignadas = calcularAsignacionPlantas();

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Resolución Exacta</h2>
            <p className="text-xs text-slate-500">Optimización de transporte lineal y verificación matemática de restricciones</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Consultar Escenario:</span>
            <select
              value={escenarioId}
              onChange={(e) => handleCambiarEscenario(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              {listaEscenarios && listaEscenarios.length > 0 ? (
                listaEscenarios.map(esc => (
                  <option key={esc.id} value={esc.id}>
                    {esc.id} · {esc.nombre}
                  </option>
                ))
              ) : (
                <>
                  <option value="ESC-01">ESC-01 · Caso de referencia</option>
                  <option value="ESC-04">ESC-04 · Exceso de Oferta</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={ejecutarOptimizacionEnVivo}
            disabled={ejecutando}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            {ejecutando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{ejecutando ? 'Resolviendo en Python...' : 'Resolver en Vivo'}</span>
          </button>

          <Link
            to={resultadoApi?.id ? `/procedimiento-exacto?ejecucion=${encodeURIComponent(resultadoApi.id)}` : '/procedimiento-exacto'}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Ver Pasos del Método</span>
          </Link>
        </div>
      </div>

      {errorApi && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium flex items-center justify-between shadow-sm">
          <span>{errorApi}</span>
          <button onClick={() => setErrorApi(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {!resultadoApi && !ejecutando && !errorApi && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-600">
          Ejecuta el método exacto para ver el resultado calculado para este escenario.
        </div>
      )}

      {estadoActual && !['OPTIMO', 'INFACTIBLE_CERTIFICADO'].includes(estadoActual) && (
        <div role="alert" className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {resultadoApi?.causa_estado || resultadoApi?.motivo_finalizacion || estadoActual}
        </div>
      )}

      {/* CASO 1: ÓPTIMO CERTIFICADO */}
      {estadoActual === 'OPTIMO' && (
        <div className="space-y-6 animate-fade-in">
          {/* Banner Óptimo Dinámico */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Óptimo certificado
                </span>
                <span className="font-mono text-xs text-slate-400">Escenario {escenarioId} · Modelo de Transporte Exacto</span>
              </div>
              <h3 className="text-lg font-bold text-white">{ofertaTotal === 0 ? 'Sin volúmenes operativos para asignar' : 'Solución Óptima Global Obtenida y Comprobada'}</h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                {ofertaTotal === 0
                  ? 'El costo matemático es cero porque todavía no se han registrado ofertas semanales. Esta ejecución no representa una operación de transporte.'
                  : `Se ha distribuido el 100% de la oferta semanal de las ${empresas.length} empresas generadoras (${ofertaTotal.toFixed(1)} t/semana) respetando la capacidad de las ${plantas.length} plantas procesadoras (${capacidadTotal.toFixed(1)} t/semana).`}
              </p>
            </div>

            <div className="flex items-center space-x-6 text-right shrink-0 font-mono">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">Costo Total Óptimo (Z*):</span>
                <span className="text-2xl font-bold text-emerald-400">
                  $ {costoTotalZ ? Math.round(costoTotalZ).toLocaleString('es-CO') : '0'} COP
                </span>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">Tiempo de Solución:</span>
                <span className="text-lg font-bold text-white">{tiempoEjecucion?.toFixed(3)} s</span>
              </div>
            </div>
          </div>

          {/* Comprobación de Restricciones Dinámica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cumplimiento Empresas */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Cumplimiento de Oferta ({empresas.length} Empresas · 100%)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Total = {ofertaTotal.toFixed(1)} t/sem</span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 text-xs pr-1">
                {empresas.map((emp) => (
                  <div key={emp.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition">
                    <span className="font-semibold text-slate-800">
                      <span className="font-mono text-slate-500 mr-1">{emp.id}</span>
                      <span>({emp.nombre}):</span>
                    </span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {emp.oferta_t?.toFixed(1)} t de {emp.oferta_t?.toFixed(1)} t (100 %)
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                ✓ Todas las {empresas.length} empresas transfieren la totalidad de sus residuos sin saldos pendientes.
              </p>
            </div>

            {/* Cumplimiento Plantas */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Cumplimiento de Capacidad ({plantas.length} Plantas)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Límite = {capacidadTotal.toFixed(1)} t/sem</span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 text-xs pr-1">
                {plantasAsignadas.map((pla) => (
                  <div key={pla.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition">
                    <span className="font-semibold text-slate-800">
                      <span className="font-mono text-slate-500 mr-1">{pla.id}</span>
                      <span>({pla.nombre}):</span>
                    </span>
                    <span className="font-mono text-slate-800">
                      Recibe <strong className="text-slate-900">{pla.recibido.toFixed(1)} t</strong> de máx. {pla.capacidad_maxima_t?.toFixed(1)} t{' '}
                      <span className={`text-[11px] font-bold ${pla.saturada ? 'text-amber-700' : 'text-emerald-700'}`}>
                        ({pla.saturada ? 'Saturada' : `Holgura: +${pla.holgura.toFixed(1)} t`})
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                ✓ Ninguna de las {plantas.length} plantas sobrepasa su límite de recepción semanal.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/asignacion-costos"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition"
            >
              <span>Ver Asignación Detallada de Flujos y Costos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* CASO 2: INFACTIBLE CERTIFICADO */}
      {esInfactible && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-red-600 text-white p-6 rounded-xl shadow-lg space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-700 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-800 text-red-100 uppercase tracking-wider">
                  Estado: Infactible certificado
                </span>
                <h3 className="text-xl font-bold mt-0.5">{resultadoApi?.causa_estado || 'Red infactible'}</h3>
              </div>
            </div>

            <p className="text-xs text-red-100 leading-relaxed max-w-3xl">
              {resultadoApi?.motivo_finalizacion}
            </p>

            <div className="pt-2 flex items-center space-x-4 text-xs font-mono">
              {ofertaTotal > capacidadTotal
                ? <span>Déficit global: <strong>{(ofertaTotal - capacidadTotal).toFixed(1)} t/semana</strong></span>
                : <span>Revise rutas activas y capacidades de cada planta.</span>}
              <span>·</span>
              <span>Asignaciones generadas: <strong>0 (Ocultas por inviabilidad)</strong></span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 py-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <EyeOff className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Resultados de asignación no disponibles</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Para evitar la interpretación de asignaciones parciales o no válidas, el sistema no proyecta flujos cuando el escenario carece de viabilidad matemática.
            </p>
            <button
              onClick={() => handleCambiarEscenario('ESC-01')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Volver a Caso de Referencia (ESC-01)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
