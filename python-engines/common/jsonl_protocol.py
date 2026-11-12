"""
Módulo de comunicación inter-proceso para emisión de eventos JSON Lines (JSONL).
Garantiza vaciado inmediato (flush=True) para que el hilo lector de Java (ProcessBuilder)
y el frontend React reciban los eventos en tiempo real sin almacenamiento en búfer.
"""

import json
import sys
from typing import Any, Dict


def emitir_evento(evento: Dict[str, Any]) -> None:
    """
    Serializa un diccionario a una sola línea JSON y la escribe en stdout con flush inmediato.
    """
    linea = json.dumps(evento, ensure_ascii=False)
    sys.stdout.write(linea + "\n")
    sys.stdout.flush()


def emitir_paso_exacto(ejecucion_id: str, numero: int, etapa: str, operacion: str, datos: Dict[str, Any]) -> None:
    """
    Emite un evento de paso del método exacto (DD-71 a DD-75, RF-34).
    Etapas válidas: PREPARACION, FORMULACION, RESOLUCION, VALIDACION.
    """
    emitir_evento({
        "TIPO": "PASO_EXACTO",
        "ejecucion_id": ejecucion_id,
        "numero": numero,
        "etapa": etapa,
        "operacion": operacion,
        "datos": datos
    })


def emitir_modelo_formulado(ejecucion_id: str, modelo_formulado: Dict[str, Any]) -> None:
    """
    Emite la formulación matemática del modelo de transporte (DD-70, RF-33).
    """
    emitir_evento({
        "TIPO": "MODELO_FORMULADO",
        "ejecucion_id": ejecucion_id,
        "modelo_formulado": modelo_formulado
    })


def emitir_generacion_ag(ejecucion_id: str, numero: int, mejor_costo_factible: Any,
                         mejor_costo_acumulado: Any, candidatos_factibles: int, mejor_aptitud: float) -> None:
    """
    Emite el registro de avance de una generación del Algoritmo Genético (DD-63 a DD-68, RF-31, RF-32).
    """
    emitir_evento({
        "TIPO": "GENERACION_AG",
        "ejecucion_id": ejecucion_id,
        "numero": numero,
        "mejor_costo_factible": mejor_costo_factible,
        "mejor_costo_acumulado": mejor_costo_acumulado,
        "candidatos_factibles": candidatos_factibles,
        "mejor_aptitud": mejor_aptitud
    })


def emitir_resultado_final(resultado: Dict[str, Any]) -> None:
    """
    Emite el evento de cierre definitivo con el ResultadoOptimizacion final.
    """
    resultado["TIPO"] = "RESULTADO_FINAL"
    emitir_evento(resultado)

