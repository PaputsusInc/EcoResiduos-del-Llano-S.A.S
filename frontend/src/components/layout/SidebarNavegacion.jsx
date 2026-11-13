import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Factory,
  TrendingUp,
  Gauge,
  Route,
  DollarSign,
  CheckCircle2,
  CheckSquare,
  Network,
  Maximize2,
  GitCompare,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FlaskConical
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export function SidebarNavegacion({ abierto = false, alNavegar }) {
  const { escenarioActivo } = useSession();
  const tieneAviso = Boolean(escenarioActivo?.aviso_capacidad);

  const menuSections = [
    {
      title: "1. Red y Parámetros",
      items: [
        { path: "/empresas", label: "Empresas Generadoras", icon: Building2 },
        { path: "/plantas", label: "Plantas Procesadoras", icon: Factory },
        { path: "/oferta-semanal", label: "Oferta Semanal", icon: TrendingUp },
        { path: "/capacidad-plantas", label: "Capacidad de Plantas", icon: Gauge },
        { path: "/rutas-viales", label: "Rutas y Distancias Viales", icon: Route },
        { path: "/costos-transporte", label: "Costos de Transporte", icon: DollarSign },
        { path: "/validacion", label: "Validación del Escenario", icon: CheckCircle2 }
      ]
    },
    {
      title: "2. Optimización Exacta",
      items: [
        { path: "/resolucion-exacta", label: "Resolución Exacta", icon: CheckSquare },
        { path: "/asignacion-costos", label: "Asignación y Costos", icon: Network },
        { path: "/procedimiento-exacto", label: "Procedimiento Exacto", icon: Clock }
      ]
    },
    {
      title: "3. Algoritmo Genético y Comparación",
      items: [
        { path: "/comparacion-metodos", label: "Comparación Exacto vs AG", icon: GitCompare },
        { path: "/escalabilidad", label: "Escalabilidad de la Red", icon: Maximize2 },
        { path: "/ajuste-ag", label: "Ajuste de parámetros AG", icon: SlidersHorizontal },
        { path: "/evolucion-ag", label: "Evolución del Algoritmo Genético", icon: Sparkles }
      ]
    },
    {
      title: "4. Simulación y Sensibilidad",
      items: [
        { path: "/simulacion", label: "Laboratorio de Escenarios", icon: FlaskConical }
      ]
    }
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 flex-shrink-0 select-none transition-transform duration-200 xl:static xl:!translate-x-0 ${abierto ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <Link to="/panel" onClick={alNavegar} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
            🌱
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide leading-tight">EcoResiduos del Llano</h1>
            <p className="text-[11px] text-emerald-400 font-medium">Planificación Logística Semanal</p>
          </div>
        </Link>
      </div>

      {/* Hub Button */}
      <div className="p-3 border-b border-slate-800/60">
        <NavLink
          to="/panel"
          end
          onClick={alNavegar}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Panel de Control</span>
        </NavLink>
      </div>

      {/* Warning Pill if Capacity Exceeded */}
      {tieneAviso && (
        <div className="mx-3 mt-2 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="font-semibold text-[11px]">Capacidad superada por la oferta</span>
        </div>
      )}

      {/* Menu Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {menuSections.map((sec, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] uppercase font-bold text-slate-400 px-3 tracking-wider mb-1">
              {sec.title}
            </h3>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={alNavegar}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border-l-2 border-emerald-500 pl-2.5'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950 flex flex-col gap-0.5">
        <span className="font-medium text-slate-300">EcoResiduos del Llano S.A.S.</span>
        <span className="text-emerald-400 font-mono text-[10px]">Gestión Logística v1.0</span>
      </div>
    </aside>
  );
}

export default SidebarNavegacion;
