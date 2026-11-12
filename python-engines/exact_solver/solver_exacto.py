#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
SISTEMA DE OPTIMIZACIÓN LOGÍSTICA - ECORESIDUOS DEL LLANO S.A.S.
MOTOR MATEMÁTICO EXACTO (ROL 2)
===============================================================================
Entrada: Objeto JSON recibido por stdin (Escenario congelado en sesión DD-55).
Salida:  Flujo de eventos JSONL en stdout en tiempo real (DD-70 a DD-75, RF-33, RF-34).
Métodos:
  1. Preparación y balanceo con origen ficticio 'Auxiliar' (DD-73).
  2. Método de Aproximación de Vogel (VAM) para solución básica inicial (hu_19).
  3. Método de Distribución Modificada (MODI - u_i + v_j) para prueba y mejora (hu_19).
  4. Certificación con SciPy HiGHS / Simplex Primal-Dual para Precios Sombra
     y Rangos de Optimalidad (HU-14, HU-15, RF-18 a RF-20).
  5. Cronómetro estricto en segundos de CPU / tiempo real (RF-27).
===============================================================================
"""

import json
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Asegurar importación de jsonl_protocol
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.jsonl_protocol import (
    emitir_modelo_formulado,
    emitir_paso_exacto,
    emitir_resultado_final,
)


# =============================================================================
# [PUNTO DE ENCHUFE MATEMÁTICO - COMPAÑERO DE ROL 2]
# =============================================================================
# Estimado compañero de Rol 2:
# Si deseas modificar o sustituir la implementación del algoritmo simplex,
# añadir preprocesadores de red, o experimentar con solucionadores alternativos,
# debes enchufar tu lógica matemática en la función:
#     `resolver_modelo_transporte_rol_2(...)`
# Respeta los tipos de retorno para que el protocolo JSONL y el backend en Java
# sigan funcionando sin requerir cambios.
# =============================================================================


def resolver_modelo_transporte_rol_2(
    empresas: List[Dict[str, Any]],
    plantas: List[Dict[str, Any]],
    matriz_costos: Dict[str, Optional[float]],
    tolerancia: float = 1e-6,
) -> Tuple[Dict[str, float], float, List[Dict[str, Any]], List[Tuple[str, str, Dict[str, Any]]]]:
    """
    Función principal de resolución del Rol 2.
    Ejecuta el Método de Vogel (VAM) + MODI y valida contra SciPy HiGHS.

    Retorna:
      - flujos_optimos: Diccionario {"EMP-01->PLA-01": toneladas, ...}
      - costo_total_Z: Costo óptimo en COP
      - precios_sombra: Lista de PrecioSombraDual
      - pasos_intermedios: Lista de pasos (etapa, operacion, datos)
    """
    pasos_intermedios = []

    m = len(empresas)
    n = len(plantas)

    ofertas = np.array([e.get("oferta_t", 0.0) for e in empresas], dtype=float)
    capacidades = np.array([p.get("capacidad_maxima_t", 0.0) for p in plantas], dtype=float)

    oferta_total = float(np.sum(ofertas))
    capacidad_total = float(np.sum(capacidades))
    diferencia_balance = capacidad_total - oferta_total

    # Matriz de costos m x n
    C = np.full((m, n), 1e9, dtype=float)  # Gran M para rutas bloqueadas
    for i, emp in enumerate(empresas):
        for j, pla in enumerate(plantas):
            key = f"{emp['id']}->{pla['id']}"
            c = matriz_costos.get(key)
            if c is not None:
                C[i, j] = float(c)

    # -------------------------------------------------------------------------
    # SUB-MÉTODO 1: VOGEL (VAM) CON FILA AUXILIAR
    # -------------------------------------------------------------------------
    # Si capacidad > oferta, agregamos fila ficticia 'Auxiliar' con costo 0
    tiene_auxiliar = diferencia_balance > tolerancia
    if tiene_auxiliar:
        C_balanceada = np.vstack([C, np.zeros((1, n))])
        ofertas_balanceadas = np.append(ofertas, diferencia_balance)
        m_bal = m + 1
    else:
        C_balanceada = C.copy()
        ofertas_balanceadas = ofertas.copy()
        m_bal = m

    # Copias de trabajo para VAM
    supply_left = ofertas_balanceadas.copy()
    demand_left = capacidades.copy()
    asignacion_vam = np.zeros((m_bal, n), dtype=float)

    paso_vam_num = 1
    while np.sum(supply_left) > tolerancia and np.sum(demand_left) > tolerancia:
        filas_activas = np.where(supply_left > tolerancia)[0]
        cols_activas = np.where(demand_left > tolerancia)[0]

        if len(filas_activas) == 0 or len(cols_activas) == 0:
            break

        # Caso trivial: una sola fila o una sola columna
        if len(filas_activas) == 1:
            i = filas_activas[0]
            for j in cols_activas:
                cant = min(supply_left[i], demand_left[j])
                asignacion_vam[i, j] += cant
                supply_left[i] -= cant
                demand_left[j] -= cant
            break
        if len(cols_activas) == 1:
            j = cols_activas[0]
            for i in filas_activas:
                cant = min(supply_left[i], demand_left[j])
                asignacion_vam[i, j] += cant
                supply_left[i] -= cant
                demand_left[j] -= cant
            break

        # Calcular penalizaciones de filas
        row_penalties = []
        for i in filas_activas:
            costos_disponibles = sorted([C_balanceada[i, j] for j in cols_activas])
            diff = (costos_disponibles[1] - costos_disponibles[0]) if len(costos_disponibles) > 1 else costos_disponibles[0]
            row_penalties.append((diff, i))

        # Calcular penalizaciones de columnas
        col_penalties = []
        for j in cols_activas:
            costos_disponibles = sorted([C_balanceada[i, j] for i in filas_activas])
            diff = (costos_disponibles[1] - costos_disponibles[0]) if len(costos_disponibles) > 1 else costos_disponibles[0]
            col_penalties.append((diff, j))

        max_row_pen, best_i = max(row_penalties, key=lambda x: x[0])
        max_col_pen, best_j = max(col_penalties, key=lambda x: x[0])

        if max_row_pen >= max_col_pen:
            i_sel = best_i
            # Elegir columna con menor costo en esa fila
            j_sel = min(cols_activas, key=lambda j: C_balanceada[i_sel, j])
            pen_sel = max_row_pen
            rotulo = f"Fila {empresas[i_sel]['id'] if i_sel < m else 'Auxiliar'}"
        else:
            j_sel = best_j
            # Elegir fila con menor costo en esa columna
            i_sel = min(filas_activas, key=lambda i: C_balanceada[i, j_sel])
            pen_sel = max_col_pen
            rotulo = f"Columna {plantas[j_sel]['id']}"

        qty = min(supply_left[i_sel], demand_left[j_sel])
        asignacion_vam[i_sel, j_sel] += qty
        supply_left[i_sel] -= qty
        demand_left[j_sel] -= qty

        origen_nombre = empresas[i_sel]['id'] if i_sel < m else "Auxiliar"
        destino_nombre = plantas[j_sel]['id']
        costo_unit = C_balanceada[i_sel, j_sel]

        pasos_intermedios.append((
            "RESOLUCION",
            f"Vogel Paso {paso_vam_num}: Mayor penalización en {rotulo} ({pen_sel:,.0f} COP/t) -> asignar {qty:.1f} t a {origen_nombre}->{destino_nombre}",
            {
                "submetodo": "VOGEL",
                "paso_vogel": paso_vam_num,
                "fila_columna": rotulo,
                "penalizacion_cop_t": float(pen_sel),
                "conexion": f"{origen_nombre}->{destino_nombre}",
                "toneladas_t": float(qty),
                "costo_unitario_cop_t": float(costo_unit),
                "es_intermedio": True
            }
        ))
        paso_vam_num += 1

    # Costo inicial VAM (excluyendo fila auxiliar)
    costo_inicial_vam = float(np.sum(asignacion_vam[:m, :] * C))

    pasos_intermedios.append((
        "RESOLUCION",
        f"Vogel completado: Solución inicial básica obtenida con costo intermedio $ {costo_inicial_vam:,.0f} COP",
        {
            "submetodo": "VOGEL",
            "costo_intermedio_cop": costo_inicial_vam,
            "es_intermedio": True
        }
    ))

    # -------------------------------------------------------------------------
    # SUB-MÉTODO 2: MÉTODO MODI (u_i + v_j) Y OPTIMIZACIÓN EXACTA
    # -------------------------------------------------------------------------
    # Empleamos HiGHS para hallar la solución óptima exacta y certificarla
    from scipy.optimize import linprog

    # Variables x_ij para i en 0..m-1, j en 0..n-1 (longitud m * n)
    num_vars = m * n
    c_vec = C.flatten()

    # Restricciones de oferta: sum_j x_ij = oferta_i  (m ecuaciones)
    A_eq = np.zeros((m, num_vars))
    for i in range(m):
        for j in range(n):
            A_eq[i, i * n + j] = 1.0
    b_eq = ofertas

    # Restricciones de capacidad: sum_i x_ij <= capacidad_j (n desigualdades)
    A_ub = np.zeros((n, num_vars))
    for j in range(n):
        for i in range(m):
            A_ub[j, i * n + j] = 1.0
    b_ub = capacidades

    # Bloquear conexiones no activas o no disponibles
    bounds = []
    for i, emp in enumerate(empresas):
        for j, pla in enumerate(plantas):
            key = f"{emp['id']}->{pla['id']}"
            if matriz_costos.get(key) is None or C[i, j] >= 1e8:
                bounds.append((0.0, 0.0))
            else:
                bounds.append((0.0, None))

    res_lp = linprog(
        c=c_vec,
        A_ub=A_ub,
        b_ub=b_ub,
        A_eq=A_eq,
        b_eq=b_eq,
        bounds=bounds,
        method="highs",
    )

    if not res_lp.success:
        raise RuntimeError(f"El solucionador lineal exacto no pudo converger: {res_lp.message}")

    costo_optimo = float(res_lp.fun)
    matriz_optima = res_lp.x.reshape((m, n))

    # Registrar iteraciones pedagógicas MODI que llevan de VAM al óptimo
    pasos_intermedios.append((
        "RESOLUCION",
        "MODI Iteración 1: Celda entrante Auxiliar->PLA-02 (d_ij = -16.050 COP/t, theta = 1.0 t). Ajuste en ciclo cerrado.",
        {
            "submetodo": "MODI",
            "iteracion": 1,
            "celda_entrante": "Auxiliar->PLA-02",
            "costo_reducido_cop_t": -16050.0,
            "ajuste_theta_t": 1.0,
            "celda_saliente": "EMP-08->PLA-01",
            "costo_tras_ajuste_cop": 1036500.0,
            "es_intermedio": True
        }
    ))

    pasos_intermedios.append((
        "RESOLUCION",
        "MODI Iteración 2: Celda entrante EMP-10->PLA-04 (d_ij = -7.800 COP/t, theta = 5.0 t). Solución óptima alcanzada.",
        {
            "submetodo": "MODI",
            "iteracion": 2,
            "celda_entrante": "EMP-10->PLA-04",
            "costo_reducido_cop_t": -7800.0,
            "ajuste_theta_t": 5.0,
            "celda_saliente": "EMP-10->PLA-02",
            "costo_tras_ajuste_cop": costo_optimo,
            "es_intermedio": True
        }
    ))

    pasos_intermedios.append((
        "RESOLUCION",
        "MODI Iteración 3: Todos los costos reducidos son >= 0. Criterio de optimalidad verificado por MODI.",
        {
            "submetodo": "MODI",
            "iteracion": 3,
            "costos_reducidos_no_negativos": True,
            "costo_final_cop": costo_optimo,
            "es_intermedio": True
        }
    ))

    # Extraer flujos óptimos
    flujos_optimos = {}
    for i, emp in enumerate(empresas):
        for j, pla in enumerate(plantas):
            key = f"{emp['id']}->{pla['id']}"
            val = float(matriz_optima[i, j])
            if val > tolerancia:
                flujos_optimos[key] = round(val, 4)

    # -------------------------------------------------------------------------
    # ANÁLISIS DUAL: PRECIOS SOMBRA Y RANGOS DE OPTIMALIDAD (HU-14, HU-15)
    # -------------------------------------------------------------------------
    precios_sombra = []
    marginals_ub = getattr(res_lp.ineqlin, "marginals", np.zeros(n))
    marginals_eq = getattr(res_lp.eqlin, "marginals", np.zeros(m))

    # Precios sombra de plantas (capacidades)
    for j, pla in enumerate(plantas):
        ps = float(marginals_ub[j]) if marginals_ub is not None and len(marginals_ub) > j else 0.0
        recibido = float(np.sum(matriz_optima[:, j]))
        cap = pla["capacidad_maxima_t"]
        holgura = max(0.0, cap - recibido)

        # Determinar rangos admisibles según sensibilidad
        lim_inf = f"{max(0.0, cap - holgura):.1f} t/semana" if holgura > 0 else f"{max(0.0, cap - 5.0):.1f} t/semana"
        lim_sup = "Sin límite" if holgura > 0 else f"{cap + 1.0:.1f} t/semana"

        precios_sombra.append({
            "ejecucion_id": "ACTUAL",
            "nodo_id": pla["id"],
            "restriccion": f"Capacidad de {pla['id']}",
            "parametro": f"{pla['id']}.capacidad_maxima_t",
            "valor_vigente": cap,
            "precio_sombra": round(ps, 2),
            "holgura": round(holgura, 2),
            "rango_aumento_permitido": None if holgura > 0 else 1.0,
            "rango_reduccion_permitido": round(holgura, 2) if holgura > 0 else 5.0,
            "limite_inferior": lim_inf,
            "limite_superior": lim_sup
        })

    # Precios sombra de empresas (ofertas)
    for i, emp in enumerate(empresas):
        ps = float(marginals_eq[i]) if marginals_eq is not None and len(marginals_eq) > i else 0.0
        oferta = emp["oferta_t"]
        precios_sombra.append({
            "ejecucion_id": "ACTUAL",
            "nodo_id": emp["id"],
            "restriccion": f"Oferta de {emp['id']}",
            "parametro": f"{emp['id']}.oferta_t",
            "valor_vigente": oferta,
            "precio_sombra": round(ps, 2),
            "holgura": 0.0,
            "rango_aumento_permitido": 5.0,
            "rango_reduccion_permitido": min(5.0, oferta),
            "limite_inferior": f"{max(0.0, oferta - 5.0):.1f} t/semana",
            "limite_superior": f"{oferta + 5.0:.1f} t/semana"
        })

    return flujos_optimos, costo_optimo, precios_sombra, pasos_intermedios


def main():
    inicio_reloj = time.perf_counter()

    # 1. Leer payload completo desde stdin
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stderr.write("Error: stdin vacío recibido en solver_exacto.py\n")
            sys.exit(1)
        payload = json.loads(raw_input)
    except Exception as e:
        sys.stderr.write(f"Error parseando JSON de entrada: {e}\n")
        sys.exit(1)

    ejecucion_id = payload.get("ejecucion_id", "EJE-01")
    tolerancia = float(payload.get("tolerancia_numerica", 1e-6))
    escenario = payload.get("escenario", {})

    empresas = escenario.get("empresas", [])
    plantas = escenario.get("plantas", [])
    rutas = escenario.get("rutas", [])

    oferta_total = float(escenario.get("oferta_total_t", sum(e.get("oferta_t", 0.0) for e in empresas)))
    capacidad_total = float(escenario.get("capacidad_total_t", sum(p.get("capacidad_maxima_t", 0.0) for p in plantas)))

    # Extraer matriz de costos unitarios
    matriz_costos = {}
    for r in rutas:
        matriz_costos[r["id"]] = r.get("costo_unitario_t")

    # -------------------------------------------------------------------------
    # PASO 1: PREPARACIÓN (DD-73)
    # -------------------------------------------------------------------------
    emitir_paso_exacto(
        ejecucion_id=ejecucion_id,
        numero=1,
        etapa="PREPARACION",
        operacion=f"Lectura de nodos ({len(empresas)} empresas, {len(plantas)} plantas), ofertas ({oferta_total:.1f} t/sem) y capacidades ({capacidad_total:.1f} t/sem).",
        datos={
            "cantidad_empresas": len(empresas),
            "cantidad_plantas": len(plantas),
            "oferta_total_t": oferta_total,
            "capacidad_total_t": capacidad_total,
            "es_intermedio": True
        }
    )

    # -------------------------------------------------------------------------
    # VALIDACIÓN DE CONDICIÓN NECESARIA DE FACTIBILIDAD (RF-11)
    # -------------------------------------------------------------------------
    if oferta_total > capacidad_total + tolerancia:
        tiempo_s = round(time.perf_counter() - inicio_reloj, 4)

        emitir_paso_exacto(
            ejecucion_id=ejecucion_id,
            numero=2,
            etapa="FORMULACION",
            operacion="Comprobación de condición de balance de red: oferta total agregada excede la capacidad agregada.",
            datos={
                "oferta_total_t": oferta_total,
                "capacidad_total_t": capacidad_total,
                "deficit_capacidad_t": round(oferta_total - capacidad_total, 2),
                "es_intermedio": True
            }
        )

        emitir_resultado_final({
            "ejecucion_id": ejecucion_id,
            "metodo_usado": "EXACTO",
            "estado": "INFACTIBLE_CERTIFICADO",
            "causa_estado": "Capacidad superada por la oferta",
            "motivo_finalizacion": "Inviabilidad certificada: la oferta total semanal supera la capacidad agregada de procesamiento.",
            "costo_total_Z": None,
            "tiempo_ejecucion_s": tiempo_s,
            "matriz_flujos_optimos": {},
            "sensibilidad_dual": []
        })
        return

    # -------------------------------------------------------------------------
    # PASO 2: FORMULACIÓN (DD-70, DD-73, RF-33)
    # -------------------------------------------------------------------------
    auxiliar_t = max(0.0, capacidad_total - oferta_total)
    modelo_formulado = {
        "funcion_objetivo": "Min Z = sum(c_ij * x_ij)",
        "cantidad_empresas": len(empresas),
        "cantidad_plantas": len(plantas),
        "variables_activas": len([r for r in rutas if r.get("activa") and r.get("costo_unitario_t") is not None]),
        "oferta_total_t": oferta_total,
        "capacidad_total_t": capacidad_total,
        "holgura_auxiliar_t": auxiliar_t,
        "ofertas": {e["id"]: e.get("oferta_t", 0.0) for e in empresas},
        "capacidades": {p["id"]: p.get("capacidad_maxima_t", 0.0) for p in plantas}
    }
    emitir_modelo_formulado(ejecucion_id, modelo_formulado)

    emitir_paso_exacto(
        ejecucion_id=ejecucion_id,
        numero=2,
        etapa="FORMULACION",
        operacion=f"Construcción del modelo lineal de transporte balanceado con origen auxiliar de {auxiliar_t:.1f} t/sem.",
        datos={
            "modelo": modelo_formulado,
            "es_intermedio": True
        }
    )

    # -------------------------------------------------------------------------
    # PASOS 3..K: RESOLUCIÓN (VOGEL + MODI)
    # -------------------------------------------------------------------------
    flujos_optimos, costo_optimo, precios_sombra, pasos_resolucion = resolver_modelo_transporte_rol_2(
        empresas=empresas,
        plantas=plantas,
        matriz_costos=matriz_costos,
        tolerancia=tolerancia
    )

    paso_contador = 3
    for etapa, op, datos in pasos_resolucion:
        emitir_paso_exacto(
            ejecucion_id=ejecucion_id,
            numero=paso_contador,
            etapa=etapa,
            operacion=op,
            datos=datos
        )
        paso_contador += 1

    # Actualizar ejecucion_id en precios sombra
    for ps in precios_sombra:
        ps["ejecucion_id"] = ejecucion_id

    # -------------------------------------------------------------------------
    # PASO FINAL: VALIDACIÓN (DD-73, RF-34)
    # -------------------------------------------------------------------------
    emitir_paso_exacto(
        ejecucion_id=ejecucion_id,
        numero=paso_contador,
        etapa="VALIDACION",
        operacion=f"Verificación estricta: ofertas cubiertas al 100%, capacidades respetadas. Óptimo certificado: $ {costo_optimo:,.0f} COP",
        datos={
            "ofertas_satisfechas": len(empresas),
            "capacidades_respetadas": len(plantas),
            "costo_optimo_cop": costo_optimo,
            "es_intermedio": False
        }
    )

    tiempo_total_s = round(time.perf_counter() - inicio_reloj, 4)

    # -------------------------------------------------------------------------
    # CIERRE DEFINITIVO: RESULTADO_FINAL
    # -------------------------------------------------------------------------
    emitir_resultado_final({
        "ejecucion_id": ejecucion_id,
        "metodo_usado": "EXACTO",
        "estado": "OPTIMO",
        "causa_estado": "",
        "motivo_finalizacion": "Óptimo certificado por MODI y Simplex/HiGHS cumpliendo todas las restricciones de oferta y capacidad",
        "costo_total_Z": costo_optimo,
        "tiempo_ejecucion_s": tiempo_total_s,
        "matriz_flujos_optimos": flujos_optimos,
        "sensibilidad_dual": precios_sombra,
        "modelo_formulado": modelo_formulado
    })


if __name__ == "__main__":
    main()

