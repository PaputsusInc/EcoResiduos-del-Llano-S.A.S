"""Método de transporte: solución inicial de Vogel y mejora exacta MODI.

Las rutas prohibidas no son variables. Una fila auxiliar de costo cero absorbe
la capacidad no utilizada; así, MODI trabaja sobre un problema balanceado.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass
from typing import Callable


class RedInfactibleError(RuntimeError):
    """No hay flujo que cubra todas las ofertas por las rutas permitidas."""


@dataclass
class Problema:
    empresas: list[str]
    plantas: list[str]
    ofertas: list[float]
    capacidades: list[float]
    costos: list[list[float | None]]
    auxiliar: int | None
    epsilon: float

    @property
    def filas(self) -> int:
        return len(self.ofertas)

    @property
    def columnas(self) -> int:
        return len(self.capacidades)

    def nombre_fila(self, indice: int) -> str:
        return "Auxiliar" if indice == self.auxiliar else self.empresas[indice]


@dataclass
class Solucion:
    flujos: list[list[float]]
    costo: float
    precios_empresas: list[float]
    precios_plantas: list[float]
    pasos: list[tuple[str, str, dict]]
    problema: Problema
    base: set[tuple[int, int]]


def preparar(
    empresas: list[dict], plantas: list[dict],
    matriz_costos: dict[str, float | None], tolerancia: float,
) -> Problema:
    """Valida datos y agrega el origen auxiliar si sobra capacidad."""
    if not empresas or not plantas:
        raise ValueError("Se requiere al menos una empresa y una planta")
    if not math.isfinite(tolerancia) or tolerancia <= 0:
        raise ValueError("La tolerancia debe ser positiva y finita")
    ids_empresas = [e["id"] for e in empresas]
    ids_plantas = [p["id"] for p in plantas]
    if len(set(ids_empresas)) != len(ids_empresas) or len(set(ids_plantas)) != len(ids_plantas):
        raise ValueError("Hay identificadores de nodos duplicados")

    def numero(valor: object, rotulo: str) -> float:
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            raise ValueError(f"{rotulo} debe ser numérico")
        valor = float(valor)
        if not math.isfinite(valor) or valor < 0:
            raise ValueError(f"{rotulo} debe ser finito y no negativo")
        return valor

    ofertas = [numero(e["oferta_t"], f"Oferta de {e['id']}") for e in empresas]
    capacidades = [numero(p["capacidad_maxima_t"], f"Capacidad de {p['id']}") for p in plantas]
    total_oferta = math.fsum(ofertas)
    total_capacidad = math.fsum(capacidades)
    if not math.isfinite(total_oferta) or not math.isfinite(total_capacidad):
        raise ValueError("Los totales exceden el rango numérico")
    positivos = [v for v in ofertas + capacidades if v > 0]
    epsilon = min(tolerancia / 10, max(1e-15, total_capacidad * 1e-12))
    if positivos:
        epsilon = min(epsilon, min(positivos) / 1000)
    if total_oferta > total_capacidad + epsilon:
        raise RedInfactibleError("Capacidad superada por la oferta")

    costos = []
    for empresa_id in ids_empresas:
        fila = []
        for planta_id in ids_plantas:
            clave = f"{empresa_id}->{planta_id}"
            bruto = matriz_costos.get(clave)
            fila.append(None if bruto is None else numero(bruto, f"Costo de {clave}"))
        costos.append(fila)

    # La fila auxiliar, incluso con oferta cero, permite analizar cambios
    # independientes de oferta y capacidad sobre el mismo modelo balanceado.
    auxiliar = len(empresas)
    ofertas.append(max(0.0, total_capacidad - total_oferta))
    costos.append([0.0] * len(plantas))
    return Problema(ids_empresas, ids_plantas, ofertas, capacidades, costos, auxiliar, epsilon)


def _residuo_factible(
    problema: Problema, ofertas: list[float], capacidades: list[float],
) -> bool:
    """Comprueba si un paso de Vogel deja una red con flujo completo.

    Es una prueba de factibilidad, no un optimizador de costo. Evita que la
    decisión local de Vogel consuma una planta indispensable para otra fila.
    """
    objetivo = math.fsum(ofertas)
    eps = problema.epsilon
    if objetivo <= eps:
        return True
    if objetivo > math.fsum(capacidades) + eps:
        return False

    m, n = problema.filas, problema.columnas
    fuente, sumidero = m + n, m + n + 1
    red = [[0.0] * (m + n + 2) for _ in range(m + n + 2)]
    vecinos = [set() for _ in red]

    def arista(a: int, b: int, cantidad: float) -> None:
        red[a][b] += cantidad
        vecinos[a].add(b)
        vecinos[b].add(a)

    for i, oferta in enumerate(ofertas):
        if oferta > eps:
            arista(fuente, i, oferta)
            for j, capacidad in enumerate(capacidades):
                if capacidad > eps and problema.costos[i][j] is not None:
                    arista(i, m + j, min(oferta, capacidad))
    for j, capacidad in enumerate(capacidades):
        if capacidad > eps:
            arista(m + j, sumidero, capacidad)

    total = 0.0
    while objetivo - total > eps:
        padres = {fuente: -1}
        pendientes = deque([fuente])
        while pendientes and sumidero not in padres:
            actual = pendientes.popleft()
            for siguiente in sorted(vecinos[actual]):
                if siguiente not in padres and red[actual][siguiente] > eps:
                    padres[siguiente] = actual
                    pendientes.append(siguiente)
        if sumidero not in padres:
            return False
        cantidad = objetivo - total
        nodo = sumidero
        while nodo != fuente:
            anterior = padres[nodo]
            cantidad = min(cantidad, red[anterior][nodo])
            nodo = anterior
        nodo = sumidero
        while nodo != fuente:
            anterior = padres[nodo]
            red[anterior][nodo] -= cantidad
            red[nodo][anterior] += cantidad
            nodo = anterior
        total += cantidad
    return True


def vogel(problema: Problema) -> tuple[list[list[float]], list[tuple[str, str, dict]]]:
    """Construye una solución básica factible usando penalizaciones de Vogel."""
    m, n = problema.filas, problema.columnas
    eps = problema.epsilon
    pendiente = problema.ofertas.copy()
    libre = problema.capacidades.copy()
    flujos = [[0.0] * n for _ in range(m)]
    pasos = []
    if not _residuo_factible(problema, pendiente, libre):
        raise RedInfactibleError("Las rutas disponibles no permiten cubrir toda la oferta")

    while math.fsum(pendiente) > eps:
        candidatos = []
        for i in range(m):
            if pendiente[i] <= eps:
                continue
            opciones = sorted(
                (problema.costos[i][j], j) for j in range(n)
                if libre[j] > eps and problema.costos[i][j] is not None
            )
            if not opciones:
                raise RedInfactibleError("Una empresa no tiene destino disponible")
            penalizacion = math.inf if len(opciones) == 1 else opciones[1][0] - opciones[0][0]
            for costo, j in opciones:
                candidatos.append((-penalizacion, costo, 0, i, j, f"Fila {problema.nombre_fila(i)}"))
        for j in range(n):
            if libre[j] <= eps:
                continue
            opciones = sorted(
                (problema.costos[i][j], i) for i in range(m)
                if pendiente[i] > eps and problema.costos[i][j] is not None
            )
            if not opciones:
                raise RedInfactibleError("Una planta no puede recibir su demanda balanceada")
            penalizacion = math.inf if len(opciones) == 1 else opciones[1][0] - opciones[0][0]
            for costo, i in opciones:
                candidatos.append((-penalizacion, costo, 1, i, j, f"Columna {problema.plantas[j]}"))

        elegido = None
        for penalizacion_negativa, costo, _, i, j, rotulo in sorted(candidatos):
            cantidad = min(pendiente[i], libre[j])
            nuevas_ofertas = pendiente.copy()
            nuevas_capacidades = libre.copy()
            nuevas_ofertas[i] = max(0.0, nuevas_ofertas[i] - cantidad)
            nuevas_capacidades[j] = max(0.0, nuevas_capacidades[j] - cantidad)
            if _residuo_factible(problema, nuevas_ofertas, nuevas_capacidades):
                elegido = (i, j, cantidad, -penalizacion_negativa, costo, rotulo)
                pendiente, libre = nuevas_ofertas, nuevas_capacidades
                break
        if elegido is None:
            raise RedInfactibleError("No existe asignación factible para las rutas disponibles")
        i, j, cantidad, penalizacion, costo, rotulo = elegido
        flujos[i][j] += cantidad
        paso = len(pasos) + 1
        conexion = f"{problema.nombre_fila(i)}->{problema.plantas[j]}"
        pasos.append((
            "RESOLUCION",
            f"Vogel paso {paso}: {rotulo}, asignar {cantidad:g} t a {conexion}",
            {"submetodo": "VOGEL", "paso_vogel": paso, "fila_columna": rotulo,
             "penalizacion_cop_t": None if math.isinf(penalizacion) else penalizacion,
             "conexion": conexion,
             "toneladas_t": cantidad, "costo_unitario_cop_t": costo,
             "es_intermedio": True},
        ))

    costo = math.fsum(
        flujos[i][j] * problema.costos[i][j]
        for i in range(m) for j in range(n)
        if flujos[i][j] > eps and i != problema.auxiliar
    )
    pasos.append((
        "RESOLUCION", f"Vogel completado: costo inicial {costo:,.2f} COP",
        {"submetodo": "VOGEL", "aplicado": True,
         "costo_intermedio_cop": costo, "es_intermedio": True},
    ))
    return flujos, pasos


class _Componentes:
    def __init__(self, cantidad: int):
        self.padre = list(range(cantidad))

    def raiz(self, nodo: int) -> int:
        while self.padre[nodo] != nodo:
            self.padre[nodo] = self.padre[self.padre[nodo]]
            nodo = self.padre[nodo]
        return nodo

    def unir(self, a: int, b: int) -> bool:
        a, b = self.raiz(a), self.raiz(b)
        if a == b:
            return False
        self.padre[b] = a
        return True


def _base_inicial(problema: Problema, flujos: list[list[float]]) -> set[tuple[int, int]]:
    """Completa con celdas básicas de valor cero sin crear ciclos."""
    m, n = problema.filas, problema.columnas
    componentes = _Componentes(m + n)
    base = set()
    for i in range(m):
        for j in range(n):
            if flujos[i][j] > problema.epsilon:
                if not componentes.unir(i, m + j):
                    raise ArithmeticError("La base inicial de Vogel contiene un ciclo")
                base.add((i, j))
    for i in range(m):
        for j in range(n):
            if problema.costos[i][j] is not None and componentes.unir(i, m + j):
                base.add((i, j))
    return base


def _potenciales(problema: Problema, base: set[tuple[int, int]]) -> tuple[list[float], list[float]]:
    """Obtiene u_i y v_j de las ecuaciones básicas u_i + v_j = c_ij."""
    m, n = problema.filas, problema.columnas
    adyacentes = [[] for _ in range(m + n)]
    for i, j in base:
        adyacentes[i].append((m + j, problema.costos[i][j]))
        adyacentes[m + j].append((i, problema.costos[i][j]))
    potenciales = [None] * (m + n)
    for raiz in range(m + n):
        if potenciales[raiz] is not None:
            continue
        potenciales[raiz] = 0.0
        pendientes = deque([raiz])
        while pendientes:
            nodo = pendientes.popleft()
            for vecino, costo in adyacentes[nodo]:
                if potenciales[vecino] is None:
                    potenciales[vecino] = costo - potenciales[nodo]
                    pendientes.append(vecino)
    return potenciales[:m], potenciales[m:]


def _camino_base(
    problema: Problema, base: set[tuple[int, int]], entrada: tuple[int, int],
) -> list[tuple[int, int]]:
    """Busca el camino único entre extremos de la celda entrante."""
    m, n = problema.filas, problema.columnas
    adyacentes = [[] for _ in range(m + n)]
    for i, j in base:
        adyacentes[i].append((m + j, (i, j)))
        adyacentes[m + j].append((i, (i, j)))
    origen, destino = entrada[0], m + entrada[1]
    padres = {origen: (-1, None)}
    pendientes = deque([origen])
    while pendientes and destino not in padres:
        nodo = pendientes.popleft()
        for vecino, arista in sorted(adyacentes[nodo]):
            if vecino not in padres:
                padres[vecino] = (nodo, arista)
                pendientes.append(vecino)
    if destino not in padres:
        raise ArithmeticError("La celda entrante no forma ciclo con la base")
    camino = []
    nodo = destino
    while nodo != origen:
        anterior, arista = padres[nodo]
        camino.append(arista)
        nodo = anterior
    return camino


def modi(
    problema: Problema, flujos: list[list[float]],
    registrar: Callable[[tuple[str, str, dict]], None],
) -> tuple[list[list[float]], list[float], list[float], set[tuple[int, int]]]:
    """Aplica pivotes MODI hasta que todos los costos reducidos sean no negativos."""
    m, n = problema.filas, problema.columnas
    base = _base_inicial(problema, flujos)
    iteracion = 0
    while True:
        u, v = _potenciales(problema, base)
        entrada = None
        reducido_entrada = 0.0
        for i in range(m):
            for j in range(n):
                costo = problema.costos[i][j]
                if costo is None or (i, j) in base:
                    continue
                reducido = costo - u[i] - v[j]
                # Orden fijo de entrada y salida: regla de Bland ante degeneración.
                if reducido < -1e-8:
                    entrada, reducido_entrada = (i, j), reducido
                    break
            if entrada is not None:
                break
        if entrada is None:
            registrar((
                "RESOLUCION",
                f"MODI: costos reducidos no negativos; óptimo certificado tras {iteracion} pivotes.",
                {"submetodo": "MODI", "iteracion": iteracion,
                 "costos_reducidos_no_negativos": True, "es_intermedio": True},
            ))
            return flujos, u, v, base
        camino = _camino_base(problema, base, entrada)
        negativas = camino[::2]
        theta = min(flujos[i][j] for i, j in negativas)
        salida = min((i, j) for i, j in negativas if flujos[i][j] <= theta + problema.epsilon)
        flujos[entrada[0]][entrada[1]] += theta
        for posicion, (i, j) in enumerate(camino):
            flujos[i][j] += -theta if posicion % 2 == 0 else theta
            if abs(flujos[i][j]) <= problema.epsilon:
                flujos[i][j] = 0.0
        base.add(entrada)
        base.remove(salida)
        iteracion += 1
        costo = math.fsum(
            flujos[i][j] * problema.costos[i][j]
            for i in range(m) for j in range(n)
            if flujos[i][j] > problema.epsilon and i != problema.auxiliar
        )
        registrar((
            "RESOLUCION",
            f"MODI iteración {iteracion}: entra {problema.nombre_fila(entrada[0])}->{problema.plantas[entrada[1]]}, sale {problema.nombre_fila(salida[0])}->{problema.plantas[salida[1]]}, θ={theta:g} t.",
            {"submetodo": "MODI", "iteracion": iteracion,
             "celda_entrante": f"{problema.nombre_fila(entrada[0])}->{problema.plantas[entrada[1]]}",
             "celda_saliente": f"{problema.nombre_fila(salida[0])}->{problema.plantas[salida[1]]}",
             "costo_reducido_cop_t": reducido_entrada, "ajuste_theta_t": theta,
             "costo_tras_ajuste_cop": costo, "es_intermedio": True},
        ))
        if iteracion > 20_000:
            raise ArithmeticError("MODI excedió el límite de pivotes sin certificar optimalidad")


def resolver(
    empresas: list[dict], plantas: list[dict],
    matriz_costos: dict[str, float | None], tolerancia: float,
) -> Solucion:
    """Ejecuta Vogel y MODI, y devuelve flujos, duales y traza verificables."""
    problema = preparar(empresas, plantas, matriz_costos, tolerancia)
    flujos, pasos = vogel(problema)
    flujos, u, v, base = modi(problema, flujos, pasos.append)
    costo = math.fsum(
        flujos[i][j] * problema.costos[i][j]
        for i in range(len(empresas)) for j in range(problema.columnas)
        if flujos[i][j] > problema.epsilon
    )

    ajuste = u[problema.auxiliar]
    precios_empresas = [u[i] - ajuste for i in range(len(empresas))]
    precios_plantas = [valor + ajuste for valor in v]
    return Solucion(flujos, costo, precios_empresas, precios_plantas, pasos, problema, base)
