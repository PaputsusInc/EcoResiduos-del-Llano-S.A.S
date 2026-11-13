import { CONFIGURACION_FORMULARIO_INICIAL, validarConfiguracion } from './agConfiguracion.js';

const clave = (escenarioId) => `ecoresiduos:ag:configuracion:${escenarioId}`;
const campos = Object.keys(CONFIGURACION_FORMULARIO_INICIAL);

export function leerConfiguracionAg(escenarioId, almacenamiento = null) {
  try {
    const guardada = JSON.parse((almacenamiento ?? window.localStorage).getItem(clave(escenarioId)));
    if (!guardada || typeof guardada !== 'object') return { ...CONFIGURACION_FORMULARIO_INICIAL };
    const config = Object.fromEntries(campos.map((campo) => [
      campo, typeof guardada[campo] === 'string' ? guardada[campo] : CONFIGURACION_FORMULARIO_INICIAL[campo]
    ]));
    return Object.keys(validarConfiguracion(config)).length ? { ...CONFIGURACION_FORMULARIO_INICIAL } : config;
  } catch {
    return { ...CONFIGURACION_FORMULARIO_INICIAL };
  }
}

export function guardarConfiguracionAg(escenarioId, config, almacenamiento = null) {
  if (Object.keys(validarConfiguracion(config)).length) {
    throw new Error('Revisa los campos marcados antes de guardar la configuración.');
  }
  const guardada = Object.fromEntries(campos.map((campo) => [campo, String(config[campo])]));
  (almacenamiento ?? window.localStorage).setItem(clave(escenarioId), JSON.stringify(guardada));
  return guardada;
}
