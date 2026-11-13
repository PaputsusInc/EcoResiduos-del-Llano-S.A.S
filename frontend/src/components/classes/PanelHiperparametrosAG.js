/**
 * Capa 1 — Clase Lógica de Presentación: PanelHiperparametrosAG
 * Gobierna el panel de hiperparámetros del Algoritmo Genético (HU-16, HU-18)
 */
export class PanelHiperparametrosAG {
  constructor(escenario_activo_id = "ESC-01") {
    this.escenario_activo_id = escenario_activo_id;
  }

  capturar_hiperparametros_ag(formulario) {
    let tamano = Number(formulario?.tamano_poblacion) || 100;
    let gens = Number(formulario?.generaciones) || 200;
    let cruce = Number(formulario?.tasa_cruce);
    let mut = Number(formulario?.tasa_mutacion);
    let sem = formulario?.semilla != null ? Number(formulario.semilla) : 42;

    // Normalización de porcentaje [0, 100] -> [0.0, 1.0]
    if (cruce > 1.0) cruce = cruce / 100.0;
    if (mut > 1.0) mut = mut / 100.0;

    return {
      tamano_poblacion: tamano,
      generaciones: gens,
      tasa_cruce: cruce ?? 0.80,
      tasa_mutacion: mut ?? 0.05,
      metodo_seleccion: formulario?.metodo_seleccion || "TORNEO",
      semilla: sem
    };
  }

  solicitar_comparacion_metodos(escenario_id, config_ag) {
    return {
      escenario_id: escenario_id || this.escenario_activo_id,
      metodo: "COMPARATIVO",
      config_ag: this.capturar_hiperparametros_ag(config_ag)
    };
  }

  mostrar_errores_configuracion_ag(errores) {
    return Array.isArray(errores) ? errores : [String(errores)];
  }
}
