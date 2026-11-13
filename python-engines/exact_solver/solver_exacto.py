#!/usr/bin/env python3
"""Motor exacto de transporte con Vogel y MODI reales.

Entrada: escenario JSON por stdin. Salida: eventos JSONL para el backend.
"""

from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.jsonl_protocol import (
    emitir_modelo_formulado, emitir_paso_exacto, emitir_resultado_final,
)
from common.costos_modelo import costos_objetivo
from exact_solver.transporte_vogel_modi import RedInfactibleError, resolver
from exact_solver.analisis_sensibilidad import AnalisisSensibilidad


def resolver_modelo_transporte_rol_2(
    empresas: list[dict[str, Any]],
    plantas: list[dict[str, Any]],
    matriz_costos: dict[str, float | None],
    tolerancia: float = 1e-6,
) -> tuple[dict[str, float], float, list[dict[str, Any]], list[tuple[str, str, dict]], dict]:
    """Conserva el contrato del backend y traduce la solución Vogel–MODI."""
    solucion = resolver(empresas, plantas, matriz_costos, tolerancia)
    analizador = AnalisisSensibilidad(solucion)
    analisis = analizador.rango_optimo()
    factibles = {dato["nodo_id"]: dato for dato in analizador.rango_factible()}
    for dato in analisis["terminos_independientes"]:
        dato["rango_factible"] = factibles[dato["nodo_id"]]
    rangos = {dato["nodo_id"]: dato for dato in analisis["terminos_independientes"]}
    flujos = {
        f"{empresa['id']}->{planta['id']}": cantidad
        for i, empresa in enumerate(empresas)
        for j, planta in enumerate(plantas)
        if (cantidad := solucion.flujos[i][j]) > 0
    }
    precios = []
    for j, planta in enumerate(plantas):
        capacidad = float(planta["capacidad_maxima_t"])
        recibido = math.fsum(solucion.flujos[i][j] for i in range(len(empresas)))
        precios.append({
            "ejecucion_id": "ACTUAL",
            "nodo_id": planta["id"],
            "restriccion": f"Capacidad de {planta['id']}",
            "parametro": f"{planta['id']}.capacidad_maxima_t",
            "valor_vigente": capacidad,
            "precio_sombra": solucion.precios_plantas[j],
            "holgura": max(0.0, capacidad - recibido),
            "rango_aumento_permitido": None if rangos[planta["id"]]["superior"] is None else max(0.0, rangos[planta["id"]]["superior"] - capacidad),
            "rango_reduccion_permitido": max(0.0, capacidad - rangos[planta["id"]]["inferior"]),
            "limite_inferior": str(rangos[planta["id"]]["inferior"]),
            "limite_superior": None if rangos[planta["id"]]["superior"] is None else str(rangos[planta["id"]]["superior"]),
        })
    for i, empresa in enumerate(empresas):
        precios.append({
            "ejecucion_id": "ACTUAL",
            "nodo_id": empresa["id"],
            "restriccion": f"Oferta de {empresa['id']}",
            "parametro": f"{empresa['id']}.oferta_t",
            "valor_vigente": empresa["oferta_t"],
            "precio_sombra": solucion.precios_empresas[i],
            "holgura": 0.0,
            "rango_aumento_permitido": None if rangos[empresa["id"]]["superior"] is None else max(0.0, rangos[empresa["id"]]["superior"] - empresa["oferta_t"]),
            "rango_reduccion_permitido": max(0.0, empresa["oferta_t"] - rangos[empresa["id"]]["inferior"]),
            "limite_inferior": str(rangos[empresa["id"]]["inferior"]),
            "limite_superior": None if rangos[empresa["id"]]["superior"] is None else str(rangos[empresa["id"]]["superior"]),
        })
    return flujos, solucion.costo, precios, solucion.pasos, analisis


