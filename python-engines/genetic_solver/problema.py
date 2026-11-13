"""Datos y asignación de toneladas para el AG lineal de EcoResiduos."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass
from typing import Any
from common.costos_modelo import costos_objetivo


def _numero_no_negativo(valor: Any, nombre: str) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{nombre} debe ser un número no negativo")
    numero = float(valor)
    if not math.isfinite(numero) or numero < 0:
        raise ValueError(f"{nombre} debe ser un número finito no negativo")
    return numero


@dataclass(frozen=True)
class ProblemaTransporte:
    empresas: tuple[str, ...]
    plantas: tuple[str, ...]
    ofertas: tuple[float, ...]
    capacidades: tuple[float, ...]
    costos: tuple[tuple[float | None, ...], ...]
    tolerancia: float

    @property
    def oferta_total(self) -> float:
        return math.fsum(self.ofertas)

    @property
    def longitud_cromosoma(self) -> int:
        return len(self.empresas) + len(self.plantas)


@dataclass(frozen=True)
class PlanTransporte:
    flujos: dict[str, float]
    costo: float
    faltante: float


def preparar_problema(escenario: dict[str, Any], tolerancia: float) -> ProblemaTransporte:
    """Convierte el escenario oficial en una única matriz de rutas utilizables.

    El costo cero es una ruta gratuita. ``None`` significa que no existe una
    conexión activa y compatible; nunca se usa un costo artificial como marca.
    """
    if not isinstance(escenario, dict):
        raise ValueError("escenario debe ser un objeto JSON")
    tolerancia = _numero_no_negativo(tolerancia, "tolerancia_numerica")
    if tolerancia == 0:
        raise ValueError("tolerancia_numerica debe ser mayor que cero")

    empresas = escenario.get("empresas")
    plantas = escenario.get("plantas")
    rutas = escenario.get("rutas")
    if not isinstance(empresas, list) or not empresas:
        raise ValueError("El escenario necesita al menos una empresa")
    if not isinstance(plantas, list) or not plantas:
        raise ValueError("El escenario necesita al menos una planta")
    if not isinstance(rutas, list):
        raise ValueError("rutas debe ser una lista")

    def identificadores(nodos: list[dict], clase: str) -> tuple[str, ...]:
        if any(not isinstance(nodo, dict) for nodo in nodos):
            raise ValueError(f"Cada {clase} debe ser un objeto JSON")
        valores = tuple(nodo.get("id") for nodo in nodos)
        if any(not isinstance(valor, str) or not valor.strip() for valor in valores):
            raise ValueError(f"Cada {clase} necesita un id no vacío")
        if len(set(valores)) != len(valores):
            raise ValueError(f"Hay identificadores de {clase} repetidos")
        return valores

    ids_empresas = identificadores(empresas, "empresa")
    ids_plantas = identificadores(plantas, "planta")
    ofertas = tuple(
        _numero_no_negativo(e.get("oferta_t"), f"Oferta de {e['id']}")
        for e in empresas
    )
    capacidades = tuple(
        _numero_no_negativo(p.get("capacidad_maxima_t"), f"Capacidad de {p['id']}")
        for p in plantas
    )
    if not math.isfinite(math.fsum(ofertas)) or not math.isfinite(math.fsum(capacidades)):
        raise ValueError("Los totales de oferta y capacidad exceden el rango numérico")

    indices_empresas = {nombre: i for i, nombre in enumerate(ids_empresas)}
    indices_plantas = {nombre: j for j, nombre in enumerate(ids_plantas)}
    costos: list[list[float | None]] = [[None] * len(plantas) for _ in empresas]
    vistos: set[tuple[int, int]] = set()
    for ruta in rutas:
        if not isinstance(ruta, dict):
            raise ValueError("Cada ruta debe ser un objeto JSON")
        empresa_id = ruta.get("empresa_id")
        planta_id = ruta.get("planta_id")
        if empresa_id not in indices_empresas or planta_id not in indices_plantas:
            raise ValueError("Una ruta referencia una empresa o planta desconocida")
        par = (indices_empresas[empresa_id], indices_plantas[planta_id])
        if par in vistos:
            raise ValueError(f"Ruta duplicada: {empresa_id}->{planta_id}")
        vistos.add(par)
        if ruta.get("id") != f"{empresa_id}->{planta_id}":
            raise ValueError(f"Id de ruta incoherente: {empresa_id}->{planta_id}")
        if ruta.get("activa", True) is False or ruta.get("compatible", True) is False:
            continue
        costo = ruta.get("costo_unitario_t")
        if costo is not None:
            costos[par[0]][par[1]] = _numero_no_negativo(
                costo, f"Costo de {empresa_id}->{planta_id}"
            )

    transporte = {
        f"{empresa_id}->{planta_id}": costos[i][j]
        for i, empresa_id in enumerate(ids_empresas)
        for j, planta_id in enumerate(ids_plantas)
    }
    objetivo = costos_objetivo(empresas, plantas, transporte)
    return ProblemaTransporte(
        ids_empresas, ids_plantas, ofertas, capacidades,
        tuple(tuple(objetivo[f"{empresa_id}->{planta_id}"] for planta_id in ids_plantas)
              for empresa_id in ids_empresas), tolerancia,
    )


@dataclass
class _Arista:
    destino: int
    inversa: int
    restante: float
    inicial: float


class _RedFlujo:
    """Encuentra una distribución completa, incluso si faltan conexiones."""

    def __init__(self, cantidad_nodos: int, tolerancia: float):
        self.adyacentes: list[list[_Arista]] = [[] for _ in range(cantidad_nodos)]
        self.tolerancia = tolerancia

    def agregar(self, origen: int, destino: int, capacidad: float) -> _Arista:
        ida = _Arista(destino, len(self.adyacentes[destino]), capacidad, capacidad)
        vuelta = _Arista(origen, len(self.adyacentes[origen]), 0.0, 0.0)
        self.adyacentes[origen].append(ida)
        self.adyacentes[destino].append(vuelta)
        return ida

    def maximo(self, fuente: int, sumidero: int, objetivo: float) -> float:
        total = 0.0
        while objetivo - total > self.tolerancia:
            niveles = [-1] * len(self.adyacentes)
            niveles[fuente] = 0
            pendientes = deque([fuente])
            while pendientes:
                nodo = pendientes.popleft()
                for arista in self.adyacentes[nodo]:
                    if arista.restante > self.tolerancia and niveles[arista.destino] < 0:
                        niveles[arista.destino] = niveles[nodo] + 1
                        pendientes.append(arista.destino)
            if niveles[sumidero] < 0:
                break

            siguientes = [0] * len(self.adyacentes)

            def enviar(nodo: int, disponible: float) -> float:
                if nodo == sumidero:
                    return disponible
                aristas = self.adyacentes[nodo]
                while siguientes[nodo] < len(aristas):
                    arista = aristas[siguientes[nodo]]
                    if (arista.restante > self.tolerancia
                            and niveles[arista.destino] == niveles[nodo] + 1):
                        cantidad = enviar(arista.destino, min(disponible, arista.restante))
                        if cantidad > self.tolerancia:
                            arista.restante -= cantidad
                            self.adyacentes[arista.destino][arista.inversa].restante += cantidad
                            return cantidad
                    siguientes[nodo] += 1
                return 0.0

            while objetivo - total > self.tolerancia:
                cantidad = enviar(fuente, objetivo - total)
                if cantidad <= self.tolerancia:
                    break
                total += cantidad
        return total


def _distribuir_con_flujo(
    problema: ProblemaTransporte, orden: list[tuple[int, int]],
    orden_empresas: list[int] | None = None,
) -> list[list[float]] | None:
    """El orden de las aristas expresa preferencias; el flujo garantiza cobertura."""
    m, n = len(problema.empresas), len(problema.plantas)
    fuente, primera_empresa, primera_planta = 0, 1, 1 + m
    sumidero = primera_planta + n
    # La tolerancia de validación no debe convertir una oferta pequeña en cero.
    red = _RedFlujo(sumidero + 1, 0.0)
    if orden_empresas is None:
        orden_empresas = list(range(m))
    for i in orden_empresas:
        red.agregar(fuente, primera_empresa + i, problema.ofertas[i])
    aristas = {
        (i, j): red.agregar(primera_empresa + i, primera_planta + j, problema.ofertas[i])
        for i, j in orden
    }
    for j, capacidad in enumerate(problema.capacidades):
        red.agregar(primera_planta + j, sumidero, capacidad)
    flujo = red.maximo(fuente, sumidero, problema.oferta_total)
    if problema.oferta_total - flujo > max(1e-12, problema.oferta_total * 1e-12):
        return None
    matriz = [[0.0] * n for _ in range(m)]
    for (i, j), arista in aristas.items():
        matriz[i][j] = max(0.0, arista.inicial - arista.restante)
    return matriz


def comprobar_factibilidad(problema: ProblemaTransporte) -> str | None:
    """Devuelve la causa de inviabilidad o ``None`` si la red puede cubrirse."""
    if problema.oferta_total > math.fsum(problema.capacidades) + problema.tolerancia:
        return "La oferta total supera la capacidad total"
    conexiones = [
        (i, j) for i, fila in enumerate(problema.costos)
        for j, costo in enumerate(fila) if costo is not None
    ]
    if _distribuir_con_flujo(problema, conexiones) is None:
        return "Las rutas activas y compatibles no permiten cubrir toda la oferta"
    return None


def decodificar(problema: ProblemaTransporte, cromosoma: tuple[int, ...]) -> PlanTransporte:
    """Transforma prioridades en envíos sin resolver el mínimo global de costo."""
    m, n = len(problema.empresas), len(problema.plantas)
    if len(cromosoma) != m + n or set(cromosoma) != set(range(m + n)):
        raise ValueError("El cromosoma debe ser una permutación de M + N prioridades")

    if any(costo is None for fila in problema.costos for costo in fila):
        # En una red parcial, el greedy local podría quitarle a una empresa su
        # única planta. El flujo permite deshacer y reasignar esa elección.
        conexiones = sorted(
            ((i, j) for i, fila in enumerate(problema.costos)
             for j, costo in enumerate(fila) if costo is not None),
            key=lambda par: (
                -max(cromosoma[par[0]], cromosoma[m + par[1]]),
                problema.costos[par[0]][par[1]],
                -cromosoma[par[0]], -cromosoma[m + par[1]],
            ),
        )
        orden_empresas = sorted(range(m), key=lambda i: cromosoma[i], reverse=True)
        matriz = _distribuir_con_flujo(problema, conexiones, orden_empresas)
        if matriz is None:
            raise ArithmeticError("La red validada dejó de ser factible")
    else:
        matriz = [[0.0] * n for _ in range(m)]
        pendiente = list(problema.ofertas)
        libre = list(problema.capacidades)

        def asignar(i: int, j: int) -> None:
            cantidad = min(pendiente[i], libre[j])
            matriz[i][j] += cantidad
            pendiente[i] -= cantidad
            libre[j] -= cantidad

        for nodo in sorted(range(m + n), key=lambda indice: cromosoma[indice], reverse=True):
            if nodo < m:
                i = nodo
                plantas = sorted(
                    range(n), key=lambda j: (problema.costos[i][j], -cromosoma[m + j])
                )
                for j in plantas:
                    if pendiente[i] <= 0:
                        break
                    if libre[j] > 0:
                        asignar(i, j)
            else:
                j = nodo - m
                empresas = sorted(
                    range(m), key=lambda i: (problema.costos[i][j], -cromosoma[i])
                )
                for i in empresas:
                    if libre[j] <= 0:
                        break
                    if pendiente[i] > 0:
                        asignar(i, j)

    flujos = {
        f"{problema.empresas[i]}->{problema.plantas[j]}": cantidad
        for i, fila in enumerate(matriz) for j, cantidad in enumerate(fila)
        if cantidad > 0
    }
    faltante = math.fsum(
        max(0.0, oferta - math.fsum(matriz[i]))
        for i, oferta in enumerate(problema.ofertas)
    )
    costo = math.fsum(
        cantidad * problema.costos[i][j]
        for i, fila in enumerate(matriz) for j, cantidad in enumerate(fila)
        if cantidad > 0
    )
    if not math.isfinite(costo):
        raise ValueError("El costo total excede el rango numérico")
    return PlanTransporte(flujos, costo, faltante)
