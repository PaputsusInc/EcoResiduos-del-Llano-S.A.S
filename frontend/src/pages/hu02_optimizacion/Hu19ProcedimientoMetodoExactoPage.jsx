import React, { useEffect, useState } from 'react';
import { ArrowLeft, ListOrdered, Play, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

const numero = (valor) => Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 6 });

export default function Hu19ProcedimientoMetodoExactoPage() {
  const { escenarioActivo, escenarioActivoId, cambiarEscenario, listaEscenarios } = useSession();
  const [parametros, setParametros] = useSearchParams();
  const ejecucionId = parametros.get('ejecucion');
  const escenarioId = escenarioActivoId || escenarioActivo?.id || 'ESC-01';
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResultado(null);
    setError(null);
    if (!ejecucionId) return;
    let vigente = true;
    setCargando(true);
    api.consultarProcedimientoExacto(ejecucionId)
      .then((respuesta) => { if (vigente) setResultado(respuesta.resultado); })
      .catch((fallo) => { if (vigente) setError(fallo.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [ejecucionId]);

  async function resolver() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await api.ejecutarOptimizacion(escenarioId, { metodo: 'EXACTO' });
      setResultado(respuesta.resultado);
      setParametros({ ejecucion: respuesta.resultado.id });
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setCargando(false);
    }
  }

  const pasos = resultado?.pasos_exactos || [];
  const pasosVogel = pasos.filter((paso) => paso.datos?.submetodo === 'VOGEL');
  const pasosModi = pasos.filter((paso) => paso.datos?.submetodo === 'MODI');

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListOrdered className="w-6 h-6 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Procedimiento exacto</h2>
            <p className="text-xs text-slate-500">Pasos y resultados emitidos por el motor para la ejecución seleccionada</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={escenarioId} onChange={(evento) => {
            setParametros({});
            setResultado(null);
            cambiarEscenario(evento.target.value);
          }} className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white">
            {listaEscenarios.map((escenario) => <option key={escenario.id} value={escenario.id}>{escenario.id} · {escenario.nombre}</option>)}
          </select>
          <button onClick={resolver} disabled={cargando} className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
            {cargando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Resolver
          </button>
          <Link to="/resolucion-exacta" className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Volver</Link>
        </div>
      </div>

      {error && <p role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</p>}
      {!resultado && !cargando && !error && <p className="p-5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Resuelve el escenario para consultar sus pasos reales.</p>}
      {cargando && <p className="p-5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Consultando el motor exacto…</p>}

      {resultado && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <p className="text-xs text-slate-500 font-mono">{resultado.id} · {resultado.escenario_id}</p>
            <h3 className="text-lg font-bold text-slate-900">{resultado.estado}</h3>
            <p className="text-sm text-slate-600">{resultado.causa_estado || resultado.motivo_finalizacion}</p>
            <p className="text-sm font-semibold text-emerald-700">Costo: {resultado.costo_total_Z == null ? 'No disponible' : `$ ${numero(resultado.costo_total_Z)} COP`}</p>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Modelo y validación</h3>
            <p className="text-xs text-slate-600">{resultado.modelo_formulado?.cantidad_empresas ?? escenarioActivo?.empresas?.length ?? 0} empresas, {resultado.modelo_formulado?.cantidad_plantas ?? escenarioActivo?.plantas?.length ?? 0} plantas y {resultado.modelo_formulado?.variables_activas ?? escenarioActivo?.rutas?.filter((ruta) => ruta.activa !== false && ruta.compatible !== false && ruta.costo_unitario_t != null).length ?? 0} rutas disponibles.</p>
            {pasos.filter((paso) => ['PREPARACION', 'FORMULACION', 'VALIDACION'].includes(paso.etapa)).map((paso) => (
              <p key={paso.numero} className="text-xs text-slate-700"><strong>{paso.etapa}:</strong> {paso.operacion}</p>
            ))}
          </section>

          {resultado.estado === 'OPTIMO' && (
            <>
              <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Vogel</h3>
                {pasosVogel.map((paso) => <p key={paso.numero} className="text-xs text-slate-700">{paso.operacion}</p>)}
              </section>
              <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">MODI: pivotes y certificación de optimalidad</h3>
                {pasosModi.map((paso) => <p key={paso.numero} className="text-xs text-slate-700">{paso.operacion}</p>)}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
