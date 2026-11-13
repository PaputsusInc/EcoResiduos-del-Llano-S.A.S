import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURACION_FORMULARIO_INICIAL, aplicarRecomendacion,
  crearConfiguracionAg, validarConfiguracion
} from '../src/pages/hu05_trazabilidad/agConfiguracion.js';

test('convierte porcentajes a tasas del contrato y deja valores técnicos al backend', () => {
  const config = crearConfiguracionAg(CONFIGURACION_FORMULARIO_INICIAL);
  assert.equal(config.tasa_mutacion, 0.05);
  assert.equal(config.tasa_cruce, 0.8);
  assert.equal(Object.hasOwn(config, 'metodo_seleccion'), false);
  assert.equal(Object.hasOwn(config, 'tipo_cruce'), false);
  assert.equal(Object.hasOwn(config, 'puntos_cruce'), false);
  assert.equal(Object.hasOwn(config, 'factor_penalizacion'), false);
  assert.equal(Object.hasOwn(config, 'escala_costo_referencia'), false);
  assert.equal(config.reemplazos, null);
});

test('el formulario no expone ni acepta un operador de cruce alternativo', () => {
  assert.equal(Object.hasOwn(CONFIGURACION_FORMULARIO_INICIAL, 'tipo_cruce'), false);
  assert.equal(Object.hasOwn(CONFIGURACION_FORMULARIO_INICIAL, 'puntos_cruce'), false);
  const config = crearConfiguracionAg({
    ...CONFIGURACION_FORMULARIO_INICIAL,
    tipo_cruce: 'BLOQUES_ORDEN',
    puntos_cruce: '1'
  });
  assert.equal(Object.hasOwn(config, 'tipo_cruce'), false);
  assert.equal(Object.hasOwn(config, 'puntos_cruce'), false);
});

test('bloquea configuraciones inconsistentes antes de invocar la API', () => {
  const errores = validarConfiguracion({
    ...CONFIGURACION_FORMULARIO_INICIAL,
    tamano_poblacion: '4', tamano_torneo: '5',
    elitismo: '4', tasa_mutacion_pct: '101'
  });
  assert.ok(errores.tamano_torneo);
  assert.ok(errores.elitismo);
  assert.ok(errores.tasa_mutacion_pct);
});

test('aplica una recomendación al formulario sin perder opciones ajenas al ajuste', () => {
  const actual = { ...CONFIGURACION_FORMULARIO_INICIAL, semilla: '29' };
  const form = aplicarRecomendacion(actual, {
    tamano_poblacion: 40, generaciones: 23, tasa_cruce: 0.85,
    tasa_mutacion: 0.12, tamano_torneo: 4, elitismo: 2, reemplazos: 18
  });
  assert.equal(form.semilla, '29');
  assert.equal(form.tasa_mutacion_pct, '12');
  assert.equal(crearConfiguracionAg(form).reemplazos, 18);
});
