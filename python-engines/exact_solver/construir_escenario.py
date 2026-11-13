#!/usr/bin/env python3
"""Materializa una variante de red usando la misma lógica que el solver exacto."""

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from exact_solver.analisis_sensibilidad import AnalisisSensibilidad


def construir(escenario: dict, variaciones: list[dict]) -> dict:
    empresas = escenario["empresas"]
    plantas = escenario["plantas"]
    rutas = escenario["rutas"]
    costos = {
        ruta["id"]: ruta.get("costo_unitario_t")
        if ruta.get("activa", True) and ruta.get("compatible", True) else None
        for ruta in rutas
    }
    empresas, plantas, nuevos_costos = AnalisisSensibilidad.aplicar_variaciones(
        empresas, plantas, costos, variaciones,
    )
    tarifas = {ruta["id"]: ruta.get("tarifa_t_km") for ruta in rutas}
    for variacion in variaciones:
        if variacion["tipo"] == "COSTOS":
            factor = 1 + float(variacion["porcentaje"]) / 100
            for ruta in rutas:
                if costos[ruta["id"]] is not None and (
                    not variacion.get("nodo_id") or ruta["planta_id"] == variacion["nodo_id"]
                ) and tarifas[ruta["id"]] is not None:
                    tarifas[ruta["id"]] *= factor
    resultado = escenario.copy()
    resultado["empresas"] = empresas
    resultado["plantas"] = plantas
    resultado["rutas"] = [
        {**ruta, "costo_unitario_t": nuevos_costos[ruta["id"]],
         "tarifa_t_km": tarifas[ruta["id"]]}
        if costos[ruta["id"]] is not None else ruta.copy()
        for ruta in rutas
    ]
    oferta = math.fsum(float(e["oferta_t"]) for e in empresas)
    capacidad = math.fsum(float(p["capacidad_maxima_t"]) for p in plantas)
    resultado["oferta_total_t"] = oferta
    resultado["capacidad_total_t"] = capacidad
    resultado["aviso_capacidad"] = "Capacidad superada por la oferta" if oferta > capacidad else ""
    return resultado


if __name__ == "__main__":
    try:
        entrada = json.load(sys.stdin)
        json.dump(construir(entrada["escenario"], entrada["variaciones"]), sys.stdout,
                  ensure_ascii=False, allow_nan=False)
    except (KeyError, TypeError, ValueError) as error:
        print(f"Escenario inválido: {error}", file=sys.stderr)
        raise SystemExit(1)
