import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIGURACION_FORMULARIO_INICIAL, crearConfiguracionAg } from '../src/pages/hu05_trazabilidad/agConfiguracion.js';
import { guardarConfiguracionAg, leerConfiguracionAg } from '../src/pages/hu05_trazabilidad/configuracionAgGuardada.js';

function almacenamientoMemoria() {
  const datos = new Map();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor)
  };
}

test('conserva por escenario la configuración elegida para la ejecución', () => {
  const almacenamiento = almacenamientoMemoria();
  const elegida = { ...CONFIGURACION_FORMULARIO_INICIAL, tamano_poblacion: '36', generaciones: '25', tasa_mutacion_pct: '12.5' };
  guardarConfiguracionAg('ESC-01', elegida, almacenamiento);
  assert.deepEqual(leerConfiguracionAg('ESC-01', almacenamiento), elegida);
  assert.equal(crearConfiguracionAg(leerConfiguracionAg('ESC-01', almacenamiento)).tasa_mutacion, 0.125);
  assert.deepEqual(leerConfiguracionAg('ESC-02', almacenamiento), CONFIGURACION_FORMULARIO_INICIAL);
});

test('impide guardar datos inválidos y recupera valores iniciales si el almacenamiento está dañado', () => {
  const almacenamiento = almacenamientoMemoria();
  assert.throws(() => guardarConfiguracionAg('ESC-01', { ...CONFIGURACION_FORMULARIO_INICIAL, tamano_poblacion: '1' }, almacenamiento));
  almacenamiento.setItem('ecoresiduos:ag:configuracion:ESC-01', '{');
  assert.deepEqual(leerConfiguracionAg('ESC-01', almacenamiento), CONFIGURACION_FORMULARIO_INICIAL);
});
