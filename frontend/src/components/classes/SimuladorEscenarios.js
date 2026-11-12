/**
 * Capa 1 — Clase Lógica de Presentación: SimuladorEscenarios
 * Gobierna las vistas de sensibilidad multi-escenario (HU-10 a HU-13)
 */
export class SimuladorEscenarios {
  constructor(escenario_referencia_id = "ESC-01", escenario_variante_id = null) {
    this.escenario_referencia_id = escenario_referencia_id;
    this.escenario_variante_id = escenario_variante_id;
  }

  capturar_variacion_costos(referencia_id, cambios_costos) {
    return {
      referencia_id: referencia_id || this.escenario_referencia_id,
      tipo_variacion: "COSTOS",
      cambios: Array.isArray(cambios_costos) ? cambios_costos : []
    };
  }

  capturar_variacion_oferta(referencia_id, empresa_id, variacion_pct, nuevo_valor_t) {
    return {
      referencia_id: referencia_id || this.escenario_referencia_id,
      tipo_variacion: "OFERTA",
      empresa_id,
      variacion_pct: Number(variacion_pct),
      nuevo_valor_t: Number(nuevo_valor_t)
    };
  }

  capturar_variacion_capacidad(referencia_id, planta_id, nueva_capacidad_t) {
    return {
      referencia_id: referencia_id || this.escenario_referencia_id,
      tipo_variacion: "CAPACIDAD",
      planta_id,
      nueva_capacidad_t: Number(nueva_capacidad_t)
    };
  }

  solicitar_evaluacion_sensibilidad(referencia_id, perturbaciones, config_ag) {
    return {
      referencia_id: referencia_id || this.escenario_referencia_id,
      perturbaciones: Array.isArray(perturbaciones) ? perturbaciones : [],
      config_ag: config_ag || null
    };
  }

  mostrar_comparacion_sensibilidad(referencia, variante, reporte_ref, reporte_var) {
    return {
      referencia,
      variante,
      reporte_referencia: reporte_ref,
      reporte_variante: reporte_var,
      costo_ref_exacto: reporte_ref?.resultado_exacto?.costo_total_Z,
      costo_var_exacto: reporte_var?.resultado_exacto?.costo_total_Z,
      gap_ref: reporte_ref?.porcentaje_gap,
      gap_var: reporte_var?.porcentaje_gap
    };
  }
}

