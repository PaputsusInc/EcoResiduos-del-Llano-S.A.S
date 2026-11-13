"""Operadores y ciclo evolutivo del algoritmo genético por prioridades."""

from __future__ import annotations

import math
import random
import secrets
import time
from dataclasses import dataclass
from typing import Any, Callable

from genetic_solver.problema import PlanTransporte, ProblemaTransporte, decodificar


def _entero(valor: Any, nombre: str, minimo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int) or valor < minimo:
        raise ValueError(f"{nombre} debe ser un entero mayor o igual a {minimo}")
    return valor


def _decimal(valor: Any, nombre: str, minimo: float = 0.0) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{nombre} debe ser un número")
    numero = float(valor)
    if not math.isfinite(numero) or numero < minimo:
        raise ValueError(f"{nombre} debe ser finito y mayor o igual a {minimo}")
    return numero


def _tasa(valor: Any, nombre: str) -> float:
    numero = _decimal(valor, nombre)
    # El backend acepta porcentajes antiguos; internamente solo usamos 0..1.
    if numero > 1:
        numero /= 100
    if numero > 1:
        raise ValueError(f"{nombre} debe estar entre 0 y 1, o entre 0 y 100 %")
    return numero


@dataclass(frozen=True)
class Configuracion:
    tamano_poblacion: int
    generaciones: int
    tasa_cruce: float
    tasa_mutacion: float
    tamano_torneo: int
    tipo_cruce: str
    puntos_cruce: int
    elitismo: int
    reemplazos: int
    limite_sin_mejora: int | None
    umbral_mejora_cop: float
    factor_penalizacion: float
    escala_costo_referencia: float
    semilla: int | None

    @classmethod
    def desde_json(
        cls, datos: dict[str, Any], problema: ProblemaTransporte,
        escala_predeterminada: Any = 1_000_000.0,
    ) -> Configuracion:
        if not isinstance(datos, dict):
            raise ValueError("config_ag debe ser un objeto JSON")
        claves_validas = {
            "tamano_poblacion", "generaciones", "tasa_cruce", "tasa_mutacion",
            "metodo_seleccion", "factor_penalizacion", "semilla", "tamano_torneo",
            "tipo_cruce", "puntos_cruce", "elitismo", "reemplazos",
            "limite_sin_mejora", "umbral_mejora_cop", "escala_costo_referencia",
        }
        desconocidas = datos.keys() - claves_validas
        if desconocidas:
            raise ValueError(f"Parámetros AG desconocidos: {', '.join(sorted(desconocidas))}")
        poblacion = _entero(datos.get("tamano_poblacion", 100), "tamano_poblacion", 2)
        generaciones = _entero(datos.get("generaciones", 200), "generaciones", 1)
        torneo = _entero(datos.get("tamano_torneo", 3), "tamano_torneo", 1)
        if torneo > poblacion:
            raise ValueError("tamano_torneo no puede superar tamano_poblacion")

        if datos.get("metodo_seleccion", "TORNEO") != "TORNEO":
            raise ValueError("El único metodo_seleccion disponible es TORNEO")
        tipo = datos.get("tipo_cruce", "OX")
        if tipo not in ("OX", "BLOQUES_ORDEN"):
            raise ValueError("tipo_cruce debe ser OX o BLOQUES_ORDEN")
        puntos = _entero(datos.get("puntos_cruce", 2), "puntos_cruce", 1)
        if tipo == "OX" and puntos != 2:
            raise ValueError("El cruce OX utiliza exactamente 2 puntos de cruce")
        if tipo == "BLOQUES_ORDEN" and puntos >= problema.longitud_cromosoma:
            raise ValueError("puntos_cruce debe ser menor que la longitud del cromosoma")

        elitismo = _entero(datos.get("elitismo", 1), "elitismo", 0)
        if elitismo >= poblacion:
            raise ValueError("elitismo debe ser menor que tamano_poblacion")
        valor_reemplazos = datos.get("reemplazos")
        reemplazos = max(1, (poblacion - elitismo) // 2) if valor_reemplazos is None else _entero(
            valor_reemplazos, "reemplazos", 1
        )
        if reemplazos > poblacion - elitismo:
            raise ValueError("reemplazos supera los lugares que no protege el elitismo")

        limite = datos.get("limite_sin_mejora")
        if limite is not None:
            limite = _entero(limite, "limite_sin_mejora", 1)
        semilla = datos.get("semilla")
        if semilla is None:
            semilla = secrets.randbits(31)
        else:
            _entero(semilla, "semilla", 0)

        escala = datos.get("escala_costo_referencia", escala_predeterminada)
        if escala is None:
            costos = [c for fila in problema.costos for c in fila if c is not None]
            escala = max(1.0, max(costos, default=0.0) * problema.oferta_total)
        escala = _decimal(escala, "escala_costo_referencia", 1e-12)
        return cls(
            poblacion, generaciones,
            _tasa(datos.get("tasa_cruce", 0.80), "tasa_cruce"),
            _tasa(datos.get("tasa_mutacion", 0.05), "tasa_mutacion"),
            torneo, tipo, puntos, elitismo, reemplazos, limite,
            _decimal(datos.get("umbral_mejora_cop", 0), "umbral_mejora_cop"),
            _decimal(datos.get("factor_penalizacion", 1000), "factor_penalizacion"),
            escala, semilla,
        )


