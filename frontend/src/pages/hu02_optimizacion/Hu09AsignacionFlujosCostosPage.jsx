import React, { useEffect, useState } from 'react';
import { Network, Play, Printer, RefreshCw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

const numero = (valor, decimales = 2) => Number(valor).toLocaleString('es-CO', {
  minimumFractionDigits: decimales,
  maximumFractionDigits: decimales
});

export default function Hu09AsignacionFlujosCostosPage() {
  const { escenarioActivo } = useSession();
  const escenarioId = escenarioActivo?.id || 'ESC-01';
  const [metodo, setMetodo] = useState('EXACTO');
  const [respuesta, setRespuesta] = useState(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRespuesta(null);
    setError(null);
  }, [escenarioId, metodo]);

  async function ejecutar() {
    setEjecutando(true);
    setError(null);
    setRespuesta(null);
    try {
      const datos = await api.ejecutarOptimizacion(escenarioId, {
        metodo,
        asincrono: false
      });
      setRespuesta(datos);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEjecutando(false);
    }
  }

  const escenario = respuesta?.escenario || escenarioActivo;
  const empresas = escenario?.empresas || [];
  const plantas = escenario?.plantas || [];
  const rutas = escenario?.rutas || [];
  const resultado = respuesta?.resultado;
  const envios = respuesta?.desglose_asignaciones || [];
  const totalAsignado = envios.reduce((total, envio) => total + envio.toneladas, 0);
  const recibidoPorPlanta = Object.fromEntries(
    plantas.map((planta) => [
      planta.id,
      envios
        .filter((envio) => envio.planta_id === planta.id)
        .reduce((total, envio) => total + envio.toneladas, 0)
    ])
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <Network className="w-6 h-6 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Asignación y Costos</h2>
            <p className="text-xs text-slate-500">Toneladas y costos reales del escenario {escenarioId}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <select value={metodo} onChange={(evento) => setMetodo(evento.target.value)} className="p-2 border border-slate-300 rounded-lg text-xs" aria-label="Método de optimización">
            <option value="EXACTO">Método exacto</option>
            <option value="AG">Algoritmo genético</option>
          </select>
          <button onClick={ejecutar} disabled={ejecutando} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex gap-2 items-center">
            {ejecutando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {ejecutando ? 'Ejecutando…' : 'Calcular'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 border border-slate-300 rounded-lg text-xs flex gap-2 items-center">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {error && <p role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm">{error}</p>}

      {resultado ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              ['Estado', resultado.estado],
              ['Costo total', resultado.costo_total_Z == null ? 'No disponible' : `$ ${numero(resultado.costo_total_Z)} COP`],
              ['Toneladas asignadas', `${numero(totalAsignado)} t`],
              ['Conexiones utilizadas', envios.length]
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">{etiqueta}</div>
                <div className="text-base font-bold text-slate-800 mt-1">{valor}</div>
              </div>
            ))}
          </div>

          {(resultado.causa_estado || resultado.motivo_finalizacion) && (
            <p className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700">
              {resultado.causa_estado || resultado.motivo_finalizacion}
            </p>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-slate-800 p-4">Matriz de asignación (t/semana)</h3>
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Empresa</th>
                  {plantas.map((planta) => <th key={planta.id} className="p-3">{planta.id}</th>)}
                  <th className="p-3">Total</th>
                  <th className="p-3">Oferta</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa) => {
                  const enviosEmpresa = envios.filter((envio) => envio.empresa_id === empresa.id);
                  const total = enviosEmpresa.reduce((suma, envio) => suma + envio.toneladas, 0);
                  return (
                    <tr key={empresa.id} className="border-t border-slate-100">
                      <td className="p-3 text-left">{empresa.id} · {empresa.nombre}</td>
                      {plantas.map((planta) => (
                        <td key={planta.id} className="p-3">
                          {numero(enviosEmpresa.find((envio) => envio.planta_id === planta.id)?.toneladas || 0)}
                        </td>
                      ))}
                      <td className="p-3 font-bold">{numero(total)}</td>
                      <td className="p-3">{numero(empresa.oferta_t)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td className="p-3 text-left">Total recibido / capacidad</td>
                  {plantas.map((planta) => (
                    <td key={planta.id} className="p-3">
                      {numero(recibidoPorPlanta[planta.id])} / {numero(planta.capacidad_maxima_t)}
                    </td>
                  ))}
                  <td className="p-3">{numero(totalAsignado)}</td>
                  <td className="p-3">{numero(empresas.reduce((suma, empresa) => suma + empresa.oferta_t, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-slate-800 p-4">Costo por envío</h3>
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Conexión</th><th className="p-3">Distancia</th>
                  <th className="p-3">Toneladas</th><th className="p-3">Costo unitario</th>
                  <th className="p-3">Transporte</th><th className="p-3">Adquisición</th><th className="p-3">Operación</th><th className="p-3">Total del envío</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((envio) => {
                  const ruta = rutas.find((item) => item.id === envio.conexion_id);
                  return (
                    <tr key={envio.conexion_id} className="border-t border-slate-100">
                      <td className="p-3 text-left">{envio.conexion_id}</td>
                      <td className="p-3">{ruta?.distancia_km == null ? '—' : `${numero(ruta.distancia_km, 1)} km`}</td>
                      <td className="p-3">{numero(envio.toneladas)} t</td>
                      <td className="p-3">$ {numero(envio.costo_unitario_t)} COP/t</td>
                      <td className="p-3">$ {numero(envio.costo_transporte)} COP</td>
                      <td className="p-3">$ {numero(envio.costo_adquisicion)} COP</td>
                      <td className="p-3">$ {numero(envio.costo_operacion)} COP</td>
                      <td className="p-3 font-bold">$ {numero(envio.costo_total)} COP</td>
                    </tr>
                  );
                })}
                {envios.length === 0 && <tr><td colSpan={8} className="p-4 text-left text-slate-500">No hay asignaciones.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Elige un método y calcula para ver la asignación real.</p>
      )}
    </div>
  );
}