def main() -> int:
    inicio = time.perf_counter()
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise ValueError("La entrada debe ser un objeto JSON")
        escenario = payload["escenario"]
        empresas = escenario["empresas"]
        plantas = escenario["plantas"]
        rutas = escenario["rutas"]
        ejecucion_id = payload.get("ejecucion_id", "EJE-01")
        tolerancia = float(payload.get("tolerancia_numerica", 1e-6))
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        print(f"Entrada inválida para el motor exacto: {error}", file=sys.stderr)
        return 1

    matriz_costos = {
        ruta["id"]: (
            ruta.get("costo_unitario_t")
            if ruta.get("activa", True) is not False
            and ruta.get("compatible", True) is not False
            else None
        )
        for ruta in rutas
    }
    try:
        if payload.get("variaciones") is not None:
            empresas, plantas, matriz_costos = AnalisisSensibilidad.aplicar_variaciones(
                empresas, plantas, matriz_costos, payload["variaciones"],
            )
        elif payload.get("variacion") is not None:
            empresas, plantas, matriz_costos = AnalisisSensibilidad.aplicar_variacion(
                empresas, plantas, matriz_costos, payload["variacion"],
            )
        oferta_total = math.fsum(float(e["oferta_t"]) for e in empresas)
        capacidad_total = math.fsum(float(p["capacidad_maxima_t"]) for p in plantas)
        matriz_objetivo = costos_objetivo(empresas, plantas, matriz_costos)
    except (TypeError, ValueError) as error:
        print(f"Variación inválida: {error}", file=sys.stderr)
        return 1
    emitir_paso_exacto(
        ejecucion_id, 1, "PREPARACION",
        f"Lectura de {len(empresas)} empresas, {len(plantas)} plantas, oferta {oferta_total:g} t y capacidad {capacidad_total:g} t.",
        {"cantidad_empresas": len(empresas), "cantidad_plantas": len(plantas),
         "oferta_total_t": oferta_total, "capacidad_total_t": capacidad_total,
         "es_intermedio": True},
    )

    if oferta_total > capacidad_total + tolerancia:
        emitir_paso_exacto(
            ejecucion_id, 2, "FORMULACION",
            "La oferta total supera la capacidad total; no existe asignación factible.",
            {"oferta_total_t": oferta_total, "capacidad_total_t": capacidad_total,
             "deficit_capacidad_t": oferta_total - capacidad_total, "es_intermedio": True},
        )
        _emitir_infactible(
            ejecucion_id, "Capacidad superada por la oferta",
            "La oferta total semanal supera la capacidad agregada.", inicio,
        )
        return 0

    modelo = {
        "funcion_objetivo": "Min Z = sum((transporte_ij + precio_i + operacion_j) * x_ij)",
        "cantidad_empresas": len(empresas),
        "cantidad_plantas": len(plantas),
        "variables_activas": sum(c is not None for c in matriz_objetivo.values()),
        "oferta_total_t": oferta_total,
        "capacidad_total_t": capacidad_total,
        "holgura_auxiliar_t": max(0.0, capacidad_total - oferta_total),
        "ofertas": {e["id"]: e["oferta_t"] for e in empresas},
        "capacidades": {p["id"]: p["capacidad_maxima_t"] for p in plantas},
        "precios_tonelada": {e["id"]: e.get("precio_tonelada") or 0 for e in empresas},
        "costos_operacion_t": {p["id"]: p.get("costo_operacion_t") or 0 for p in plantas},
    }
    emitir_modelo_formulado(ejecucion_id, modelo)
    emitir_paso_exacto(
        ejecucion_id, 2, "FORMULACION",
        f"Modelo balanceado con origen auxiliar de {modelo['holgura_auxiliar_t']:g} t; rutas prohibidas excluidas.",
        {"modelo": modelo, "es_intermedio": True},
    )
    try:
        flujos, costo, precios, pasos, analisis = resolver_modelo_transporte_rol_2(
            empresas, plantas, matriz_objetivo, tolerancia,
        )
    except RedInfactibleError as error:
        _emitir_infactible(
            ejecucion_id, str(error),
            "No existe flujo que cubra la oferta con las rutas disponibles.", inicio,
        )
        return 0
    except (ValueError, ArithmeticError) as error:
        print(f"Error del motor Vogel–MODI: {error}", file=sys.stderr)
        return 1

    siguiente = 3
    for etapa, operacion, datos in pasos:
        emitir_paso_exacto(ejecucion_id, siguiente, etapa, operacion, datos)
        siguiente += 1
    for precio in precios:
        precio["ejecucion_id"] = ejecucion_id
    emitir_paso_exacto(
        ejecucion_id, siguiente, "VALIDACION",
        f"Ofertas y capacidades verificadas. Óptimo certificado por MODI: {costo:,.2f} COP.",
        {"ofertas_satisfechas": len(empresas),
         "capacidades_respetadas": len(plantas),
         "costo_optimo_cop": costo, "es_intermedio": False},
    )
    emitir_resultado_final({
        "ejecucion_id": ejecucion_id,
        "metodo_usado": "EXACTO",
        "estado": "OPTIMO",
        "causa_estado": "",
        "motivo_finalizacion": "Óptimo certificado por MODI desde una solución inicial de Vogel, cumpliendo oferta, capacidad y rutas",
        "costo_total_Z": costo,
        "tiempo_ejecucion_s": round(time.perf_counter() - inicio, 4),
        "matriz_flujos_optimos": flujos,
        "sensibilidad_dual": precios,
        "analisis_sensibilidad": analisis,
        "modelo_formulado": modelo,
    })
    return 0


def _emitir_infactible(
    ejecucion_id: str, causa: str, motivo: str, inicio: float,
) -> None:
    emitir_resultado_final({
        "ejecucion_id": ejecucion_id,
        "metodo_usado": "EXACTO",
        "estado": "INFACTIBLE_CERTIFICADO",
        "causa_estado": causa,
        "motivo_finalizacion": motivo,
        "costo_total_Z": None,
        "tiempo_ejecucion_s": round(time.perf_counter() - inicio, 4),
        "matriz_flujos_optimos": {},
        "sensibilidad_dual": [],
    })


if __name__ == "__main__":
    raise SystemExit(main())
