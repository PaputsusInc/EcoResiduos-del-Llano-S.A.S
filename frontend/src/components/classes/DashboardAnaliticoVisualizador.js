/**
 * Capa 1 — Clase Lógica de Presentación: DashboardAnaliticoVisualizador
 * Gobierna las vistas de resultados, KPI, procedimientos y seguimiento (HU-08, HU-09, HU-13 a HU-19)
 */
export class DashboardAnaliticoVisualizador {
  constructor(escenario_activo_id = "ESC-01", ejecucion_activa_id = null) {
    this.escenario_activo_id = escenario_activo_id;
    this.ejecucion_activa_id = ejecucion_activa_id;
  }

  mostrar_estado_ejecucion(estado, causa = "", aviso_capacidad = "") {
    return {
      estado: estado || "EN_EJECUCION",
      causa: causa || "",
      aviso_capacidad: aviso_capacidad || (estado === "INFACTIBLE_CERTIFICADO" ? "Capacidad superada por la oferta" : ""),
      es_optimo: estado === "OPTIMO",
      es_factible: estado === "FACTIBLE_SIN_CERTIFICAR" || estado === "OPTIMO",
      es_infactible: estado === "INFACTIBLE_CERTIFICADO"
    };
  }

  renderizar_resultado_optimizacion(resultado) {
    return {
      id: resultado?.id,
      metodo_usado: resultado?.metodo_usado,
      estado: resultado?.estado,
      causa_estado: resultado?.causa_estado,
      motivo_finalizacion: resultado?.motivo_finalizacion,
      costo_total_Z: resultado?.costo_total_Z,
      tiempo_ejecucion_s: resultado?.tiempo_ejecucion_s,
      matriz_flujos_optimos: resultado?.matriz_flujos_optimos || {},
      sensibilidad_dual: resultado?.sensibilidad_dual || [],
      historial_generaciones: resultado?.historial_generaciones || [],
      pasos_exactos: resultado?.pasos_exactos || []
    };
  }

  mostrar_asignacion_y_costos(resultado, escenario) {
    const desglose = [];
    const flujos = resultado?.matriz_flujos_optimos || {};

    Object.entries(flujos).forEach(([conexion, tons]) => {
      if (tons && tons > 1e-6) {
        const [empId, plaId] = conexion.split("->");
        const ruta = escenario?.rutas?.find(r => r.id === conexion);
        const costoUnit = ruta?.costo_unitario_t || 0.0;
        desglose.push({
          conexion,
          empresa_id: empId,
          planta_id: plaId,
          toneladas: tons,
          costo_unitario_t: costoUnit,
          costo_transporte: tons * costoUnit
        });
      }
    });

    return desglose;
  }

  mostrar_precios_sombra(sensibilidad_dual) {
    if (!Array.isArray(sensibilidad_dual)) return [];
    return sensibilidad_dual.map(ps => ({
      nodo_id: ps.nodo_id,
      restriccion: ps.restriccion,
      parametro: ps.parametro,
      valor_vigente: ps.valor_vigente,
      precio_sombra: ps.precio_sombra != null ? ps.precio_sombra : null,
      holgura: ps.holgura != null ? ps.holgura : 0.0
    }));
  }

  mostrar_rangos_optimalidad(rangos) {
    if (!Array.isArray(rangos)) return [];
    return rangos.map(r => ({
      nodo_id: r.nodo_id,
      parametro: r.parametro,
      valor_vigente: r.valor_vigente,
      limite_inferior: r.limite_inferior || "Sin límite",
      limite_superior: r.limite_superior || "Sin límite",
      aumento_permitido: r.rango_aumento_permitido,
      reduccion_permitida: r.rango_reduccion_permitido
    }));
  }

  renderizar_reporte_comparativo(reporte) {
    return {
      escenario_id: reporte?.escenario_id,
      costo_exacto: reporte?.resultado_exacto?.costo_total_Z,
      costo_ag: reporte?.resultado_genetico?.costo_total_Z,
      tiempo_exacto: reporte?.resultado_exacto?.tiempo_ejecucion_s,
      tiempo_ag: reporte?.resultado_genetico?.tiempo_ejecucion_s,
      porcentaje_gap: reporte?.porcentaje_gap,
      diferencia_costo: reporte?.diferencia_costo,
      diferencia_tiempo_s: reporte?.diferencia_tiempo_s
    };
  }

  mostrar_avance_e_historial_ag(resultado) {
    const historial = resultado?.historial_generaciones || [];
    const curva = resultado?.curva_convergencia_fitness || [];
    const ultimo = historial.length > 0 ? historial[historial.length - 1] : null;

    return {
      total_generaciones: historial.length,
      generacion_actual: ultimo?.numero ?? 0,
      mejor_costo_acumulado: ultimo?.mejor_costo_acumulado,
      mejor_costo_factible: ultimo?.mejor_costo_factible,
      candidatos_factibles: ultimo?.candidatos_factibles ?? 0,
      mejor_aptitud: ultimo?.mejor_aptitud,
      historial,
      curva
    };
  }

  mostrar_modelo_y_pasos_exactos(resultado) {
    return {
      modelo_formulado: resultado?.modelo_formulado || {},
      pasos_exactos: resultado?.pasos_exactos || []
    };
  }
}

