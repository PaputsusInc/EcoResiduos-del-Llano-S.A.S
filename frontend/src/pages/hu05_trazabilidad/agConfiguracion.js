export const CONFIGURACION_INICIAL = {
  tamano_poblacion: 100,
  generaciones: 200,
  tasa_cruce: 0.8,
  tasa_mutacion: 0.05,
  metodo_seleccion: 'TORNEO',
  tamano_torneo: 3,
  tipo_cruce: 'OX',
  puntos_cruce: 2,
  elitismo: 1,
  reemplazos: null,
  limite_sin_mejora: null,
  umbral_mejora_cop: 0,
  factor_penalizacion: 1000,
  escala_costo_referencia: 1000000,
  semilla: 42
};

const entero = (valor, minimo) => Number.isInteger(Number(valor)) && valor !== '' && Number(valor) >= minimo;
const decimal = (valor, minimo, maximo = Infinity) => valor !== '' && Number.isFinite(Number(valor))
  && Number(valor) >= minimo && Number(valor) <= maximo;

export function validarConfiguracion(config) {
  const errores = {};
  if (!entero(config.tamano_poblacion, 2)) errores.tamano_poblacion = 'Ingresa al menos 2 candidatos.';
  if (!entero(config.generaciones, 1)) errores.generaciones = 'Ingresa al menos 1 generación.';
  if (!decimal(config.tasa_cruce_pct, 0, 100)) errores.tasa_cruce_pct = 'Usa un porcentaje entre 0 y 100.';
  if (!decimal(config.tasa_mutacion_pct, 0, 100)) errores.tasa_mutacion_pct = 'Usa un porcentaje entre 0 y 100.';
  if (!entero(config.tamano_torneo, 1) || Number(config.tamano_torneo) > Number(config.tamano_poblacion)) {
    errores.tamano_torneo = 'Debe estar entre 1 y el tamaño de la población.';
  }
  if (!entero(config.elitismo, 0) || Number(config.elitismo) >= Number(config.tamano_poblacion)) {
    errores.elitismo = 'Debe ser menor que el tamaño de la población.';
  }
  if (config.reemplazos !== '' && (!entero(config.reemplazos, 1)
      || Number(config.reemplazos) > Number(config.tamano_poblacion) - Number(config.elitismo))) {
    errores.reemplazos = 'Debe caber entre los candidatos no protegidos.';
  }
  if (config.limite_sin_mejora !== '' && !entero(config.limite_sin_mejora, 1)) {
    errores.limite_sin_mejora = 'Ingresa un entero positivo o deja el campo vacío.';
  }
  if (config.semilla !== '' && !entero(config.semilla, 0)) {
    errores.semilla = 'Ingresa un entero no negativo o deja el campo vacío.';
  }
  return errores;
}

export function crearConfiguracionAg(config) {
  const errores = validarConfiguracion(config);
  if (Object.keys(errores).length) throw new Error('Revisa los campos marcados antes de continuar.');
  return {
    ...CONFIGURACION_INICIAL,
    tamano_poblacion: Number(config.tamano_poblacion),
    generaciones: Number(config.generaciones),
    tasa_cruce: Number(config.tasa_cruce_pct) / 100,
    tasa_mutacion: Number(config.tasa_mutacion_pct) / 100,
    tamano_torneo: Number(config.tamano_torneo),
    elitismo: Number(config.elitismo),
    reemplazos: config.reemplazos === '' ? null : Number(config.reemplazos),
    limite_sin_mejora: config.limite_sin_mejora === '' ? null : Number(config.limite_sin_mejora),
    semilla: config.semilla === '' ? null : Number(config.semilla)
  };
}

export const CONFIGURACION_FORMULARIO_INICIAL = {
  tamano_poblacion: String(CONFIGURACION_INICIAL.tamano_poblacion),
  generaciones: String(CONFIGURACION_INICIAL.generaciones),
  tasa_cruce_pct: String(CONFIGURACION_INICIAL.tasa_cruce * 100),
  tasa_mutacion_pct: String(CONFIGURACION_INICIAL.tasa_mutacion * 100),
  tamano_torneo: String(CONFIGURACION_INICIAL.tamano_torneo),
  elitismo: String(CONFIGURACION_INICIAL.elitismo),
  reemplazos: '',
  limite_sin_mejora: '',
  semilla: String(CONFIGURACION_INICIAL.semilla)
};

export function aplicarRecomendacion(actual, recomendada) {
  return {
    ...actual,
    tamano_poblacion: String(recomendada.tamano_poblacion),
    generaciones: String(recomendada.generaciones),
    tasa_cruce_pct: String(Math.round(recomendada.tasa_cruce * 1000) / 10),
    tasa_mutacion_pct: String(Math.round(recomendada.tasa_mutacion * 1000) / 10),
    tamano_torneo: String(recomendada.tamano_torneo),
    elitismo: String(recomendada.elitismo),
    reemplazos: String(recomendada.reemplazos),
    limite_sin_mejora: recomendada.limite_sin_mejora == null ? '' : String(recomendada.limite_sin_mejora)
  };
}
