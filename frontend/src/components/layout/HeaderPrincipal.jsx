import React from 'react';
import { useSession } from '../../context/SessionContext';
import { Layers, AlertTriangle, CheckCircle, Menu } from 'lucide-react';

export function HeaderPrincipal({ abrirMenu }) {
  const { escenarioActivo, escenarioActivoId, cambiarEscenario, setEscenarioActivoId, listaEscenarios } = useSession();

  const handleCambiar = (id) => {
    if (cambiarEscenario) {
      cambiarEscenario(id);
    } else if (setEscenarioActivoId) {
      setEscenarioActivoId(id);
    }
  };

  const oferta = escenarioActivo?.empresas?.length
    ? escenarioActivo.empresas.reduce((sum, e) => sum + (Number(e.oferta_t) || 0), 0)
    : (escenarioActivo?.oferta_total_t ?? 115.0);

  const capacidad = escenarioActivo?.plantas?.length
    ? escenarioActivo.plantas.reduce((sum, p) => sum + (Number(p.capacidad_maxima_t) || 0), 0)
    : (escenarioActivo?.capacidad_total_t ?? 135.0);

  const tieneAviso = Boolean(escenarioActivo?.aviso_capacidad) || (oferta > capacidad);
  const holgura = capacidad - oferta;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between gap-3 shadow-xs sticky top-0 z-20">
      {/* Selector de Escenario Activo */}
      <div className="min-w-0 flex items-center gap-3">
        <button type="button" onClick={abrirMenu} aria-label="Abrir menú de navegación" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><Menu size={20} aria-hidden="true" /></button>
        <div className="hidden md:flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Escenario Activo:</span>
        </div>

        <select
          value={escenarioActivoId || escenarioActivo?.id || 'ESC-01'}
          onChange={(e) => handleCambiar(e.target.value)}
          className="min-w-0 max-w-[65vw] bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer shadow-xs"
        >
          {listaEscenarios.length > 0 ? (
            listaEscenarios.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.id} · {esc.nombre}
              </option>
            ))
          ) : (
            <option value="ESC-01">ESC-01 · Caso de referencia</option>
          )}
        </select>
      </div>

      {/* KPIs Rápidos de Balance */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
        <div className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
          <span className="text-slate-400">Oferta Total:</span>
          <span className="font-bold text-slate-900">{oferta.toFixed(1)} t/semana</span>
        </div>

        <div className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
          <span className="text-slate-400">Capacidad Total:</span>
          <span className="font-bold text-slate-900">{capacidad.toFixed(1)} t/semana</span>
        </div>

        {/* Estado de Capacidad */}
        {tieneAviso ? (
          <div className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1.5 font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Capacidad superada por la oferta</span>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Holgura: <strong>+{holgura.toFixed(1)} t/semana</strong></span>
          </div>
        )}
      </div>
    </header>
  );
}

export default HeaderPrincipal;
