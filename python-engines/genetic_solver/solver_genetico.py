#!/usr/bin/env python3
"""Entrada JSON y eventos JSONL del algoritmo genético lineal oficial.

Java ejecuta este archivo como proceso independiente. Cada generación se envía
de inmediato para que el software pueda mostrar el avance mientras el AG corre.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

# Ejecutar este archivo directamente no crea el paquete ``python-engines``.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.jsonl_protocol import emitir_evento, emitir_resultado_final
from genetic_solver.algoritmo import Configuracion, ejecutar
from genetic_solver.problema import comprobar_factibilidad, preparar_problema


def _resultado_sin_candidato(
    ejecucion_id: str, causa: str, inicio: float,
) -> dict[str, Any]:
    """El AG informa la causa sin atribuirse una certificación matemática."""
    return {
        "ejecucion_id": ejecucion_id,
        "metodo_usado": "AG",
        "estado": "SIN_CANDIDATO_FACTIBLE_AG",
        "causa_estado": causa,
        "motivo_finalizacion": "La red no permite construir un candidato que cubra toda la oferta",
        "costo_total_Z": None,
        "tiempo_ejecucion_s": round(time.perf_counter() - inicio, 4),
        "matriz_flujos_optimos": {},
        "sensibilidad_dual": [],
    }


def resolver(payload: dict[str, Any]) -> None:
    """Valida, evoluciona y emite resultados con el contrato de EcoResiduos."""
    inicio = time.perf_counter()
    ejecucion_id = payload.get("ejecucion_id", "EJE-02")
    problema = preparar_problema(
        payload.get("escenario"), payload.get("tolerancia_numerica", 1e-6)
    )
    configuracion = Configuracion.desde_json(
        payload.get("config_ag", {}), problema,
        payload.get("escala_costo_referencia", 1_000_000.0),
    )
    causa = comprobar_factibilidad(problema)
    if causa is not None:
        emitir_resultado_final(_resultado_sin_candidato(ejecucion_id, causa, inicio))
        return

    def informar_generacion(datos: dict[str, Any]) -> None:
        emitir_evento({"TIPO": "GENERACION_AG", "ejecucion_id": ejecucion_id, **datos})

    resultado = ejecutar(problema, configuracion, informar_generacion, inicio)
    emitir_resultado_final({
        "ejecucion_id": ejecucion_id,
        "metodo_usado": "AG",
        "estado": "FACTIBLE_SIN_CERTIFICAR",
        "causa_estado": "",
        "motivo_finalizacion": resultado.motivo_finalizacion,
        "costo_total_Z": resultado.mejor.plan.costo,
        "tiempo_ejecucion_s": round(resultado.tiempo_ejecucion_s, 4),
        "matriz_flujos_optimos": resultado.mejor.plan.flujos,
        "sensibilidad_dual": [],
        "generaciones_ejecutadas": resultado.generaciones_ejecutadas,
        "evaluaciones_totales": resultado.evaluaciones,
        "semilla_usada": configuracion.semilla,
        "escala_costo_referencia_usada": configuracion.escala_costo_referencia,
    })


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise ValueError("La entrada debe ser un objeto JSON")
        resolver(payload)
    except (ValueError, TypeError, KeyError, ArithmeticError) as error:
        print(f"Error en el algoritmo genético: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