@dataclass(frozen=True)
class Individuo:
    cromosoma: tuple[int, ...]
    plan: PlanTransporte
    aptitud: float
    factible: bool


@dataclass(frozen=True)
class ResultadoAG:
    mejor: Individuo
    generaciones_ejecutadas: int
    evaluaciones: int
    motivo_finalizacion: str
    tiempo_ejecucion_s: float


def evaluar(
    problema: ProblemaTransporte, configuracion: Configuracion,
    cromosoma: tuple[int, ...],
) -> Individuo:
    plan = decodificar(problema, cromosoma)
    factible = plan.faltante <= problema.tolerancia
    penalizacion = 0.0 if factible else (
        configuracion.factor_penalizacion
        * plan.faltante / max(1.0, problema.oferta_total)
    )
    aptitud = 1.0 / (
        1.0 + plan.costo / configuracion.escala_costo_referencia + penalizacion
    )
    return Individuo(cromosoma, plan, aptitud, factible)


def _preferencia(individuo: Individuo) -> tuple[bool, float]:
    # Una asignación incompleta jamás desplaza a una que cubre toda la oferta.
    return individuo.factible, individuo.aptitud


def seleccionar_por_torneo(
    poblacion: list[Individuo], tamano: int, generador: random.Random,
) -> Individuo:
    participantes = generador.sample(poblacion, tamano)
    mejor_valor = max(_preferencia(ind) for ind in participantes)
    empatados = [ind for ind in participantes if _preferencia(ind) == mejor_valor]
    return generador.choice(empatados)


def _hijo_ox(
    base: tuple[int, ...], otro: tuple[int, ...], inicio: int, fin: int,
) -> tuple[int, ...]:
    """Conserva un segmento y completa los huecos en el orden circular del otro padre."""
    longitud = len(base)
    hijo: list[int | None] = [None] * longitud
    hijo[inicio:fin + 1] = base[inicio:fin + 1]
    usados = set(base[inicio:fin + 1])
    siguiente = (fin + 1) % longitud
    for desplazamiento in range(longitud):
        gen = otro[(fin + 1 + desplazamiento) % longitud]
        if gen not in usados:
            hijo[siguiente] = gen
            siguiente = (siguiente + 1) % longitud
    return tuple(hijo)


def _hijo_por_bloques(
    base: tuple[int, ...], otro: tuple[int, ...], cortes: list[int],
) -> tuple[int, ...]:
    """Preserva bloques alternos y llena el resto sin repetir prioridades."""
    limites = [0, *cortes, len(base)]
    hijo: list[int | None] = [None] * len(base)
    usados: set[int] = set()
    for bloque in range(0, len(limites) - 1, 2):
        for posicion in range(limites[bloque], limites[bloque + 1]):
            hijo[posicion] = base[posicion]
            usados.add(base[posicion])
    restantes = iter(gen for gen in otro if gen not in usados)
    for posicion, gen in enumerate(hijo):
        if gen is None:
            hijo[posicion] = next(restantes)
    return tuple(hijo)


