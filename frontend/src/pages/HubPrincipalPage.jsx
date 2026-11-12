import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Factory,
  TrendingUp,
  Gauge,
  Route,
  DollarSign,
  CheckCircle2,
  CheckSquare,
  Network,
  Activity,
  Sliders,
  Maximize2,
  GitCompare,
  FileSpreadsheet,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { TarjetaKPI } from '../components/common/TarjetaKPI';
import { AlertaCapacidad } from '../components/common/AlertaCapacidad';

export function HubPrincipalPage() {
  const { escenarioActivo } = useSession();

  const oferta = escenarioActivo?.oferta_total_t ?? 115.0;
  const capacidad = escenarioActivo?.capacidad_total_t ?? 135.0;
  const tieneAviso = Boolean(escenarioActivo?.aviso_capacidad);

  const bloques = [
    {
      titulo: "1. Red y Parámetros Logísticos",
      descripcion: "Definición de empresas generadoras, plantas procesadoras, rutas viales, tarifas y consistencia.",
      color: "emerald",
      tarjetas: [
        { titulo: "Empresas Generadoras", desc: "Ubicación geográfica, oferta individual y compatibilidad de residuos.", ruta: "/empresas", icon: Building2 },
        { titulo: "Plantas Procesadoras", desc: "Capacidad instalada, tipos de residuos admitidos y ubicación.", ruta: "/plantas", icon: Factory },
        { titulo: "Oferta Semanal", desc: "Ajuste dinámico de ofertas y balance de biomasa en tiempo real.", ruta: "/oferta-semanal", icon: TrendingUp },
        { titulo: "Capacidad de Plantas", desc: "Gestión de capacidades operativas y distribución de carga.", ruta: "/capacidad-plantas", icon: Gauge },
        { titulo: "Rutas y Distancias Viales", desc: "Matriz vial origen-destino, visualización de rutas y tiempos.", ruta: "/rutas-viales", icon: Route },
        { titulo: "Costos de Transporte", desc: "Tarifas por tonelada-kilómetro y matriz de costos unitarios.", ruta: "/costos-transporte", icon: DollarSign },
        { titulo: "Validación del Escenario", desc: "Verificación de consistencia, balance de masa y conectividad de red.", ruta: "/validacion", icon: CheckCircle2 }
      ]
    },
    {
      titulo: "2. Optimización Exacta y Dualidad",
      descripcion: "Resolución del Modelo de Transporte balanceado, asignaciones óptimas y sensibilidad dual.",
      color: "blue",
      tarjetas: [
        { titulo: "Resolución Exacta", desc: "Ejecución del método exacto, monitoreo y estados de solución.", ruta: "/resolucion-exacta", icon: CheckSquare },
        { titulo: "Asignación y Costos", desc: "Matriz óptima de flujos de transporte y desglose detallado de envíos.", ruta: "/asignacion-costos", icon: Network },
        { titulo: "Precios Sombra", desc: "Impacto marginal por tonelada adicional en plantas y generadores.", ruta: "/precios-sombra", icon: Activity },
        { titulo: "Rangos de Optimalidad", desc: "Intervalos de variación de costos sin alterar la base óptima.", ruta: "/rangos-optimalidad", icon: Sliders },
        { titulo: "Procedimiento Exacto", desc: "Trazabilidad paso a paso del método: solución inicial y multiplicadores.", ruta: "/procedimiento-exacto", icon: Clock }
      ]
    },
    {
      titulo: "3. Algoritmo Genético y Comparación",
      descripcion: "Optimización metaheurística por prioridades, convergencia y análisis de escalabilidad.",
      color: "amber",
      tarjetas: [
        { titulo: "Comparación Exacto vs AG", desc: "Contraste de costo total, tiempos de cómputo y brecha de optimalidad.", ruta: "/comparacion-metodos", icon: GitCompare },
        { titulo: "Escalabilidad de la Red", desc: "Evaluación del comportamiento computacional al ampliar la red.", ruta: "/escalabilidad", icon: Maximize2 },
        { titulo: "Evolución del Algoritmo Genético", desc: "Monitoreo en vivo del progreso generacional y convergencia del fitness.", ruta: "/evolucion-ag", icon: Sparkles }
      ]
    },
    {
      titulo: "4. Simulación y Sensibilidad",
      descripcion: "Evaluación de escenarios alternativos y robustez operativa ante variaciones.",
      color: "rose",
      tarjetas: [
        { titulo: "Variación de Costos", desc: "Simulación de cambios en costos de transporte y reasignación de flujos.", ruta: "/sensibilidad-costos", icon: DollarSign },
        { titulo: "Variación de Ofertas", desc: "Evaluación ante incrementos o caídas en la generación de biomasa.", ruta: "/sensibilidad-ofertas", icon: TrendingUp },
        { titulo: "Variación de Capacidades", desc: "Impacto operativo ante paradas técnicas o reducción de capacidad.", ruta: "/sensibilidad-capacidades", icon: Gauge },
        { titulo: "Evaluación de Sensibilidad", desc: "Comparativa consolidada de múltiples escenarios y rutas robustas.", ruta: "/evaluacion-sensibilidad", icon: FileSpreadsheet }
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner Principal de Bienvenida */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wider uppercase border border-emerald-500/30">
            EcoResiduos del Llano S.A.S.
          </span>
          <h2 className="text-2xl font-black mt-2 tracking-tight">
            Sistema de Optimización Logística Integral
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Plataforma integral de gestión logística que optimiza las rutas de recolección, asignación de biomasa y costos de transporte hacia las plantas procesadoras en el departamento del Meta mediante modelos de optimización exacta y metaheurística.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Link
            to="/resolucion-exacta"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <span>Resolver Modelo Exacto</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/comparacion-metodos"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
          >
            <span>Comparar Exacto vs AG</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Alerta de Capacidad si aplica */}
      <AlertaCapacidad visible={tieneAviso} />

      {/* Resumen de KPIs del Escenario Activo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaKPI
          titulo="Empresas Generadoras"
          valor={escenarioActivo?.empresas?.length ?? 10}
          unidad="nodos"
          subtexto="Palma, arroz, cacao, cítricos"
          color="amber"
          icono={Building2}
        />
        <TarjetaKPI
          titulo="Plantas Procesadoras"
          valor={escenarioActivo?.plantas?.length ?? 4}
          unidad="nodos"
          subtexto="Villavicencio, Restrepo, Granada, Gaitán"
          color="emerald"
          icono={Factory}
        />
        <TarjetaKPI
          titulo="Oferta Total Semanal"
          valor={oferta.toFixed(1)}
          unidad="t/semana"
          subtexto="Demanda agregada de recolección"
          color="blue"
          icono={TrendingUp}
        />
        <TarjetaKPI
          titulo="Capacidad Instalada"
          valor={capacidad.toFixed(1)}
          unidad="t/semana"
          subtexto={tieneAviso ? "Superada por la oferta" : `Holgura: +${(capacidad - oferta).toFixed(1)} t/semana`}
          color={tieneAviso ? "rose" : "emerald"}
          icono={tieneAviso ? ShieldAlert : Gauge}
        />
      </div>

      {/* Grilla de los 4 Bloques y sus 19 Tarjetas */}
      <div className="space-y-8">
        {bloques.map((bloque, bIdx) => (
          <section key={bIdx} className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {bloque.titulo}
              </h3>
              <p className="text-xs text-slate-500">
                {bloque.descripcion}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bloque.tarjetas.map((tarjeta) => {
                const Icon = tarjeta.icon;
                return (
                  <Link
                    key={tarjeta.ruta}
                    to={tarjeta.ruta}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {tarjeta.titulo}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {tarjeta.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                      <span>Abrir módulo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default HubPrincipalPage;

