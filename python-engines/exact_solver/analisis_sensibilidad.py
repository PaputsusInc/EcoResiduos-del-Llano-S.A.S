"""Sensibilidad del problema de transporte resuelto por Vogel y MODI.

Los rangos óptimos conservan la base final de MODI. Los rangos factibles
permiten cambiar la base, pero conservan la posibilidad de cubrir la oferta.
Ningún rango se obtiene de porcentajes o rutas supuestas por la interfaz.
"""

from __future__ import annotations

import math
from collections import deque

from exact_solver.transporte_vogel_modi import (
    Solucion, _potenciales, _residuo_factible, resolver,
)


class AnalisisSensibilidad:
    """Calcula intervalos de base, factibilidad y variaciones de tarifa."""

    def __init__(self, solucion: Solucion):
        self.solucion = solucion
        self.problema = solucion.problema
        self.base = solucion.base
        self.u, self.v = _potenciales(self.problema, self.base)

    @staticmethod
    def _limite(valor: float) -> float | None:
        return None if math.isinf(valor) else max(0.0, valor)

    def _derivada_base(
        self, oferta: dict[int, float], capacidad: dict[int, float],
    ) -> dict[tuple[int, int], float]:
        """Resuelve el árbol básico al perturbar un término independiente."""
        p = self.problema
        rhs = [oferta.get(i, 0.0) for i in range(p.filas)] + [
            capacidad.get(j, 0.0) for j in range(p.columnas)
        ]
        adyacentes = [set() for _ in rhs]
        for i, j in self.base:
            adyacentes[i].add(p.filas + j)
            adyacentes[p.filas + j].add(i)
        pendientes = deque(i for i, vecinos in enumerate(adyacentes) if len(vecinos) == 1)
        derivadas = {}
        while pendientes:
            nodo = pendientes.popleft()
            if len(adyacentes[nodo]) != 1:
                continue
            vecino = next(iter(adyacentes[nodo]))
            arista = (nodo, vecino - p.filas) if nodo < p.filas else (vecino, nodo - p.filas)
            derivadas[arista] = rhs[nodo]
            rhs[vecino] -= rhs[nodo]
            rhs[nodo] = 0.0
            adyacentes[nodo].remove(vecino)
            adyacentes[vecino].remove(nodo)
            if len(adyacentes[vecino]) == 1:
                pendientes.append(vecino)
        if any(abs(valor) > 1e-7 for valor in rhs):
            raise ArithmeticError("La perturbación no conserva el balance de la base")
        return derivadas

    def _rango_base(
        self, oferta: dict[int, float], capacidad: dict[int, float],
        vigente: float, auxiliar_delta: float,
    ) -> tuple[float, float]:
        p = self.problema
        try:
            derivadas = self._derivada_base(oferta, capacidad)
        except ArithmeticError:
            # Una fila aislada de oferta cero no puede cambiar sin abrir rutas.
            return vigente, vigente
        inferior, superior = -vigente, math.inf
        if auxiliar_delta > 0:
            inferior = max(inferior, -p.ofertas[p.auxiliar] / auxiliar_delta)
        elif auxiliar_delta < 0:
            superior = min(superior, p.ofertas[p.auxiliar] / -auxiliar_delta)
        for (i, j), cambio in derivadas.items():
            flujo = self.solucion.flujos[i][j]
            if cambio > 1e-12:
                inferior = max(inferior, -flujo / cambio)
            elif cambio < -1e-12:
                superior = min(superior, flujo / -cambio)
        return max(0.0, vigente + inferior), vigente + superior

    def _factible_con(self, tipo: str, indice: int, valor: float) -> bool:
        p = self.problema
        ofertas = p.ofertas.copy()
        capacidades = p.capacidades.copy()
        if tipo == "OFERTA":
            cambio = valor - ofertas[indice]
            ofertas[indice] = valor
            ofertas[p.auxiliar] -= cambio
        else:
            cambio = valor - capacidades[indice]
            capacidades[indice] = valor
            ofertas[p.auxiliar] += cambio
        if ofertas[p.auxiliar] < -p.epsilon:
            return False
        ofertas[p.auxiliar] = max(0.0, ofertas[p.auxiliar])
        return _residuo_factible(p, ofertas, capacidades)

    def _frontera_factible(
        self, tipo: str, indice: int, vigente: float, inferior: bool,
    ) -> float:
        p = self.problema
        if tipo == "OFERTA" and inferior:
            return 0.0
        if tipo == "CAPACIDAD" and not inferior:
            return math.inf
        if inferior:
            extremo, factible = 0.0, vigente
            if self._factible_con(tipo, indice, extremo):
                return extremo
            for _ in range(35):
                medio = (extremo + factible) / 2
                if self._factible_con(tipo, indice, medio):
                    factible = medio
                else:
                    extremo = medio
            return factible
        extremo = math.fsum(p.capacidades) - math.fsum(
            p.ofertas[i] for i in range(p.auxiliar) if i != indice
        )
        factible = vigente
        if self._factible_con(tipo, indice, extremo):
            return extremo
        for _ in range(35):
            medio = (factible + extremo) / 2
            if self._factible_con(tipo, indice, medio):
                factible = medio
            else:
                extremo = medio
        return factible

    def rango_factible(self) -> list[dict]:
        """Aproxima la frontera factible por flujo máximo y bisección."""
        p = self.problema
        datos = []
        for i, nombre in enumerate(p.empresas):
            vigente = p.ofertas[i]
            datos.append({
                "tipo": "OFERTA", "nodo_id": nombre, "valor_vigente": vigente,
                "inferior": 0.0,
                "superior": self._frontera_factible("OFERTA", i, vigente, False),
            })
        for j, nombre in enumerate(p.plantas):
            vigente = p.capacidades[j]
            datos.append({
                "tipo": "CAPACIDAD", "nodo_id": nombre, "valor_vigente": vigente,
                "inferior": self._frontera_factible("CAPACIDAD", j, vigente, True),
                "superior": None,
            })
        return datos

    def rango_optimo(self) -> dict[str, list[dict]]:
        """Rangos que conservan la base final óptima de MODI."""
        p = self.problema
        rhs = []
        for i, nombre in enumerate(p.empresas):
            vigente = p.ofertas[i]
            inferior, superior = self._rango_base(
                {i: 1.0, p.auxiliar: -1.0}, {}, vigente, -1.0,
            )
            rhs.append({"tipo": "OFERTA", "nodo_id": nombre,
                        "valor_vigente": vigente, "inferior": inferior,
                        "superior": self._limite(superior),
                        "precio_sombra": self.solucion.precios_empresas[i]})
        for j, nombre in enumerate(p.plantas):
            vigente = p.capacidades[j]
            inferior, superior = self._rango_base(
                {p.auxiliar: 1.0}, {j: 1.0}, vigente, 1.0,
            )
            rhs.append({"tipo": "CAPACIDAD", "nodo_id": nombre,
                        "valor_vigente": vigente, "inferior": inferior,
                        "superior": self._limite(superior),
                        "precio_sombra": self.solucion.precios_plantas[j]})
        return {"terminos_independientes": rhs, "costos": self._rangos_costos()}

    def _derivada_potenciales(self, arista: tuple[int, int]) -> tuple[list[float], list[float]]:
        p = self.problema
        adyacentes = [[] for _ in range(p.filas + p.columnas)]
        for i, j in self.base:
            incremento = 1.0 if (i, j) == arista else 0.0
            adyacentes[i].append((p.filas + j, incremento))
            adyacentes[p.filas + j].append((i, incremento))
        derivada = [None] * len(adyacentes)
        for raiz in range(len(adyacentes)):
            if derivada[raiz] is not None:
                continue
            derivada[raiz] = 0.0
            pendientes = deque([raiz])
            while pendientes:
                nodo = pendientes.popleft()
                for vecino, incremento in adyacentes[nodo]:
                    if derivada[vecino] is None:
                        derivada[vecino] = incremento - derivada[nodo]
                        pendientes.append(vecino)
        return derivada[:p.filas], derivada[p.filas:]

    def _rangos_costos(self) -> list[dict]:
        p = self.problema
        rangos = []
        for i, empresa in enumerate(p.empresas):
            for j, planta in enumerate(p.plantas):
                costo = p.costos[i][j]
                if costo is None:
                    continue
                basica = (i, j) in self.base
                inferior, superior = -costo, math.inf
                if basica:
                    du, dv = self._derivada_potenciales((i, j))
                    for a in range(p.filas):
                        for b in range(p.columnas):
                            if p.costos[a][b] is None or (a, b) in self.base:
                                continue
                            reducido = p.costos[a][b] - self.u[a] - self.v[b]
                            pendiente = -du[a] - dv[b]
                            if pendiente > 1e-12:
                                inferior = max(inferior, -reducido / pendiente)
                            elif pendiente < -1e-12:
                                superior = min(superior, reducido / -pendiente)
                else:
                    inferior = max(inferior, self.u[i] + self.v[j] - costo)
                rangos.append({
                    "ruta": f"{empresa}->{planta}", "costo_vigente": costo,
                    "inferior": max(0.0, costo + inferior),
                    "superior": self._limite(costo + superior),
                    "basica": basica, "flujo_t": self.solucion.flujos[i][j],
                })
        return rangos

    def variar_precios(
        self, empresas: list[dict], plantas: list[dict],
        matriz_costos: dict[str, float | None], cambios: dict[str, float],
        tolerancia: float = 1e-6,
    ) -> Solucion:
        """Reoptimiza tarifas nuevas con Vogel y MODI, sin fijar flujos."""
        nuevos = matriz_costos.copy()
        for ruta, valor in cambios.items():
            if ruta not in nuevos or nuevos[ruta] is None:
                raise ValueError(f"La ruta {ruta} no está disponible")
            if not isinstance(valor, (int, float)) or not math.isfinite(valor) or valor < 0:
                raise ValueError(f"Tarifa inválida para {ruta}")
            nuevos[ruta] = float(valor)
        return resolver(empresas, plantas, nuevos, tolerancia)

    @staticmethod
    def aplicar_variacion(
        empresas: list[dict], plantas: list[dict],
        matriz_costos: dict[str, float | None], variacion: dict,
    ) -> tuple[list[dict], list[dict], dict[str, float | None]]:
        """Construye datos de un escenario hipotético sin tocar el original."""
        if not isinstance(variacion, dict):
            raise ValueError("La variación debe ser un objeto")
        tipo = variacion.get("tipo")
        porcentaje = variacion.get("porcentaje")
        nodo_id = variacion.get("nodo_id")
        if tipo not in {"COSTOS", "OFERTA", "CAPACIDAD"}:
            raise ValueError("Tipo de variación desconocido")
        if isinstance(porcentaje, bool) or not isinstance(porcentaje, (int, float)):
            raise ValueError("El porcentaje debe ser numérico")
        porcentaje = float(porcentaje)
        if not math.isfinite(porcentaje) or porcentaje < -100:
            raise ValueError("El porcentaje debe ser finito y no menor de -100")
        factor = 1 + porcentaje / 100
        nuevas_empresas = [empresa.copy() for empresa in empresas]
        nuevas_plantas = [planta.copy() for planta in plantas]
        nuevos_costos = matriz_costos.copy()
        if tipo == "COSTOS":
            if nodo_id and nodo_id not in {p["id"] for p in plantas}:
                raise ValueError("Planta desconocida")
            for ruta, costo in nuevos_costos.items():
                if costo is not None and (not nodo_id or ruta.endswith(f"->{nodo_id}")):
                    nuevos_costos[ruta] = costo * factor
        elif tipo == "OFERTA":
            if nodo_id and nodo_id not in {e["id"] for e in empresas}:
                raise ValueError("Empresa desconocida")
            for empresa in nuevas_empresas:
                if not nodo_id or empresa["id"] == nodo_id:
                    empresa["oferta_t"] = float(empresa["oferta_t"]) * factor
        else:
            if nodo_id not in {p["id"] for p in plantas}:
                raise ValueError("Planta desconocida")
            for planta in nuevas_plantas:
                if planta["id"] == nodo_id:
                    planta["capacidad_maxima_t"] = float(planta["capacidad_maxima_t"]) * factor
        return nuevas_empresas, nuevas_plantas, nuevos_costos

    @classmethod
    def aplicar_variaciones(
        cls, empresas: list[dict], plantas: list[dict],
        matriz_costos: dict[str, float | None], variaciones: list[dict],
    ) -> tuple[list[dict], list[dict], dict[str, float | None]]:
        """Aplica una secuencia declarativa sobre copias; nunca altera la red base."""
        if not isinstance(variaciones, list) or not variaciones:
            raise ValueError("Debe indicar al menos una variación")
        if len(variaciones) > 30:
            raise ValueError("Se admiten como máximo 30 variaciones")
        datos = (empresas, plantas, matriz_costos)
        for variacion in variaciones:
            datos = cls.aplicar_variacion(*datos, variacion)
        return datos

    def variar(
        self, empresas: list[dict], plantas: list[dict],
        matriz_costos: dict[str, float | None], variacion: dict,
        tolerancia: float = 1e-6,
    ) -> Solucion:
        """Reoptimiza una perturbación completa mediante Vogel y MODI."""
        empresas, plantas, costos = self.aplicar_variacion(
            empresas, plantas, matriz_costos, variacion,
        )
        return resolver(empresas, plantas, costos, tolerancia)
