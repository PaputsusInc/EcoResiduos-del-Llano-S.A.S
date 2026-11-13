"""Casos funcionales que protegen el contrato del AG lineal."""

from __future__ import annotations

import random
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from genetic_solver.algoritmo import (
    Configuracion, cruzar, ejecutar, evaluar, mutar_por_intercambio,
)
from genetic_solver.problema import (
    comprobar_factibilidad, decodificar, preparar_problema,
)


def escenario(rutas: list[dict], capacidad_y: float = 2) -> dict:
    return {
        "empresas": [
            {"id": "A", "oferta_t": 2},
            {"id": "B", "oferta_t": 2},
        ],
        "plantas": [
            {"id": "X", "capacidad_maxima_t": 2},
            {"id": "Y", "capacidad_maxima_t": capacidad_y},
        ],
        "rutas": rutas,
    }


def ruta(empresa: str, planta: str, costo: float, **opciones: object) -> dict:
    return {
        "id": f"{empresa}->{planta}",
        "empresa_id": empresa,
        "planta_id": planta,
        "costo_unitario_t": costo,
        **opciones,
    }


class GeneticSolverTest(unittest.TestCase):
    def test_red_parcial_conserva_factibilidad_y_respeta_rutas(self) -> None:
        problema = preparar_problema(escenario([
            ruta("A", "X", 3),
            ruta("A", "Y", 1, activa=False),
            ruta("B", "X", 0),
            ruta("B", "Y", 6),
        ]), 1e-6)

        self.assertIsNone(comprobar_factibilidad(problema))
        # B->X es gratuita pero dejaría a A sin su única planta. El
        # decodificador debe poder reasignar antes de completar el plan.
        for cromosoma in (
            (0, 1, 2, 3), (3, 2, 1, 0), (1, 3, 0, 2)
        ):
            plan = decodificar(problema, cromosoma)
            self.assertLessEqual(plan.faltante, 1e-6)
            self.assertEqual(plan.flujos, {"A->X": 2, "B->Y": 2})
            self.assertEqual(plan.costo, 18)

        sin_y = preparar_problema(escenario([
            ruta("A", "X", 3), ruta("B", "X", 0),
            ruta("B", "Y", 6, compatible=False),
        ]), 1e-6)
        self.assertIn("rutas", comprobar_factibilidad(sin_y))
        sin_capacidad = preparar_problema(escenario([
            ruta("A", "X", 3), ruta("B", "Y", 6),
        ], capacidad_y=1), 1e-6)
        self.assertIn("capacidad", comprobar_factibilidad(sin_capacidad))

    def test_operadores_configurables_y_generaciones(self) -> None:
        problema = preparar_problema(escenario([
            ruta("A", "X", 1), ruta("A", "Y", 8),
            ruta("B", "X", 7), ruta("B", "Y", 2),
        ]), 1e-6)
        config = Configuracion.desde_json({
            "tamano_poblacion": 6,
            "generaciones": 5,
            "tamano_torneo": 2,
            "tipo_cruce": "BLOQUES_ORDEN",
            "puntos_cruce": 1,
            "elitismo": 2,
            "reemplazos": 2,
            "semilla": 7,
        }, problema)
        padre_a, padre_b = (0, 1, 2, 3), (3, 2, 1, 0)
        hijos = cruzar(padre_a, padre_b, config, random.Random(7))
        for hijo in hijos:
            self.assertEqual(set(hijo), set(padre_a))
            self.assertEqual(set(mutar_por_intercambio(hijo, random.Random(7))), set(padre_a))

        config_ox = Configuracion.desde_json({"semilla": 7}, problema)
        for hijo in cruzar(padre_a, padre_b, config_ox, random.Random(7)):
            self.assertEqual(set(hijo), set(padre_a))
        individuo = evaluar(problema, config_ox, padre_a)
        self.assertAlmostEqual(
            individuo.aptitud,
            1 / (1 + individuo.plan.costo / config_ox.escala_costo_referencia),
        )

        eventos = []
        resultado = ejecutar(problema, config, eventos.append, time.perf_counter())
        self.assertEqual([e["numero"] for e in eventos], list(range(6)))
        self.assertEqual([e["evaluaciones_acumuladas"] for e in eventos],
                         [6, 8, 10, 12, 14, 16])
        self.assertTrue(all(e["candidatos_factibles"] == 6 for e in eventos))
        self.assertEqual(
            [e["mejor_costo_acumulado"] for e in eventos],
            sorted((e["mejor_costo_acumulado"] for e in eventos), reverse=True),
        )
        self.assertLessEqual(resultado.mejor.plan.faltante, 1e-6)
        repeticion = ejecutar(problema, config, lambda _: None, time.perf_counter())
        self.assertEqual(resultado.mejor.cromosoma, repeticion.mejor.cromosoma)
        self.assertEqual(resultado.mejor.plan.costo, repeticion.mejor.plan.costo)

    def test_parada_temprana_y_error_de_configuracion(self) -> None:
        problema = preparar_problema(escenario([
            ruta("A", "X", 1), ruta("A", "Y", 1),
            ruta("B", "X", 1), ruta("B", "Y", 1),
        ]), 1e-6)
        config = Configuracion.desde_json({
            "tamano_poblacion": 4,
            "generaciones": 10,
            "tasa_cruce": 0,
            "tasa_mutacion": 0,
            "limite_sin_mejora": 2,
            "semilla": 11,
        }, problema)
        eventos = []
        resultado = ejecutar(problema, config, eventos.append, time.perf_counter())
        self.assertEqual([e["numero"] for e in eventos], [0, 1, 2])
        self.assertEqual(resultado.generaciones_ejecutadas, 2)
        self.assertIn("sin mejora", resultado.motivo_finalizacion)

        with self.assertRaisesRegex(ValueError, "desconocidos"):
            Configuracion.desde_json({"max_generaciones": 10}, problema)
        with self.assertRaisesRegex(ValueError, "OX"):
            Configuracion.desde_json({"puntos_cruce": 3}, problema)

    def test_oferta_pequena_no_desaparece_por_tolerancia(self) -> None:
        datos = {
            "empresas": [{"id": "A", "oferta_t": 0.0000007}],
            "plantas": [{"id": "X", "capacidad_maxima_t": 1}],
            "rutas": [ruta("A", "X", 3)],
        }
        problema = preparar_problema(datos, 1e-6)
        plan = decodificar(problema, (0, 1))
        self.assertEqual(plan.flujos, {"A->X": 0.0000007})
        self.assertAlmostEqual(plan.costo, 0.0000021)

        datos["rutas"] = []
        self.assertIsNotNone(comprobar_factibilidad(preparar_problema(datos, 1e-6)))

    def test_redes_aleatorias_respetan_balance_capacidad_rutas_y_costo(self) -> None:
        generador = random.Random(29)
        planes_revisados = 0
        for _ in range(150):
            m, n = generador.randint(2, 7), generador.randint(2, 5)
            ofertas = [generador.randint(0, 12) for _ in range(m)]
            capacidades = [generador.randint(0, 15) for _ in range(n)]
            rutas = [
                ruta(f"E{i}", f"P{j}", generador.randint(0, 20),
                     activa=generador.random() > 0.1)
                for i in range(m) for j in range(n)
                if generador.random() > 0.22
            ]
            problema = preparar_problema({
                "empresas": [{"id": f"E{i}", "oferta_t": oferta}
                             for i, oferta in enumerate(ofertas)],
                "plantas": [{"id": f"P{j}", "capacidad_maxima_t": capacidad}
                            for j, capacidad in enumerate(capacidades)],
                "rutas": rutas,
            }, 1e-6)
            if comprobar_factibilidad(problema) is not None:
                continue
            costos_activos = {
                item["id"]: item["costo_unitario_t"] for item in rutas
                if item["activa"]
            }
            for _ in range(5):
                cromosoma = list(range(m + n))
                generador.shuffle(cromosoma)
                plan = decodificar(problema, tuple(cromosoma))
                self.assertLessEqual(plan.faltante, 1e-6)
                for i, oferta in enumerate(ofertas):
                    self.assertAlmostEqual(
                        sum(plan.flujos.get(f"E{i}->P{j}", 0) for j in range(n)), oferta
                    )
                for j, capacidad in enumerate(capacidades):
                    self.assertLessEqual(
                        sum(plan.flujos.get(f"E{i}->P{j}", 0) for i in range(m)),
                        capacidad + 1e-6,
                    )
                self.assertTrue(set(plan.flujos) <= set(costos_activos))
                self.assertAlmostEqual(
                    plan.costo,
                    sum(cantidad * costos_activos[identificador]
                        for identificador, cantidad in plan.flujos.items()),
                )
                planes_revisados += 1
        self.assertGreaterEqual(planes_revisados, 300)


if __name__ == "__main__":
    unittest.main()
