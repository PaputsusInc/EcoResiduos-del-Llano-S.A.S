#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
SISTEMA DE OPTIMIZACIÓN LOGÍSTICA - ECORESIDUOS DEL LLANO S.A.S.
MOTOR METAHEURÍSTICO - ALGORITMO GENÉTICO POR PRIORIDADES (ROL 3)
===============================================================================
Entrada: Objeto JSON recibido por stdin (Escenario y ConfiguracionAG).
Salida:  Flujo de eventos JSONL en stdout en tiempo real (DD-63 a DD-69, RF-31, RF-32).
Métodos:
  1. Cromosoma: Permutación de prioridades de longitud M + N (DD-40, RF-21).
  2. Decodificador Greedy por Prioridades eligiendo menor costo c_ij (RF-21).
  3. Función de Aptitud F = 1 / (1 + Z / Cref + P) (DD-41, DD-42, RF-22).
  4. Selección por Torneo (RF-23).
  5. Cruce por Orden de dos cortes - OX (RF-24).
  6. Mutación por Intercambio - Swap (RF-25).
  7. Elitismo y seguimiento en vivo por generación desde 0 hasta N (RF-31, RF-32).
  8. Cronómetro en segundos de ejecución (RF-27).
===============================================================================
"""

import json
import os
import random
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

# Asegurar importación de jsonl_protocol
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.jsonl_protocol import emitir_generacion_ag, emitir_resultado_final


# =============================================================================
# [PUNTO DE ENCHUFE METAHEURÍSTICO - COMPAÑERO DE ROL 3]
# =============================================================================
# Estimado compañero de Rol 3:
# Si deseas modificar o sustituir la decodificación del cromosoma, el cálculo
# de la función de aptitud, o los operadores genéticos (cruce, mutación, torneo),
# puedes modificar directamente las funciones marcadas con:
#     - `decodificar_cromosoma_greedy(...)`
#     - `evaluar_fitness_candidato(...)`
#     - `cruce_por_orden_ox(...)`
#     - `mutacion_por_intercambio_swap(...)`
# Respeta los contratos de entrada y salida para que el seguimiento en vivo
# por polling HTTP en React y los adaptadores de Java continúen funcionando.
# =============================================================================


def decodificar_cromosoma_greedy(
    cromosoma: List[int],
    empresas: List[Dict[str, Any]],
    plantas: List[Dict[str, Any]],
    matriz_costos: Dict[str, Optional[float]],
) -> Tuple[Dict[str, float], float, float]:
    """
    Decodificador Greedy por Prioridades (RF-21, DD-40).
    Recorre los nodos según el orden de prioridad en el cromosoma.
    Para cada nodo con demanda u oferta pendiente, busca la contraparte activa
    y compatible de menor costo unitario c_ij.

    Retorna:
      - asignaciones: Diccionario {"EMP-01->PLA-01": toneladas, ...}
      - costo_total_Z: Suma(c_ij * x_ij) en COP
      - penalizacion: Toneladas de oferta no asignadas
    """
    m = len(empresas)
    n = len(plantas)

    ofertas_restantes = [float(e.get("oferta_t", 0.0)) for e in empresas]
    capacidades_restantes = [float(p.get("capacidad_maxima_t", 0.0)) for p in plantas]

    asignaciones: Dict[str, float] = {}
    costo_total_Z = 0.0

    # Ordenar índices de nodos (0..m-1 son empresas, m..m+n-1 son plantas) por prioridad decreciente
    # Un valor mayor en el cromosoma indica mayor prioridad
    orden_nodos = sorted(range(m + n), key=lambda idx: cromosoma[idx], reverse=True)

    for nodo_idx in orden_nodos:
        if nodo_idx < m:
            # Es una Empresa i
            i = nodo_idx
            if ofertas_restantes[i] <= 1e-6:
                continue

            emp_id = empresas[i]["id"]

            # Buscar plantas con capacidad disponible y conexión activa, ordenadas por menor costo unitario
            candidatas = []
            for j, pla in enumerate(plantas):
                if capacidades_restantes[j] > 1e-6:
                    key = f"{emp_id}->{pla['id']}"
                    costo = matriz_costos.get(key)
                    if costo is not None and costo < 1e8:
                        candidatas.append((costo, cromosoma[m + j], j, key))

            # Ordenar por menor costo c_ij, y desempatar por mayor prioridad de planta en el cromosoma
            candidatas.sort(key=lambda x: (x[0], -x[1]))

            for costo, _, j, key in candidatas:
                if ofertas_restantes[i] <= 1e-6:
                    break
                cant = min(ofertas_restantes[i], capacidades_restantes[j])
                if cant > 1e-6:
                    asignaciones[key] = asignaciones.get(key, 0.0) + cant
                    costo_total_Z += cant * costo
                    ofertas_restantes[i] -= cant
                    capacidades_restantes[j] -= cant
        else:
            # Es una Planta j
            j = nodo_idx - m
            if capacidades_restantes[j] <= 1e-6:
                continue

            pla_id = plantas[j]["id"]

            # Buscar empresas con oferta disponible y conexión activa, ordenadas por menor costo unitario
            candidatas = []
            for i, emp in enumerate(empresas):
                if ofertas_restantes[i] > 1e-6:
                    key = f"{emp['id']}->{pla_id}"
                    costo = matriz_costos.get(key)
                    if costo is not None and costo < 1e8:
                        candidatas.append((costo, cromosoma[i], i, key))

            # Ordenar por menor costo c_ij, y desempatar por mayor prioridad de empresa en el cromosoma
            candidatas.sort(key=lambda x: (x[0], -x[1]))

            for costo, _, i, key in candidatas:
                if capacidades_restantes[j] <= 1e-6:
                    break
                cant = min(ofertas_restantes[i], capacidades_restantes[j])
                if cant > 1e-6:
                    asignaciones[key] = asignaciones.get(key, 0.0) + cant
                    costo_total_Z += cant * costo
                    ofertas_restantes[i] -= cant
                    capacidades_restantes[j] -= cant

    penalizacion_t = sum(max(0.0, of) for of in ofertas_restantes)
    return asignaciones, costo_total_Z, penalizacion_t


def evaluar_fitness_candidato(
    costo_total_Z: float,
    penalizacion_t: float,
    oferta_total: float,
    escala_costo_referencia: float = 1_000_000.0,
    factor_penalizacion: float = 1000.0,
) -> Tuple[float, bool]:
    """
    Función de aptitud estandarizada (DD-41, DD-42, RF-22):
      F = 1 / (1 + Z / Cref + P)
    donde P = factor_penalizacion * (penalizacion_t / max(1.0, oferta_total)).
    Retorna: (fitness, es_factible)
    """
    p_relativa = factor_penalizacion * (penalizacion_t / max(1.0, oferta_total))
    denom = 1.0 + (costo_total_Z / max(1.0, escala_costo_referencia)) + p_relativa
    fitness = 1.0 / max(1e-6, denom)
    es_factible = penalizacion_t <= 1e-6
    return fitness, es_factible


def cruce_por_orden_ox(padre1: List[int], padre2: List[int]) -> List[int]:
    """
    Cruce por Orden de 2 cortes (OX - Order Crossover) para permutaciones (RF-24).
    Conserva un segmento continuo del padre 1 y rellena el resto en el orden del padre 2.
    """
    size = len(padre1)
    if size < 2:
        return padre1.copy()

    cx1, cx2 = sorted(random.sample(range(size), 2))
    hijo = [-1] * size

    # Copiar segmento del padre 1
    hijo[cx1 : cx2 + 1] = padre1[cx1 : cx2 + 1]
    elementos_en_hijo = set(hijo[cx1 : cx2 + 1])

    # Rellenar con los elementos del padre 2 manteniendo su orden circular
    p2_pos = (cx2 + 1) % size
    hijo_pos = (cx2 + 1) % size

    for _ in range(size):
        elem = padre2[p2_pos]
        if elem not in elementos_en_hijo:
            hijo[hijo_pos] = elem
            elementos_en_hijo.add(elem)
            hijo_pos = (hijo_pos + 1) % size
        p2_pos = (p2_pos + 1) % size

    return hijo


def mutacion_por_intercambio_swap(cromosoma: List[int], tasa_mutacion: float) -> List[int]:
    """
    Mutación por Intercambio (Swap Mutation) (RF-25).
    Intercambia dos posiciones aleatorias de la permutación si random() < tasa_mutacion.
    """
    hijo = cromosoma.copy()
    if random.random() < tasa_mutacion and len(hijo) >= 2:
        idx1, idx2 = random.sample(range(len(hijo)), 2)
        hijo[idx1], hijo[idx2] = hijo[idx2], hijo[idx1]
    return hijo


def seleccion_por_torneo(poblacion: List[Dict[str, Any]], k: int = 3) -> Dict[str, Any]:
    """
    Selección por Torneo determinista de tamaño k (RF-23).
    """
    candidatos = random.sample(poblacion, min(k, len(poblacion)))
    return max(candidatos, key=lambda ind: ind["fitness"])


def main():
    inicio_reloj = time.perf_counter()

    # 1. Leer payload completo desde stdin
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stderr.write("Error: stdin vacío recibido en solver_genetico.py\n")
            sys.exit(1)
        payload = json.loads(raw_input)
    except Exception as e:
        sys.stderr.write(f"Error parseando JSON de entrada: {e}\n")
        sys.exit(1)

    ejecucion_id = payload.get("ejecucion_id", "EJE-02")
    escenario = payload.get("escenario", {})
    config_ag = payload.get("config_ag") or {}
    escala_costo_ref = float(payload.get("escala_costo_referencia", 1_000_000.0))

    # Extraer parámetros de AG con valores por defecto normativos
    tamano_pob = int(config_ag.get("tamano_poblacion", 100))
    generaciones = int(config_ag.get("generaciones", 200))
    tasa_cruce = float(config_ag.get("tasa_cruce", 0.80))
    tasa_mutacion = float(config_ag.get("tasa_mutacion", 0.05))
    factor_penalizacion = float(config_ag.get("factor_penalizacion", 1000.0))
    semilla = config_ag.get("semilla")

    # Normalización de tasas si vienen en porcentaje [0, 100]
    if tasa_cruce > 1.0:
        tasa_cruce /= 100.0
    if tasa_mutacion > 1.0:
        tasa_mutacion /= 100.0

    if semilla is not None:
        random.seed(semilla)

    empresas = escenario.get("empresas", [])
    plantas = escenario.get("plantas", [])
    rutas = escenario.get("rutas", [])

    oferta_total = float(escenario.get("oferta_total_t", sum(e.get("oferta_t", 0.0) for e in empresas)))
    longitud_cromosoma = len(empresas) + len(plantas)

    # Matriz de costos unitarios
    matriz_costos = {}
    for r in rutas:
        matriz_costos[r["id"]] = r.get("costo_unitario_t")

    # -------------------------------------------------------------------------
    # GENERACIÓN 0: INICIALIZACIÓN DE POBLACIÓN (RF-26, RF-31)
    # -------------------------------------------------------------------------
    poblacion = []
    base_genes = list(range(longitud_cromosoma))

    for _ in range(tamano_pob):
        crom = base_genes.copy()
        random.shuffle(crom)
        asignaciones, costo_Z, pen_t = decodificar_cromosoma_greedy(crom, empresas, plantas, matriz_costos)
        fit, factible = evaluar_fitness_candidato(costo_Z, pen_t, oferta_total, escala_costo_ref, factor_penalizacion)
        poblacion.append({
            "cromosoma": crom,
            "asignaciones": asignaciones,
            "costo_Z": costo_Z,
            "penalizacion_t": pen_t,
            "fitness": fit,
            "factible": factible
        })

    mejor_costo_acumulado: Optional[float] = None
    mejor_asignacion_acumulada: Dict[str, float] = {}

    def evaluar_estadisticas_generacion(pob: List[Dict[str, Any]], num_gen: int):
        nonlocal mejor_costo_acumulado, mejor_asignacion_acumulada

        candidatos_factibles = [ind for ind in pob if ind["factible"]]
        num_factibles = len(candidatos_factibles)

        if num_factibles > 0:
            mejor_de_ronda = min(candidatos_factibles, key=lambda ind: ind["costo_Z"])
            costo_factible_ronda = float(mejor_de_ronda["costo_Z"])

            if mejor_costo_acumulado is None or costo_factible_ronda < mejor_costo_acumulado:
                mejor_costo_acumulado = costo_factible_ronda
                mejor_asignacion_acumulada = mejor_de_ronda["asignaciones"].copy()
        else:
            costo_factible_ronda = None

        mejor_aptitud_gen = float(max(ind["fitness"] for ind in pob))

        # Emisión JSONL de la generación en curso (RF-31, RF-32)
        emitir_generacion_ag(
            ejecucion_id=ejecucion_id,
            numero=num_gen,
            mejor_costo_factible=costo_factible_ronda,
            mejor_costo_acumulado=mejor_costo_acumulado,
            candidatos_factibles=num_factibles,
            mejor_aptitud=round(mejor_aptitud_gen, 6)
        )

    # Emisión obligatoria de la Generación 0
    evaluar_estadisticas_generacion(poblacion, 0)

    # -------------------------------------------------------------------------
    # CICLO EVOLUTIVO: GENERACIONES 1..N
    # -------------------------------------------------------------------------
    for g in range(1, generaciones + 1):
        # Elitismo: conservar el mejor individuo
        mejor_individuo = max(poblacion, key=lambda ind: ind["fitness"])
        nueva_poblacion = [mejor_individuo]

        while len(nueva_poblacion) < tamano_pob:
            padre1 = seleccion_por_torneo(poblacion, k=3)["cromosoma"]
            padre2 = seleccion_por_torneo(poblacion, k=3)["cromosoma"]

            if random.random() < tasa_cruce:
                hijo_crom = cruce_por_orden_ox(padre1, padre2)
            else:
                hijo_crom = padre1.copy()

            hijo_crom = mutacion_por_intercambio_swap(hijo_crom, tasa_mutacion)

            asignaciones, costo_Z, pen_t = decodificar_cromosoma_greedy(hijo_crom, empresas, plantas, matriz_costos)
            fit, factible = evaluar_fitness_candidato(costo_Z, pen_t, oferta_total, escala_costo_ref, factor_penalizacion)

            nueva_poblacion.append({
                "cromosoma": hijo_crom,
                "asignaciones": asignaciones,
                "costo_Z": costo_Z,
                "penalizacion_t": pen_t,
                "fitness": fit,
                "factible": factible
            })

        poblacion = nueva_poblacion
        evaluar_estadisticas_generacion(poblacion, g)

    tiempo_total_s = round(time.perf_counter() - inicio_reloj, 4)

    # -------------------------------------------------------------------------
    # CIERRE DEFINITIVO: RESULTADO_FINAL (RF-10, DD-27)
    # -------------------------------------------------------------------------
    if mejor_costo_acumulado is not None:
        emitir_resultado_final({
            "ejecucion_id": ejecucion_id,
            "metodo_usado": "AG",
            "estado": "FACTIBLE_SIN_CERTIFICAR",
            "causa_estado": "",
            "motivo_finalizacion": f"Máximo de {generaciones} generaciones alcanzado. Solución factible encontrada sin certificar optimalidad.",
            "costo_total_Z": round(mejor_costo_acumulado, 2),
            "tiempo_ejecucion_s": tiempo_total_s,
            "matriz_flujos_optimos": mejor_asignacion_acumulada,
            "sensibilidad_dual": []
        })
    else:
        emitir_resultado_final({
            "ejecucion_id": ejecucion_id,
            "metodo_usado": "AG",
            "estado": "SIN_CANDIDATO_FACTIBLE_AG",
            "causa_estado": "El AG terminó sin encontrar una asignación factible",
            "motivo_finalizacion": f"Máximo de {generaciones} generaciones alcanzado sin encontrar un candidato que cumpla todas las restricciones de oferta.",
            "costo_total_Z": None,
            "tiempo_ejecucion_s": tiempo_total_s,
            "matriz_flujos_optimos": {},
            "sensibilidad_dual": []
        })


if __name__ == "__main__":
    main()

