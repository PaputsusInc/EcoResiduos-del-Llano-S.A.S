#!/usr/bin/env python3
"""Ajuste bajo demanda del AG para un escenario y presupuesto de evaluaciones."""

from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from genetic_solver.algoritmo import Configuracion, ejecutar
from genetic_solver.problema import comprobar_factibilidad, preparar_problema


def ajustar(payload: dict[str, Any], optuna_mod: Any = None) -> dict[str, Any]:
    """Compara candidatos con idéntico presupuesto y dos semillas reproducibles."""
    if optuna_mod is None:
        try:
            import optuna as optuna_mod
        except ImportError as error:
            raise RuntimeError(
                "El ajuste requiere Optuna. Instala python-engines/requirements.txt "
                "en el Python configurado para el backend."
            ) from error

    problema = preparar_problema(payload.get("escenario"), payload.get("tolerancia_numerica", 1e-6))
    causa = comprobar_factibilidad(problema)
    if causa is not None:
        raise ValueError(f"El escenario no permite ajustar el AG: {causa}")

    datos_base = payload.get("config_ag", {})
    base = Configuracion.desde_json(datos_base, problema, payload.get("escala_costo_referencia", 1_000_000.0))
    presupuesto_base = base.tamano_poblacion + base.generaciones * base.reemplazos
    presupuesto = min(1200, max(300, presupuesto_base))
    semilla_base = base.semilla if base.semilla is not None else 42
    semillas = (semilla_base, semilla_base + 1009)
    limite_poblacion = max(20, min(100, presupuesto // 3))
    inicio = time.perf_counter()
    configuraciones: dict[int, dict[str, Any]] = {}

    def objetivo(ensayo: Any) -> float:
        poblacion = ensayo.suggest_int("tamano_poblacion", 20, limite_poblacion, step=10)
        cruce = ensayo.suggest_float("tasa_cruce", 0.55, 0.95, step=0.05)
        mutacion = ensayo.suggest_float("tasa_mutacion", 0.01, 0.30, step=0.01)
        torneo = ensayo.suggest_int("tamano_torneo", 2, min(5, poblacion))
        elitismo = ensayo.suggest_int("elitismo", 1, min(4, poblacion - 1))
        porcentaje_reemplazo = ensayo.suggest_float("porcentaje_reemplazo", 0.25, 0.75, step=0.25)
        reemplazos = max(1, min(poblacion - elitismo, round((poblacion - elitismo) * porcentaje_reemplazo)))
        generaciones = max(1, (presupuesto - poblacion) // reemplazos)
        config = {
            **datos_base,
            "tamano_poblacion": poblacion,
            "generaciones": generaciones,
            "tasa_cruce": cruce,
            "tasa_mutacion": mutacion,
            "tamano_torneo": torneo,
            "elitismo": elitismo,
            "reemplazos": reemplazos,
            "limite_sin_mejora": None,
        }
        costos = []
        for semilla in semillas:
            evaluada = Configuracion.desde_json({**config, "semilla": semilla}, problema)
            resultado = ejecutar(problema, evaluada, lambda _: None, time.perf_counter())
            costo = resultado.mejor.plan.costo
            if not math.isfinite(costo):
                raise ValueError("El ajuste recibió un costo no finito.")
            costos.append(costo)
        configuraciones[ensayo.number] = config
        return sum(costos) / len(costos)

    optuna_mod.logging.set_verbosity(optuna_mod.logging.WARNING)
    estudio = optuna_mod.create_study(
        direction="minimize",
        sampler=optuna_mod.samplers.TPESampler(seed=semilla_base, n_startup_trials=4),
    )
    # La primera prueba aproxima la configuración actual dentro del espacio
    # acotado; así la búsqueda tiene una referencia del usuario.
    poblacion_base = min(limite_poblacion, max(20, round(base.tamano_poblacion / 10) * 10))
    torneo_base = min(max(2, base.tamano_torneo), min(5, poblacion_base))
    elitismo_base = min(max(1, base.elitismo), min(4, poblacion_base - 1))
    fraccion_base = base.reemplazos / max(1, base.tamano_poblacion - base.elitismo)
    estudio.enqueue_trial({
        "tamano_poblacion": poblacion_base,
        "tasa_cruce": round(round(min(0.95, max(0.55, base.tasa_cruce)) / 0.05) * 0.05, 2),
        "tasa_mutacion": round(round(min(0.30, max(0.01, base.tasa_mutacion)) / 0.01) * 0.01, 2),
        "tamano_torneo": torneo_base,
        "elitismo": elitismo_base,
        "porcentaje_reemplazo": min((0.25, 0.5, 0.75), key=lambda valor: abs(valor - fraccion_base)),
    })
    estudio.optimize(objetivo, n_trials=12, n_jobs=1, show_progress_bar=False)
    mejor = configuraciones[estudio.best_trial.number]
    return {
        "config_ag": mejor,
        "mejor_costo_promedio": estudio.best_value,
        "ensayos_completados": len(estudio.trials),
        "semillas_por_ensayo": len(semillas),
        "presupuesto_evaluaciones": presupuesto,
        "tiempo_ajuste_s": round(time.perf_counter() - inicio, 3),
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise ValueError("La entrada debe ser un objeto JSON.")
        print(json.dumps(ajustar(payload), allow_nan=False), flush=True)
    except (ValueError, TypeError, KeyError, RuntimeError) as error:
        print(f"Error al ajustar hiperparámetros: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
