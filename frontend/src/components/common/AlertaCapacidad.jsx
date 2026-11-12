import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function AlertaCapacidad({ aviso = "Capacidad superada por la oferta", visible = true, detalle = "" }) {
  if (!visible) return null;

  return (
    <div className="p-4 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
      <div className="p-1.5 rounded-full bg-rose-100 text-rose-700 flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-bold text-sm tracking-wide text-rose-950">
          {aviso}
        </h4>
        <p className="text-xs text-rose-700 mt-0.5">
          {detalle || "La suma de ofertas semanales de las empresas supera la capacidad conjunta instalada en las plantas procesadoras."}
        </p>
      </div>
    </div>
  );
}

