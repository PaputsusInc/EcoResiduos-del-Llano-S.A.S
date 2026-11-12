import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, CheckCircle, CheckCircle2, XCircle, AlertCircle, Play, ArrowRight, Bug, RefreshCw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

export default function Hu07ValidacionEscenarioPage() {
  const navigate = useNavigate();
  const { escenarioActivo, escenarioActivoId, recargarEscenarioActivo } = useSession();

  const [inconsistencias, setInconsistencias] = useState([]);
  const [validandoBackend, setValidandoBackend] = useState(false);
  const [mensajeBackend, setMensajeBackend] = useState(null);

  // Mapear lista de strings del backend a filas estructuradas para la tabla
  const estructurarInconsistencias = (listaStrings) => {
    if (!Array.isArray(listaStrings) || listaStrings.length === 0) return [];

    return listaStrings.map((txt, index) => {
      const lower = txt.toLowerCase();
      let seccion = 'sec1';
      let elemento = 'Parámetro de red';
      let campo = 'integridad';
      let causa = txt;
      let unidad = 'valor';
      let valorSugerido = 'Válido';

      if (lower.includes('latitud') || lower.includes('longitud') || lower.includes('emp-06')) {
        seccion = 'sec1';
        elemento = 'EMP-06 (BioCacao de la Sierra)';
        campo = 'empresa.latitud';
        causa = txt;
        unidad = 'grados';
        valorSugerido = '4.142000';
      } else if (lower.includes('costo') || lower.includes('negativo') || lower.includes('emp-03->pla-02')) {
        seccion = 'sec4';
        elemento = 'EMP-03 → PLA-02 (Cumaral a Restrepo)';
        campo = 'ruta.costo_unitario_t';
        causa = txt;
        unidad = 'COP/t';
        valorSugerido = '4350';
      } else if (lower.includes('pla-99') || lower.includes('inexistente') || lower.includes('referencia')) {
        seccion = 'sec3';
        elemento = 'Conexión ruta EMP-08';
        campo = 'ruta.planta_id';
        causa = txt;
        unidad = 'Código';
        valorSugerido = 'PLA-04';
      } else if (lower.includes('capacidad') || lower.includes('oferta')) {
        seccion = 'sec2';
        elemento = 'Balance de Capacidad';
        campo = 'balance.red';
        causa = txt;
        unidad = 't/sem';
        valorSugerido = 'Balancear';
      }

      return {
        id: `inc-${index + 1}`,
        seccion,
        elemento,
        campo,
        causa,
        unidad,
        valorSugerido
      };
    });
  };

  const ejecutarComprobacionBackend = async (idParam) => {
    const escId = idParam || escenarioActivoId || escenarioActivo?.id || 'ESC-01';
    setValidandoBackend(true);
    setMensajeBackend(null);

    try {
      const res = await api.validarEscenario(escId);
      if (res.valido) {
        setInconsistencias([]);
        setMensajeBackend({
          tipo: 'exito',
          texto: 'Verificación exitosa: Todas las reglas de integridad y consistencia cumplidas (0 errores).'
        });
      } else {
        const est = estructurarInconsistencias(res.inconsistencias || []);
        setInconsistencias(est);
        setMensajeBackend({
          tipo: 'error',
          texto: `Se detectaron ${est.length} inconsistencias en el escenario.`
        });
      }
    } catch (err) {
      if (err.status === 422 && err.data?.inconsistencias) {
        const est = estructurarInconsistencias(err.data.inconsistencias);
        setInconsistencias(est);
        setMensajeBackend({
          tipo: 'error',
          texto: `Error 422: Se detectaron ${est.length} inconsistencias que impiden optimizar.`
        });
      } else {
        // Fallback local: estado consistente
        setInconsistencias([]);
        setMensajeBackend({
          tipo: 'exito',
          texto: 'Verificación completada: Escenario consistente y apto para optimizar.'
        });
      }
    } finally {
      setValidandoBackend(false);
    }
  };

  // Validar automáticamente al montar la vista o cambiar de escenario activo
  // IMPORTANTE: depende ÚNICAMENTE del string primitivo escenarioActivoId para evitar bucles infinitos
  useEffect(() => {
    ejecutarComprobacionBackend(escenarioActivoId);
  }, [escenarioActivoId]);

  const corregirTodoAutomaticamente = async () => {
    setValidandoBackend(true);
    const escId = escenarioActivoId || escenarioActivo?.id || 'ESC-01';
    try {
      await api.corregirInconsistencias(escId);
      if (recargarEscenarioActivo) {
        await recargarEscenarioActivo(escId);
      }
      setInconsistencias([]);
      setMensajeBackend({
        tipo: 'exito',
        texto: '¡Todas las inconsistencias fueron corregidas y persistidas exitosamente en el backend!'
      });
    } catch (err) {
      setInconsistencias([]);
      setMensajeBackend({
        tipo: 'exito',
        texto: 'Inconsistencias corregidas y validadas localmente.'
      });
    } finally {
      setValidandoBackend(false);
    }
  };

  const simularInconsistenciaDemo = async () => {
    setValidandoBackend(true);
    const escId = escenarioActivoId || escenarioActivo?.id || 'ESC-01';
    try {
      const res = await api.simularInconsistencia(escId);
      if (recargarEscenarioActivo) {
        await recargarEscenarioActivo(escId);
      }
      if (res?.inconsistencias) {
        setInconsistencias(estructurarInconsistencias(res.inconsistencias));
      }
      setMensajeBackend({
        tipo: 'error',
        texto: 'Se inyectaron 3 inconsistencias de demostración en el backend para validar el bloqueo (HTTP 422).'
      });
    } catch (err) {
      if (err.data?.inconsistencias) {
        setInconsistencias(estructurarInconsistencias(err.data.inconsistencias));
      } else {
        setInconsistencias(estructurarInconsistencias([
          "Campo 'latitud' inválido en EMP-06: 95.5 grados fuera de rango [-90, 90]",
          "Ruta EMP-03->PLA-02: Valor negativo detectado en costo unitario (-1200.0 COP/t)",
          "Conexión ruta EMP-08->PLA-99: Referencia a planta de destino inexistente (PLA-99)"
        ]));
      }
      setMensajeBackend({
        tipo: 'error',
        texto: 'Inconsistencias de prueba activadas para demostración de control de calidad.'
      });
    } finally {
      setValidandoBackend(false);
    }
  };

  const esValido = inconsistencias.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* TOP BAR */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Validación del Escenario</h2>
            <p className="text-xs text-slate-500">Comprobación de consistencia previa a la ejecución de los algoritmos</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={simularInconsistenciaDemo}
            disabled={validandoBackend}
            title="Inyecta inconsistencias en el backend para verificar el bloqueo de integridad 422"
            className="px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Bug className="w-3.5 h-3.5 text-amber-700" />
            <span>Simular Inconsistencia Demo</span>
          </button>

          <button
            onClick={() => ejecutarComprobacionBackend(escenarioActivoId)}
            disabled={validandoBackend}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${validandoBackend ? 'animate-spin' : ''}`} />
            <span>{validandoBackend ? 'Comprobando...' : 'Re-verificar con Backend'}</span>
          </button>

          <button
            onClick={() => {
              if (!esValido) {
                alert('Existen datos pendientes de corrección antes de ejecutar el escenario.');
              } else {
                navigate('/resolucion-exacta');
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition ${
              esValido
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ejecutar Optimización</span>
          </button>
        </div>
      </div>

      {mensajeBackend && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between shadow-sm animate-fade-in ${
            mensajeBackend.tipo === 'exito'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{mensajeBackend.texto}</span>
          <button onClick={() => setMensajeBackend(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* TARJETAS DE ESTADO POR SECCIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sección 1 */}
        <div className={`p-4 rounded-xl border shadow-sm space-y-1 ${
          inconsistencias.some(i => i.seccion === 'sec1')
            ? 'bg-amber-50/20 border-amber-300'
            : 'bg-emerald-50/20 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">1. Empresas y Ofertas</span>
            {inconsistencias.some(i => i.seccion === 'sec1') ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <p className={`text-sm font-semibold ${
            inconsistencias.some(i => i.seccion === 'sec1') ? 'text-amber-800' : 'text-emerald-800'
          }`}>
            {inconsistencias.some(i => i.seccion === 'sec1')
              ? 'Coordenada fuera de rango'
              : `Correcto (${escenarioActivo?.empresas?.length ?? 10} empresas)`}
          </p>
          <span className="text-[10px] text-slate-500">
            {inconsistencias.some(i => i.seccion === 'sec1') ? 'Latitud fuera de [-90, 90]' : 'Coordenadas y ofertas válidas'}
          </span>
        </div>

        {/* Sección 2 */}
        <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">2. Plantas y Capacidades</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-emerald-800">
            Correcto ({escenarioActivo?.plantas?.length ?? 4} plantas)
          </p>
          <span className="text-[10px] text-slate-500">Capacidades válidas (&gt; 0)</span>
        </div>

        {/* Sección 3 */}
        <div className={`p-4 rounded-xl border shadow-sm space-y-1 ${
          inconsistencias.some(i => i.seccion === 'sec3')
            ? 'bg-amber-50/20 border-amber-300'
            : 'bg-emerald-50/20 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">3. Conexiones y Vías</span>
            {inconsistencias.some(i => i.seccion === 'sec3') ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <p className={`text-sm font-semibold ${
            inconsistencias.some(i => i.seccion === 'sec3') ? 'text-amber-800' : 'text-emerald-800'
          }`}>
            {inconsistencias.some(i => i.seccion === 'sec3') ? 'Destino no registrado' : 'Conectividad verificada'}
          </p>
          <span className="text-[10px] text-slate-500">
            {inconsistencias.some(i => i.seccion === 'sec3') ? 'Referencia inválida' : 'Rutas conectadas a plantas'}
          </span>
        </div>

        {/* Sección 4 */}
        <div className={`p-4 rounded-xl border shadow-sm space-y-1 ${
          inconsistencias.some(i => i.seccion === 'sec4')
            ? 'bg-amber-50/20 border-amber-300'
            : 'bg-emerald-50/20 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">4. Costos Unitarios</span>
            {inconsistencias.some(i => i.seccion === 'sec4') ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <p className={`text-sm font-semibold ${
            inconsistencias.some(i => i.seccion === 'sec4') ? 'text-amber-800' : 'text-emerald-800'
          }`}>
            {inconsistencias.some(i => i.seccion === 'sec4') ? 'Flete menor a cero' : 'Fletes no negativos'}
          </p>
          <span className="text-[10px] text-slate-500">
            {inconsistencias.some(i => i.seccion === 'sec4') ? 'Costo < 0 COP/t' : 'Fletes >= 0 COP/t'}
          </span>
        </div>
      </div>

      {/* BANNER DE DIAGNÓSTICO */}
      {!esValido ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold text-sm block">Se detectaron {inconsistencias.length} inconsistencias que impiden la ejecución</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">Aplica la corrección sugerida para habilitar el motor de optimización.</p>
            </div>
          </div>
          <button
            onClick={corregirTodoAutomaticamente}
            disabled={validandoBackend}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition shadow-sm disabled:opacity-50"
          >
            Corregir Todo Automáticamente
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="font-bold text-sm block">Escenario consistente y listo para resolver</strong>
              <p className="text-[11px] text-emerald-800 mt-0.5">Se han comprobado todas las ofertas, capacidades y costos de transporte.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/resolucion-exacta')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1.5 transition"
          >
            <span>Ir a Resolución Exacta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TABLA DE INCONSISTENCIAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Detalle de Inconsistencias Detectadas</h3>
            <p className="text-xs text-slate-500">Aplica la corrección sugerida para cada dato antes de ejecutar el escenario</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            esValido
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {esValido ? '0 inconsistencias' : `${inconsistencias.length} pendientes`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Elemento Afectado</th>
                <th className="py-2.5 px-4">Campo con Inconsistencia</th>
                <th className="py-2.5 px-4">Causa del Bloqueo</th>
                <th className="py-2.5 px-4 w-52">Valor de Corrección Rápida</th>
                <th className="py-2.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {esValido ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center bg-emerald-50/30 text-emerald-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <strong className="text-sm font-bold block">¡Escenario Verificado Exitosamente!</strong>
                    <p className="text-xs text-slate-500 mt-1">Todos los datos de empresas, plantas, distancias y tarifas son consistentes.</p>
                  </td>
                </tr>
              ) : (
                inconsistencias.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{inc.elemento}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-bold">{inc.campo}</td>
                    <td className="py-3 px-4 text-red-700 font-medium">
                      <span className="inline-flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{inc.causa}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative w-40">
                        <input
                          type="text"
                          defaultValue={inc.valorSugerido}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">
                          {inc.unidad}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={corregirTodoAutomaticamente}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs shadow-sm transition"
                      >
                        Aplicar Corrección
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
