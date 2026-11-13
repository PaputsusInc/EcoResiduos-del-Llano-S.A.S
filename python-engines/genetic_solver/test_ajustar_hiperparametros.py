"""El ajuste respeta el contrato del AG y no se activa durante una ejecución normal."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from genetic_solver.ajustar_hiperparametros import ajustar
from genetic_solver.algoritmo import Configuracion
from genetic_solver.problema import preparar_problema

try:
    import optuna
except ImportError:
    optuna = None


ESCENARIO = {
    "empresas": [{"id": "A", "oferta_t": 2}, {"id": "B", "oferta_t": 2}],
    "plantas": [{"id": "X", "capacidad_maxima_t": 2}, {"id": "Y", "capacidad_maxima_t": 2}],
    "rutas": [
        {"id": f"{e}->{p}", "empresa_id": e, "planta_id": p, "costo_unitario_t": costo}
        for e, p, costo in [("A", "X", 1), ("A", "Y", 5), ("B", "X", 4), ("B", "Y", 2)]
    ],
}


@unittest.skipIf(optuna is None, "Optuna no está instalado en este Python")
class AjusteHiperparametrosTest(unittest.TestCase):
    def test_recomienda_configuracion_valida_con_presupuesto_acotado(self):
        payload = {"escenario": ESCENARIO, "config_ag": {"tamano_poblacion": 30, "generaciones": 10, "semilla": 7}}
        primero = ajustar(payload, optuna)
        segundo = ajustar(payload, optuna)
        self.assertEqual(primero["ensayos_completados"], 12)
        self.assertEqual(primero["semillas_por_ensayo"], 2)
        self.assertEqual(primero["config_ag"], segundo["config_ag"])
        self.assertEqual(primero["mejor_costo_promedio"], segundo["mejor_costo_promedio"])
        recomendada = Configuracion.desde_json(
            primero["config_ag"], preparar_problema(ESCENARIO, 1e-6)
        )
        self.assertLessEqual(
            recomendada.tamano_poblacion + recomendada.generaciones * recomendada.reemplazos,
            primero["presupuesto_evaluaciones"],
        )
        self.assertGreaterEqual(primero["mejor_costo_promedio"], 6)

    def test_rechaza_escenario_no_factible(self):
        escenario = {**ESCENARIO, "plantas": [{"id": "X", "capacidad_maxima_t": 1},
                                             {"id": "Y", "capacidad_maxima_t": 1}]}
        with self.assertRaisesRegex(ValueError, "no permite ajustar"):
            ajustar({"escenario": escenario, "config_ag": {}}, optuna)


if __name__ == "__main__":
    unittest.main()
