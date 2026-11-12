import React from 'react';

export function TarjetaKPI({
  titulo,
  valor,
  unidad = "",
  subtexto = "",
  icono: Icono = null,
  color = "emerald" // emerald, blue, amber, rose, slate
}) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
      iconBg: "bg-emerald-100 text-emerald-700",
      accent: "text-emerald-700"
    },
    blue: {
      bg: "bg-blue-50/70 border-blue-200 text-blue-950",
      iconBg: "bg-blue-100 text-blue-700",
      accent: "text-blue-700"
    },
    amber: {
      bg: "bg-amber-50/70 border-amber-200 text-amber-950",
      iconBg: "bg-amber-100 text-amber-700",
      accent: "text-amber-700"
    },
    rose: {
      bg: "bg-rose-50/70 border-rose-200 text-rose-950",
      iconBg: "bg-rose-100 text-rose-700",
      accent: "text-rose-700"
    },
    slate: {
      bg: "bg-slate-50 border-slate-200 text-slate-900",
      iconBg: "bg-slate-200 text-slate-700",
      accent: "text-slate-600"
    }
  };

  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`p-4 rounded-xl border ${c.bg} shadow-xs flex items-center justify-between`}>
      <div>
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
          {titulo}
        </span>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {valor != null ? valor : "No disponible"}
          </span>
          {unidad && <span className={`text-xs font-semibold ${c.accent}`}>{unidad}</span>}
        </div>
        {subtexto && <p className="text-[11px] text-slate-500 mt-1">{subtexto}</p>}
      </div>

      {Icono && (
        <div className={`p-3 rounded-lg ${c.iconBg} flex-shrink-0 shadow-inner`}>
          <Icono className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

