import test from 'node:test';
import assert from 'node:assert/strict';
import { resumirCurvaCosto } from '../src/pages/hu05_trazabilidad/curvaCostoAg.js';

test('acerca mejoras tempranas y conserva el final de la corrida completa', () => {
  const historial = Array.from({ length: 31 }, (_, numero) => ({
    numero,
    mejor_costo_acumulado: numero === 0 ? 1073850 : numero === 1 ? 1029750 : numero < 4 ? 997650 : 997500
  }));
  const resumen = resumirCurvaCosto(historial);
  assert.equal(resumen.ultimo.numero, 30);
  assert.equal(resumen.ultimaMejora, 4);
  assert.equal(resumen.generacionesEstables, 26);
  assert.equal(resumen.ahorro, 76350);
  assert.equal(resumen.finDetalle, 8);
  assert.equal(resumen.puedeAmpliar, true);
});

test('una línea estable representa datos válidos y no fuerza un zoom artificial', () => {
  const resumen = resumirCurvaCosto([
    { numero: 0, mejor_costo_acumulado: 997500 },
    { numero: 20, mejor_costo_acumulado: 997500 }
  ]);
  assert.equal(resumen.cantidadMejoras, 0);
  assert.equal(resumen.ahorro, 0);
  assert.equal(resumen.puedeAmpliar, false);
});

test('una mejora tardía pequeña no oculta el tramo que aportó casi todo el ahorro', () => {
  const historial = Array.from({ length: 201 }, (_, numero) => ({
    numero,
    mejor_costo_acumulado: numero === 0 ? 1000 : numero < 74 ? 500 : 499
  }));
  const resumen = resumirCurvaCosto(historial);
  assert.equal(resumen.generacionAhorroPrincipal, 1);
  assert.equal(resumen.ultimaMejora, 74);
  assert.equal(resumen.finDetalle, 9);
  assert.equal(resumen.generacionesEstables, 126);
});

test('ignora registros sin costo antes de calcular la curva', () => {
  const resumen = resumirCurvaCosto([
    { numero: 1, mejor_costo_acumulado: null },
    { numero: 0, mejor_costo_acumulado: 1200 },
    { numero: 2, mejor_costo_acumulado: 1000 }
  ]);
  assert.deepEqual(resumen.puntos.map((punto) => punto.numero), [0, 2]);
  assert.equal(resumen.ahorro, 200);
});
