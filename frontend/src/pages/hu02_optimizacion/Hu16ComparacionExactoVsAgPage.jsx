import React, { useState } from 'react';
import { GitCompare, Play, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

const costo = (valor) => valor == null
  ? 'No disponible'
  : `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP`;

function ResultadoMetodo({ titulo, resultado }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Estado</dt><dd className="font-semibold">{resultado?.estado || '—'}</dd></div>
        <div><dt className="text-slate-500">Costo</dt><dd className="font-semibold">{costo(resultado?.costo_total_Z)}</dd></div>
        <div><dt className="text-slate-500">Tiempo</dt><dd>{resultado?.tiempo_ejecucion_s?.toFixed(3) ?? '—'} s</dd></div>
        <div><dt className="text-slate-500">Motivo</dt><dd>{resultado?.causa_estado || resultado?.motivo_finalizacion || '—'}</dd></div>
      </dl>
    </div>
  );
}

export default function Hu16ComparacionExactoVsAgPage() {
  const { escenarioActivo } = useSession();
  const escenarioId = escenarioActivo?.id || 'ESC-01';
  const [poblacion, setPoblacion] = useState(100);
  const [generaciones, setGeneraciones] = useState(200);
  const [tasaCruce, setTasaCruce] = useState(80);
  const [tasaMutacion, setTasaMutacion] = useState(5);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState(null);
  const [reporte, setReporte] = useState(null);

  async function ejecutarComparacion() {
    setEjecutando(true);
    setError(null);
    setReporte(null);
    try {
      const respuesta = await api.ejecutarOptimizacion(escenarioId, {
        metodo: 'COMPARATIVO',
        config_ag: {
          tamano_poblacion: Number(poblacion),
          generaciones: Number(generaciones),
          tasa_cruce: Number(tasaCruce) / 100,
          tasa_mutacion: Number(tasaMutacion) / 100
        }
      });
      setReporte(respuesta.reporte);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEjecutando(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <GitCompare className="w-6 h-6 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Comparación Exacto vs AG</h2>
            <p className="text-xs text-slate-500">Resultados reales del escenario {escenarioId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={ejecutarComparacion} disabled={ejecutando} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex gap-2 items-center">
            {ejecutando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {ejecutando ? 'Ejecutando…' : 'Comparar'}
          </button>
          <Link to="/evolucion-ag" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
            Ajustar AG y ver evolución
          </Link>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Parámetros del AG</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Población', poblacion, setPoblacion, 2, 1],
            ['Generaciones', generaciones, setGeneraciones, 1, 1],
            ['Cruce (%)', tasaCruce, setTasaCruce, 0, 1],
            ['Mutación (%)', tasaMutacion, setTasaMutacion, 0, 1]
          ].map(([etiqueta, valor, actualizar, minimo, paso]) => (
            <label key={etiqueta} className="text-xs font-semibold text-slate-600">
              {etiqueta}
              <input type="number" min={minimo} max={etiqueta.includes('%') ? 100 : undefined} step={paso} value={valor} onChange={(evento) => actualizar(evento.target.value)} className="block w-full mt-1 p-2 rounded-lg border border-slate-300" />
            </label>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-red-700 mt-3">{error}</p>}
      </div>

      {reporte ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultadoMetodo titulo="Método exacto" resultado={reporte.resultado_exacto} />
            <ResultadoMetodo titulo="Algoritmo genético" resultado={reporte.resultado_genetico} />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
            <span className="font-bold">Brecha frente al exacto: </span>
            {reporte.porcentaje_gap == null ? 'No disponible' : `${reporte.porcentaje_gap.toFixed(2)} %`}
            {reporte.diferencia_costo != null && ` · Diferencia: ${costo(reporte.diferencia_costo)}`}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Ejecuta la comparación para ver costos, tiempos y estados.</p>
      )}
    </div>
  );
}
