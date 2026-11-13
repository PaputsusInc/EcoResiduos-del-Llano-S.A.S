"""Regresiones de factibilidad y costo del protocolo del motor exacto."""

import json
import subprocess
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("solver_exacto.py")


def escenario(ofertas, capacidades, costos, desactivadas=(), incompatibles=()):
    empresas = [{"id": f"E{i}", "oferta_t": oferta}
                for i, oferta in enumerate(ofertas)]
    plantas = [{"id": f"P{j}", "capacidad_maxima_t": capacidad}
              for j, capacidad in enumerate(capacidades)]
    rutas = [
        {"id": f"E{i}->P{j}", "empresa_id": f"E{i}", "planta_id": f"P{j}",
         "costo_unitario_t": costo, "activa": (i, j) not in desactivadas,
         "compatible": (i, j) not in incompatibles}
        for i, fila in enumerate(costos) for j, costo in enumerate(fila)
        if costo is not None
    ]
    return {"empresas": empresas, "plantas": plantas, "rutas": rutas}


def ejecutar(datos):
    def rechazar_no_finito(valor):
        raise AssertionError(f"JSON no estándar: {valor}")

    proceso = subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=json.dumps({"ejecucion_id": "PRUEBA", "escenario": datos}),
        text=True, capture_output=True, timeout=20, check=True,
    )
    eventos = [json.loads(linea, parse_constant=rechazar_no_finito)
               for linea in proceso.stdout.splitlines()]
    return eventos, next(evento for evento in eventos
                         if evento["TIPO"] == "RESULTADO_FINAL")


class SolverExactoTest(unittest.TestCase):
    def test_bloquea_rutas_inactivas_e_incompatibles_aunque_tengan_costo(self):
        for atributo in ("desactivadas", "incompatibles"):
            with self.subTest(atributo=atributo):
                datos = escenario([1, 1], [1, 1], [[1, 20], [20, 1]],
                                  **{atributo: ((0, 0),)})
                _, resultado = ejecutar(datos)
                self.assertEqual(resultado["estado"], "OPTIMO")
                self.assertEqual(resultado["costo_total_Z"], 40)
                self.assertNotIn("E0->P0", resultado["matriz_flujos_optimos"])

    def test_acepta_costo_alto_valido_y_conserva_precision(self):
        _, alto = ejecutar(escenario([1], [1], [[100_000_000]]))
        self.assertEqual(alto["estado"], "OPTIMO")
        self.assertEqual(alto["costo_total_Z"], 100_000_000)
        _, fraccion = ejecutar(escenario([0.1234567], [1], [[3]]))
        self.assertAlmostEqual(fraccion["matriz_flujos_optimos"]["E0->P0"], 0.1234567)
        self.assertAlmostEqual(fraccion["costo_total_Z"], 0.3703701)

    def test_detecta_cuello_de_botella_aun_con_capacidad_total_suficiente(self):
        datos = escenario([2, 2, 2], [2, 2, 2],
                          [[1, None, None], [2, None, None], [None, 1, 1]])
        _, resultado = ejecutar(datos)
        self.assertEqual(resultado["estado"], "INFACTIBLE_CERTIFICADO")
        self.assertIsNone(resultado["costo_total_Z"])
        self.assertIsNone(resultado["tiempo_ejecucion_s"])

    def test_vogel_y_modi_ejecutan_pivote_real_hasta_el_optimo(self):
        datos = escenario([1, 1, 1], [3, 7, 2],
                          [[10, 9, 20], [7, 20, 2], [19, 6, 14]])
        eventos, resultado = ejecutar(datos)
        pasos = [e for e in eventos if e["TIPO"] == "PASO_EXACTO"]
        self.assertEqual(resultado["estado"], "OPTIMO")
        self.assertEqual(resultado["costo_total_Z"], 17)
        self.assertTrue(any(p["datos"].get("submetodo") == "VOGEL"
                            and p["datos"].get("costo_intermedio_cop") == 18
                            for p in pasos))
        pivotes = [p for p in pasos if p["datos"].get("submetodo") == "MODI"
                   and "celda_entrante" in p["datos"]]
        self.assertTrue(pivotes)
        self.assertEqual(pivotes[-1]["datos"]["costo_tras_ajuste_cop"], 17)
        self.assertTrue(any(p["datos"].get("costos_reducidos_no_negativos")
                            for p in pasos))

        precios = {p["nodo_id"]: p["precio_sombra"]
                   for p in resultado["sensibilidad_dual"]}
        dual = sum(precios[f"E{i}"] for i in range(3))
        dual += sum(precios[f"P{j}"] * capacidad
                    for j, capacidad in enumerate([3, 7, 2]))
        self.assertAlmostEqual(dual, resultado["costo_total_Z"])

    def test_pivote_degenerado_con_theta_cero(self):
        datos = escenario([4, 1, 1], [5, 4, 4],
                          [[2, 15, 12], [1, 16, 9], [5, 20, 11]])
        eventos, resultado = ejecutar(datos)
        self.assertEqual(resultado["estado"], "OPTIMO")
        self.assertEqual(resultado["costo_total_Z"], 20)
        self.assertTrue(any(
            paso["datos"].get("submetodo") == "MODI"
            and paso["datos"].get("ajuste_theta_t") == 0
            for paso in eventos if paso["TIPO"] == "PASO_EXACTO"
        ))


if __name__ == "__main__":
    unittest.main()
