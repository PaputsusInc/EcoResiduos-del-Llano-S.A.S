import React from 'react';

/** Barras con escala compartida y cifras visibles para leer sin depender del color. */
export default function BarrasMetodos({ titulo, exacto, ag, unidad = '', formato }) {
  const valores = [exacto, ag].filter((valor) => Number.isFinite(valor) && valor >= 0);
  const maximo = Math.max(...valores, 0);
  const filas = [
    { etiqueta: 'Método exacto', valor: exacto, color: 'bg-emerald-600' },
    { etiqueta: 'Algoritmo genético', valor: ag, color: 'bg-indigo-600' }
  ];
  const mostrar = formato || ((valor) => `${valor.toLocaleString('es-CO', { maximumFractionDigits: 3 })} ${unidad}`.trim());

  return (
    <div className="space-y-3" aria-label={titulo}>
      <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
      {filas.map(({ etiqueta, valor, color }) => (
        <div key={etiqueta} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-slate-600">{etiqueta}</span>
          <strong className="font-mono text-slate-900">{Number.isFinite(valor) ? mostrar(valor) : 'No medido'}</strong>
          <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Number.isFinite(valor) && maximo > 0 ? valor / maximo * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
