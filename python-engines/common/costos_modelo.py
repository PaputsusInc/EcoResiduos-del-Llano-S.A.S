"""Coeficientes COP/t compartidos por el motor exacto y el genético."""

from __future__ import annotations

import math
from typing import Any


def _coeficiente(nodo: dict[str, Any], campo: str) -> float:
    valor = nodo.get(campo)
    if valor is None:  # Escenarios antiguos no tenían estos coeficientes.
        return 0.0
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{campo} de {nodo.get('id')} debe ser numérico")
    numero = float(valor)
    if not math.isfinite(numero) or numero < 0:
        raise ValueError(f"{campo} de {nodo.get('id')} debe ser finito y no negativo")
    return numero


def costos_objetivo(
    empresas: list[dict[str, Any]], plantas: list[dict[str, Any]],
    transporte: dict[str, float | None],
) -> dict[str, float | None]:
    """c_ij = transporte_ij + precio_i + operación_j; conserva rutas prohibidas."""
    precios = {e["id"]: _coeficiente(e, "precio_tonelada") for e in empresas}
    operaciones = {p["id"]: _coeficiente(p, "costo_operacion_t") for p in plantas}
    salida: dict[str, float | None] = {}
    for empresa in empresas:
        for planta in plantas:
            clave = f"{empresa['id']}->{planta['id']}"
            costo = transporte.get(clave)
            if costo is None:
                salida[clave] = None
                continue
            if isinstance(costo, bool) or not isinstance(costo, (int, float)):
                raise ValueError(f"Costo de transporte inválido en {clave}")
            unitario = float(costo)
            if not math.isfinite(unitario) or unitario < 0:
                raise ValueError(f"Costo de transporte inválido en {clave}")
            salida[clave] = unitario + precios[empresa["id"]] + operaciones[planta["id"]]
    return salida
