# Algoritmo genético de transporte lineal

## Descripción

Este motor distribuye la oferta semanal de las empresas entre plantas, respetando
la capacidad y las rutas activas y compatibles. Cada solución candidata es una
**permutación de prioridades de M empresas y N plantas**. Las toneladas no son
genes: el decodificador construye los envíos a partir de esas prioridades.

El resultado es una solución **factible sin certificación de óptimo**. El método
exacto del software sigue siendo el responsable de certificar el costo mínimo.
No se modelan viajes, vehículos ni cargas por trayecto.

## Archivos

- `problema.py`: lee el escenario, comprueba la factibilidad de la red y
  convierte un cromosoma en asignaciones de toneladas.
- `algoritmo.py`: valida la configuración, evalúa individuos y aplica torneo,
  cruce, mutación, elitismo y reemplazo.
- `solver_genetico.py`: recibe JSON por entrada estándar y emite eventos JSONL
  para el backend Java.
- `ajustar_hiperparametros.py`: compara configuraciones con Optuna únicamente
  cuando se pulsa «Ajustar parámetros» en el software.

## Preparación y ejecución

Se necesita Python 3.10 o superior. El AG usa solo la biblioteca estándar; el
ajuste bajo demanda necesita Optuna (`pip install -r python-engines/requirements.txt`).
Desde la raíz del repositorio:

```bash
python3 python-engines/genetic_solver/solver_genetico.py < entrada.json
```

En el software oficial, el backend inicia ese proceso por sí mismo. La API
`POST /api/escenarios/{id}/optimizar` recibe `metodo: "AG"`,
`asincrono: true` y `config_ag`. La vista «Ajuste de parámetros AG» permite
guardar una configuración por escenario; «Evolución del Algoritmo Genético»
inicia la corrida y muestra cada generación recibida.

La acción «Ajustar parámetros» llama a
`POST /api/escenarios/{id}/ag/ajustar`. Optuna TPE prueba 12 configuraciones
con dos semillas comunes y un presupuesto de 300 a 1200 evaluaciones por
semilla. Ajusta población, generaciones derivadas del presupuesto, tasas de
cruce y mutación, torneo, elitismo y reemplazos. Mantiene el operador OX
y la escala elegida. La puntuación es el costo medio factible
de las dos corridas; la recomendación puede aplicarse y después ejecutarse
como corrida normal. Es una búsqueda limitada, no una certificación de
optimalidad. No se crea historial ni se modifica el escenario durante el
ajuste.

## Cómo funciona

1. **Escenario y factibilidad.** Se forma la matriz de costos. Un costo cero
   es válido; un costo nulo o una ruta inactiva o incompatible no se puede usar.
   Un flujo máximo comprueba si la red completa puede cubrir la oferta.
2. **Población inicial.** Se crean permutaciones aleatorias de las prioridades.
   La semilla permite repetir la misma secuencia de decisiones.
3. **Decodificación.** En redes completas se asigna capacidad según las
   prioridades y el menor costo disponible. En redes parciales, un flujo
   respetuoso de las prioridades puede reasignar toneladas para no bloquear
   a una empresa con una única planta posible.
4. **Aptitud.** Se calcula como
   `1 / (1 + costo / escala_costo_referencia)`. La factibilidad se garantiza
   al validar la red y al decodificar las prioridades. Si el decodificador
   produjera un plan incompleto, la corrida falla con un error explícito.
5. **Evolución.** Un torneo escoge padres. La interfaz utiliza cruce OX de dos
   puntos; la API admite también cruce por bloques. Ambos producen
   permutaciones válidas; la mutación intercambia dos genes.
   El elitismo protege a los mejores y `reemplazos` controla cuántos miembros
   cambian por generación.
6. **Seguimiento.** Se emite la generación 0 y cada generación ejecutada con
   costo, aptitud, número de candidatos factibles, evaluaciones y tiempo
   transcurrido. La corrida termina en `generaciones` o tras
   `limite_sin_mejora` generaciones sin una mejora superior a
   `umbral_mejora_cop`.

## Ejemplo de configuración

```json
{
  "metodo": "AG",
  "asincrono": true,
  "config_ag": {
    "tamano_poblacion": 100,
    "generaciones": 200,
    "tasa_cruce": 0.8,
    "tasa_mutacion": 0.05,
    "metodo_seleccion": "TORNEO",
    "tamano_torneo": 3,
    "tipo_cruce": "OX",
    "puntos_cruce": 2,
    "elitismo": 1,
    "reemplazos": null,
    "limite_sin_mejora": null,
    "umbral_mejora_cop": 0,
    "escala_costo_referencia": 1000000,
    "semilla": 42
  }
}
```

`reemplazos: null` reemplaza por defecto la mitad de las posiciones no
protegidas (al menos una).
`escala_costo_referencia: null` calcula una escala desde el escenario.
`semilla: null` genera una semilla nueva. Las tasas también aceptan
porcentajes de 0 a 100. Para `tipo_cruce: "BLOQUES_ORDEN"`,
`puntos_cruce` puede ser de 1 hasta un valor menor que M + N.

## Salida

Cada línea de stdout es JSON. Los eventos `GENERACION_AG` aparecen de 0 a N
o hasta la parada temprana; el último evento `RESULTADO_FINAL` contiene
estado, costo, tiempo y matriz de flujos. Si la red no permite cubrir la
oferta, se emite `SIN_CANDIDATO_FACTIBLE_AG` con la causa y sin generaciones
ficticias.