def cruzar(
    primero: tuple[int, ...], segundo: tuple[int, ...],
    configuracion: Configuracion, generador: random.Random,
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    if configuracion.tipo_cruce == "OX":
        inicio, fin = sorted(generador.sample(range(len(primero)), 2))
        return (
            _hijo_ox(primero, segundo, inicio, fin),
            _hijo_ox(segundo, primero, inicio, fin),
        )
    cortes = sorted(generador.sample(
        range(1, len(primero)), configuracion.puntos_cruce
    ))
    return (
        _hijo_por_bloques(primero, segundo, cortes),
        _hijo_por_bloques(segundo, primero, cortes),
    )


def mutar_por_intercambio(
    cromosoma: tuple[int, ...], generador: random.Random,
) -> tuple[int, ...]:
    primera, segunda = generador.sample(range(len(cromosoma)), 2)
    genes = list(cromosoma)
    genes[primera], genes[segunda] = genes[segunda], genes[primera]
    return tuple(genes)


def ejecutar(
    problema: ProblemaTransporte, configuracion: Configuracion,
    informar_generacion: Callable[[dict[str, Any]], None],
    inicio: float,
) -> ResultadoAG:
    """Evoluciona planes y comunica cada población en cuanto se evalúa."""
    generador = random.Random(configuracion.semilla)
    genes = tuple(range(problema.longitud_cromosoma))
    poblacion = []
    for _ in range(configuracion.tamano_poblacion):
        cromosoma = list(genes)
        generador.shuffle(cromosoma)
        poblacion.append(evaluar(problema, configuracion, tuple(cromosoma)))

    mejor_acumulado = min(
        (ind for ind in poblacion if ind.factible),
        key=lambda ind: ind.plan.costo,
    )
    evaluaciones = len(poblacion)

    def registrar(numero: int) -> None:
        nonlocal mejor_acumulado
        factibles = [ind for ind in poblacion if ind.factible]
        mejor_generacion = min(factibles, key=lambda ind: ind.plan.costo)
        if mejor_generacion.plan.costo < mejor_acumulado.plan.costo:
            mejor_acumulado = mejor_generacion
        informar_generacion({
            "numero": numero,
            "mejor_costo_factible": mejor_generacion.plan.costo,
            "mejor_costo_acumulado": mejor_acumulado.plan.costo,
            "candidatos_factibles": len(factibles),
            "mejor_aptitud": round(max(ind.aptitud for ind in poblacion), 6),
            "evaluaciones_acumuladas": evaluaciones,
            "tiempo_transcurrido_s": round(time.perf_counter() - inicio, 4),
        })

    registrar(0)
    referencia_mejora = mejor_acumulado.plan.costo
    generaciones_sin_mejora = 0
    motivo = f"Máximo de {configuracion.generaciones} generaciones alcanzado"
    generacion_final = 0

    for numero in range(1, configuracion.generaciones + 1):
        mejores_indices = sorted(
            range(len(poblacion)),
            key=lambda indice: _preferencia(poblacion[indice]), reverse=True,
        )
        protegidos = set(mejores_indices[:configuracion.elitismo])
        posiciones_disponibles = [
            indice for indice in range(len(poblacion)) if indice not in protegidos
        ]
        # El reemplazo parcial conserva los individuos que no fueron elegidos.
        posiciones = generador.sample(posiciones_disponibles, configuracion.reemplazos)
        nueva_poblacion = poblacion.copy()
        hijos: list[Individuo] = []
        while len(hijos) < configuracion.reemplazos:
            padre_a = seleccionar_por_torneo(poblacion, configuracion.tamano_torneo, generador)
            padre_b = seleccionar_por_torneo(poblacion, configuracion.tamano_torneo, generador)
            cromosomas = (
                cruzar(padre_a.cromosoma, padre_b.cromosoma, configuracion, generador)
                if generador.random() < configuracion.tasa_cruce
                else (padre_a.cromosoma, padre_b.cromosoma)
            )
            if len(hijos) + 1 == configuracion.reemplazos:
                cromosomas = (generador.choice(cromosomas),)
            for cromosoma in cromosomas:
                if generador.random() < configuracion.tasa_mutacion:
                    cromosoma = mutar_por_intercambio(cromosoma, generador)
                hijos.append(evaluar(problema, configuracion, cromosoma))
        for posicion, hijo in zip(posiciones, hijos):
            nueva_poblacion[posicion] = hijo
        poblacion = nueva_poblacion
        evaluaciones += len(hijos)
        generacion_final = numero
        registrar(numero)

        mejora = referencia_mejora - mejor_acumulado.plan.costo
        if mejora > configuracion.umbral_mejora_cop:
            referencia_mejora = mejor_acumulado.plan.costo
            generaciones_sin_mejora = 0
        else:
            generaciones_sin_mejora += 1
        if (configuracion.limite_sin_mejora is not None
                and generaciones_sin_mejora >= configuracion.limite_sin_mejora):
            motivo = "Límite de generaciones sin mejora significativa alcanzado"
            break

    return ResultadoAG(
        mejor_acumulado, generacion_final, evaluaciones, motivo,
        time.perf_counter() - inicio,
    )
