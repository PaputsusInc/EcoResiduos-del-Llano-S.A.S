"""Comprobaciones de rangos y reoptimización de sensibilidad."""

import unittest

from exact_solver.analisis_sensibilidad import AnalisisSensibilidad
from exact_solver.construir_escenario import construir
from exact_solver.transporte_vogel_modi import RedInfactibleError, resolver


class AnalisisSensibilidadTest(unittest.TestCase):
    def setUp(self):
        self.empresas = [
            {"id": "E1", "oferta_t": 5}, {"id": "E2", "oferta_t": 5},
        ]
        self.plantas = [
            {"id": "P1", "capacidad_maxima_t": 5},
            {"id": "P2", "capacidad_maxima_t": 10},
        ]
        self.costos = {
            "E1->P1": 1, "E1->P2": 10,
            "E2->P1": 2, "E2->P2": 3,
        }
        self.solucion = resolver(self.empresas, self.plantas, self.costos, 1e-6)
        self.analisis = AnalisisSensibilidad(self.solucion)

    def test_rango_optimo_de_oferta_conserva_precio_sombra(self):
        datos = {dato["nodo_id"]: dato for dato in self.analisis.rango_optimo()["terminos_independientes"]}
        self.assertEqual((datos["E1"]["inferior"], datos["E1"]["superior"]), (5, 10))
        empresas = [self.empresas[0] | {"oferta_t": 6}, self.empresas[1]]
        costo_nuevo = resolver(empresas, self.plantas, self.costos, 1e-6).costo
        self.assertAlmostEqual(costo_nuevo, self.solucion.costo + datos["E1"]["precio_sombra"])
        empresas[0]["oferta_t"] = 4
        costo_fuera = resolver(empresas, self.plantas, self.costos, 1e-6).costo
        self.assertNotAlmostEqual(costo_fuera, self.solucion.costo - datos["E1"]["precio_sombra"])

    def test_rango_factible_es_mayor_y_detecta_cuello(self):
        datos = {dato["nodo_id"]: dato for dato in self.analisis.rango_factible()}
        self.assertEqual(datos["E1"]["inferior"], 0)
        self.assertEqual(datos["E1"]["superior"], 10)
        self.assertEqual(datos["P2"]["inferior"], 5)
        plantas = [self.plantas[0], self.plantas[1] | {"capacidad_maxima_t": 4}]
        with self.assertRaises(RedInfactibleError):
            resolver(self.empresas, plantas, self.costos, 1e-6)

    def test_rango_tarifa_delimita_optimalidad_de_la_base(self):
        datos = {dato["ruta"]: dato for dato in self.analisis.rango_optimo()["costos"]}
        self.assertEqual(datos["E1->P1"]["superior"], 9)
        dentro = self.analisis.variar_precios(
            self.empresas, self.plantas, self.costos, {"E1->P1": 8},
        )
        self.assertAlmostEqual(dentro.costo, self.solucion.costo + 5 * 7)
        fuera = self.analisis.variar_precios(
            self.empresas, self.plantas, self.costos, {"E1->P1": 10},
        )
        self.assertLess(fuera.costo, self.solucion.costo + 5 * 9)

    def test_variacion_no_modifica_datos_originales(self):
        solucion = self.analisis.variar(
            self.empresas, self.plantas, self.costos,
            {"tipo": "COSTOS", "porcentaje": 100, "nodo_id": "P1"},
        )
        self.assertEqual(solucion.costo, 25)
        self.assertEqual(self.costos["E1->P1"], 1)
        self.assertEqual(self.empresas[0]["oferta_t"], 5)

    def test_red_sin_oferta_ni_rutas_tiene_rangos_definidos(self):
        solucion = resolver(
            [{"id": "E", "oferta_t": 0}],
            [{"id": "P", "capacidad_maxima_t": 2}], {}, 1e-6,
        )
        analisis = AnalisisSensibilidad(solucion)
        oferta = analisis.rango_optimo()["terminos_independientes"][0]
        self.assertEqual((oferta["inferior"], oferta["superior"]), (0, 0))
        self.assertEqual(analisis.rango_factible()[0]["superior"], 0)

    def test_varias_perturbaciones_coinciden_con_escenario_materializado(self):
        escenario = {
            "empresas": self.empresas,
            "plantas": self.plantas,
            "rutas": [
                {"id": ruta, "planta_id": ruta.split("->")[1],
                 "costo_unitario_t": costo, "tarifa_t_km": costo / 10,
                 "activa": True, "compatible": True}
                for ruta, costo in self.costos.items()
            ],
        }
        cambios = [
            {"tipo": "OFERTA", "nodo_id": "E1", "porcentaje": 20},
            {"tipo": "CAPACIDAD", "nodo_id": "P2", "porcentaje": 10},
            {"tipo": "COSTOS", "nodo_id": "P1", "porcentaje": 50},
        ]
        creado = construir(escenario, cambios)
        self.assertEqual(creado["empresas"][0]["oferta_t"], 6)
        self.assertEqual(creado["plantas"][1]["capacidad_maxima_t"], 11)
        self.assertEqual(creado["rutas"][0]["costo_unitario_t"], 1.5)
        self.assertAlmostEqual(creado["rutas"][0]["tarifa_t_km"], 0.15)
        self.assertEqual(self.empresas[0]["oferta_t"], 5)
        self.assertEqual(self.costos["E1->P1"], 1)
        costos_nuevos = {r["id"]: r["costo_unitario_t"] for r in creado["rutas"]}
        self.assertEqual(resolver(creado["empresas"], creado["plantas"], costos_nuevos, 1e-6).costo,
                         resolver(*AnalisisSensibilidad.aplicar_variaciones(
                             self.empresas, self.plantas, self.costos, cambios), 1e-6).costo)

    def test_perturbaciones_invalidas_no_modifican_base(self):
        with self.assertRaises(ValueError):
            AnalisisSensibilidad.aplicar_variaciones(
                self.empresas, self.plantas, self.costos,
                [{"tipo": "OFERTA", "nodo_id": "INEXISTENTE", "porcentaje": 10}],
            )
        self.assertEqual(self.empresas[0]["oferta_t"], 5)


if __name__ == "__main__":
    unittest.main()
