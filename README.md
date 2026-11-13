# EcoResiduos del Llano S.A.S. - Sistema de Optimización Logística

Plataforma web para la planeación y optimización del transporte semanal de residuos de biomasa desde empresas generadoras hacia plantas procesadoras en el departamento del Meta (Colombia). El sistema modela el problema como un problema de transporte capacitado y lo resuelve mediante un método exacto de programación lineal y una metaheurística (algoritmo genético), permitiendo además realizar análisis de dualidad y de sensibilidad.

Proyecto final de la asignatura Optimización, Semestre VI.

## Contenido

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura del repositorio](#estructura-del-repositorio)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación y ejecución](#instalación-y-ejecución)
6. [Escenarios incluidos](#escenarios-incluidos)
7. [Métodos matemáticos](#métodos-matemáticos)
   - [Modelo de transporte compartido](#modelo-de-transporte-compartido)
   - [Método exacto: Vogel y MODI](#método-exacto-vogel-y-modi)
   - [Algoritmo genético: prioridades y flujos](#algoritmo-genético-prioridades-y-flujos)
     - [1. Validación y codificación](#1-validación-y-codificación-del-cromosoma)
     - [2. Decodificación](#2-decodificación-de-prioridades-a-flujos)
     - [3. Costo y aptitud](#3-costo-y-aptitud)
     - [4. Selección](#4-selección-por-torneo)
     - [5. Cruce](#5-cruce-ox-de-dos-puntos)
     - [6. Mutación](#6-mutación-por-intercambio)
     - [7. Elitismo y reemplazo](#7-elitismo-y-reemplazo-parcial)
     - [8. Registro y detención](#8-registro-y-detención)
   - [Ajuste de parámetros y comparación](#ajuste-de-parámetros-y-comparación)
8. [Módulos funcionales](#módulos-funcionales)
9. [Interfaz de programación (API REST)](#interfaz-de-programación-api-rest)
10. [Motores de optimización en Python](#motores-de-optimización-en-python)
11. [Pruebas](#pruebas)
12. [Documentación](#documentación)
13. [Estado actual y trabajo pendiente](#estado-actual-y-trabajo-pendiente)
14. [Licencia](#licencia)

## Descripción general

El Coordinador Logístico de la empresa debe asignar la oferta semanal de biomasa de cada empresa generadora (toneladas por semana) a un conjunto de plantas procesadoras con capacidad máxima limitada, minimizando el costo total de transporte, adquisición y procesamiento. El modelo considera:

- Oferta obligatoria por empresa: toda la biomasa generada debe ser evacuada.
- Capacidad máxima por planta: ninguna planta puede recibir más de su capacidad semanal.
- Costo unitario de transporte por ruta, derivado de la distancia vial y de la tarifa por kilómetro.
- Precio de adquisición por empresa y costo de procesamiento por planta, ambos en COP/t y con valor inicial cero.
- Verificación de factibilidad: cuando la oferta total supera la capacidad total, el escenario se declara infactible con el mensaje «Capacidad superada por la oferta».

Las magnitudes decimales (ofertas, capacidades, distancias, coordenadas, costos, precios sombra, rangos y tiempos) se manejan con precisión de doble precisión (`Double`) en el backend.

La formulación exacta, incluida la interpretación de la capacidad como límite de recepción, está en [docs/MODELO_MATEMATICO.md](docs/MODELO_MATEMATICO.md).

## Arquitectura

El backend sigue una arquitectura hexagonal organizada en cinco capas:

| Capa | Responsabilidad |
|------|-----------------|
| Dominio (`domain`) | Entidades del modelo (`Empresa`, `Planta`, `Ruta`, `Escenario`, `ResultadoOptimizacion`, `PrecioSombraDual`, entre otras) y puertos (`IPuertoOptimizador`, `IPuertoRepositorioEscenarios`). |
| Aplicación (`application`) | Casos de uso: `OrquestadorOptimizacion`, `MotorAnalisisSensibilidad`, `MotorComparacionRendimiento`. |
| Infraestructura (`infrastructure`) | Adaptadores de persistencia, adaptadores hacia los motores Python (`AdaptadorSolucionadorExacto`, `AdaptadorGenetico`) y ejecutor de procesos (`PythonProcessRunner`). |
| Exposición (`exposition`) | Controlador REST, validación de contratos de entrada y manejo global de excepciones. |
| Presentación (frontend) | Aplicación React con vistas por módulo funcional, contexto de sesión y mapa interactivo. |

La integración entre Java y Python se realiza mediante `ProcessBuilder`, intercambiando mensajes JSON y JSONL por la entrada y salida estándar. Mientras un proceso está en ejecución, cada línea JSONL emitida (registro de generación del algoritmo genético o paso del método exacto) actualiza el resultado almacenado, de modo que el frontend consulta el avance mediante sondeo HTTP periódico (polling).
La asignación de flujos, el costo, la aptitud y los operadores del AG se calculan en el motor Python; la comparación de resultados se consolida en la capa de aplicación Java. React valida los campos editables, adapta porcentajes al contrato HTTP y representa los datos recibidos.

## Estructura del repositorio

```
.
├── backend/            Servicio Java 21 / Spring Boot 3.3.4 (Maven)
├── frontend/           Aplicación React 18 + Vite + Tailwind CSS + Leaflet
├── python-engines/     Motores de optimización
│   ├── common/         Protocolo JSONL compartido
│   ├── exact_solver/   Solucionador exacto (solver_exacto.py)
│   └── genetic_solver/ Algoritmo genético (solver_genetico.py)
├── docs/               Plan de implementación, historias de usuario y diagramas
├── mockups/            Maquetas HTML de referencia de la interfaz
├── LICENSE
└── README.md
```

## Requisitos previos

- Java Development Kit 21
- Node.js 18 o superior y npm
- Python 3.10 o superior con el lanzador `py` (Windows). El ajuste de hiperparámetros requiere Optuna, incluido en `python-engines/requirements.txt`.
- Maven (se incluye el wrapper `mvnw` en el directorio `backend`)

## Instalación y ejecución

### 1. Motores Python

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r python-engines/requirements.txt
```

En Windows, usa `py -3 -m venv .venv` y
`.venv\Scripts\python -m pip install -r python-engines/requirements.txt`.
El backend detecta el intérprete de `.venv` en la raíz del proyecto.

### 2. Backend

```bash
cd backend
bash mvnw spring-boot:run     # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

El servicio queda disponible en `http://localhost:8080`. Usa JDK 21; si Maven no encuentra Java, configura `JAVA_HOME` hacia esa instalación.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. El servidor de desarrollo redirige las peticiones `/api` hacia `http://localhost:8080`.

Para generar la versión de producción:

```bash
npm run build
```

> En Windows con PowerShell, si la política de ejecución impide correr `npm`, puede utilizarse `npm.cmd` o ejecutar los comandos desde `cmd`.

## Escenarios incluidos

| Escenario | Descripción | Oferta total (t/semana) | Capacidad total (t/semana) |
|-----------|-------------|-------------------------|-----------------------------|
| ESC-01 | Caso de referencia nominal (10 empresas, 4 plantas) | 115,0 | 135,0 |
| ESC-02 | Expansión de oferta (+10 %) | 126,5 | 135,0 |
| ESC-03 | Incremento de tarifas de combustible (+15 %) | 115,0 | 135,0 |
| ESC-04 | Sobrecarga de oferta (infactible) | 120,0 | 100,0 |
| ESC-AMP-20x6 | Red ampliada (20 empresas, 6 plantas) | 260,0 | 340,0 |
| ESC-AMP-30x8 | Red regional (30 empresas, 8 plantas) | 401,0 | 430,0 |

El escenario activo se selecciona desde el encabezado de la aplicación y todas las vistas se recalculan a partir de él.

## Métodos matemáticos

### Modelo de transporte compartido

El método exacto y el AG resuelven **el mismo problema semanal**. Sean $I$ las empresas, $J$ las plantas y $E \subseteq I \times J$ las rutas activas, compatibles y con costo definido. Cada flujo $x_{ij}$ se mide en toneladas por semana. La oferta $s_i$ de cada empresa debe enviarse por completo; la capacidad $u_j$ de cada planta es un máximo, no una demanda mínima. El costo unitario de una ruta suma transporte $c^T_{ij}$, adquisición $p_i$ y procesamiento $o_j$, en COP/t:

$$
\begin{aligned}
\min\quad Z &= \sum_{(i,j)\in E}(c^T_{ij}+p_i+o_j)x_{ij},\\
\sum_{j:(i,j)\in E}x_{ij} &= s_i && \forall i\in I,\\
\sum_{i:(i,j)\in E}x_{ij} &\le u_j && \forall j\in J,\\
x_{ij} &\ge 0 && \forall(i,j)\in E.
\end{aligned}
$$

Los dos motores usan [`costos_objetivo`](python-engines/common/costos_modelo.py), que conserva como no disponibles las rutas prohibidas:

```python
salida[clave] = unitario + precios[empresa["id"]] + operaciones[planta["id"]]
```

Un ejemplo pequeño permite seguir ambos métodos. Los coeficientes de adquisición y operación valen cero en este ejemplo; por tanto, la tabla muestra el costo total por tonelada de cada ruta.

| Empresa | Oferta (t) | Planta P1: 3 t de capacidad | Planta P2: 2 t de capacidad |
| --- | ---: | ---: | ---: |
| A | 3 | 1.000 COP/t | 2.000 COP/t |
| B | 2 | 1.000 COP/t | 10.000 COP/t |

Un plan de 3 t de A a P1 y 2 t de B a P2 cuesta **23.000 COP**. En cambio, enviar 2 t de B a P1, 1 t de A a P1 y 2 t de A a P2 cuesta **7.000 COP**. Ambos cumplen oferta y capacidad; la elección de rutas determina la diferencia. La [formulación completa](docs/MODELO_MATEMATICO.md) incluye el tratamiento de rutas y coeficientes opcionales.

### Método exacto: Vogel y MODI

El motor [`transporte_vogel_modi.py`](python-engines/exact_solver/transporte_vogel_modi.py) prepara el problema y aplica Vogel y MODI sobre los costos anteriores:

1. **Preparación y factibilidad.** Excluye rutas sin conexión válida. Agrega internamente una fila auxiliar de costo cero para balancear el problema de transporte; su oferta es la capacidad sobrante, que puede ser cero. Esa fila representa capacidad sin usar, no residuos creados. Antes de aceptar una asignación local, verifica que la red residual todavía pueda cubrir toda la oferta mediante flujo máximo. Si no existe distribución completa, declara el escenario infactible.

   ```python
   ofertas.append(max(0.0, total_capacidad - total_oferta))
   ```

   En el ejemplo, oferta y capacidad suman 5 t: la fila auxiliar tiene 0 t.

2. **Solución inicial de Vogel.** Para cada fila o columna disponible calcula la diferencia entre sus dos costos más bajos; si solo hay una opción, la prioriza. Examina las mayores diferencias y asigna tanto como permitan la oferta y la capacidad, siempre que el remanente siga siendo factible.

   ```python
   penalizacion = math.inf if len(opciones) == 1 else opciones[1][0] - opciones[0][0]
   cantidad = min(pendiente[i], libre[j])
   ```

   Para B, la diferencia es $10.000-1.000=9.000$ COP/t; para A es $2.000-1.000=1.000$ COP/t. Vogel envía primero las 2 t de B a P1. Después asigna 1 t de A a P1 y 2 t de A a P2: costo inicial **7.000 COP**. La diferencia de Vogel sirve para elegir la siguiente asignación; **no** es una penalización de la aptitud del AG.

3. **Mejora y certificado MODI.** En las celdas básicas obtiene potenciales $u_i$ y $v_j$ que satisfacen $u_i+v_j=c_{ij}$. Para una ruta permitida no básica calcula el costo reducido $\bar c_{ij}=c_{ij}-u_i-v_j$. Si encuentra uno negativo, incorpora esa ruta, ajusta el ciclo de flujos y repite. Cuando todos son no negativos, certifica el mínimo de este modelo lineal.

   ```python
   reducido = costo - u[i] - v[j]
   if reducido < -1e-8:
       entrada, reducido_entrada = (i, j), reducido
   ```

   En la solución del ejemplo, los potenciales normalizados que devuelve el motor son $u_A=u_B=2.000$, $v_{P1}=-1.000$ y $v_{P2}=0$. La única ruta no básica, B→P2, tiene costo reducido $10.000-2.000-0=8.000$ COP/t. El costo óptimo certificado queda en **7.000 COP**. MODI también entrega los potenciales utilizados por el análisis de sensibilidad; un pivote de flujo cero puede cambiar la base sin cambiar el costo.

### Algoritmo genético: prioridades y flujos

El AG de [`problema.py`](python-engines/genetic_solver/problema.py) y [`algoritmo.py`](python-engines/genetic_solver/algoritmo.py) busca planes factibles sin afirmar que conoce el óptimo. Cada evaluación transforma una permutación de prioridades en toneladas efectivamente asignadas. Los valores de este ejemplo son pequeños para que se vea cada operación:

| Parámetro de ejemplo | Valor | Efecto |
| --- | ---: | --- |
| Población inicial | 4 | Cuatro cromosomas evaluados en la generación 0 |
| Generaciones máximas | 2 | Dos ciclos de reemplazo como máximo |
| Cruce / mutación | 80 % / 5 % | Probabilidad por pareja / por hijo |
| Torneo / elitismo / reemplazos | 2 / 1 / 2 | Dos participantes por selección; se protege uno y se reemplazan dos |
| Límite sin mejora / semilla | 2 / 42 | Detención anticipada reproducible |
| Escala de aptitud $C_{\mathrm{ref}}$ | 1.000.000 COP | Valor predeterminado del motor |

#### 1. Validación y codificación del cromosoma

Antes de crear la población, [`comprobar_factibilidad`](python-engines/genetic_solver/problema.py) comprueba que la oferta pueda pasar por las rutas utilizables hasta las plantas. Con $m$ empresas y $n$ plantas, cada cromosoma tiene $m+n$ posiciones: primero las empresas y luego las plantas. **El valor de cada posición es una prioridad**, no una cantidad de toneladas. Los valores forman una permutación de $0,\ldots,m+n-1$; el valor mayor se atiende primero.

```python
genes = tuple(range(problema.longitud_cromosoma))
generador.shuffle(cromosoma)
```

Para `[A,B,P1,P2]`, el cromosoma `(2,1,3,0)` da prioridad 3 a P1, 2 a A, 1 a B y 0 a P2. Con semilla 42, la inicialización del ejemplo produce:

| Individuo | Prioridades `(A,B,P1,P2)` | Costo decodificado | Aptitud |
| --- | --- | ---: | ---: |
| 1 | `(2,1,3,0)` | 23.000 COP | 0,977517 |
| 2 | `(3,2,0,1)` | 23.000 COP | 0,977517 |
| 3 | `(1,3,2,0)` | 7.000 COP | 0,993049 |
| 4 | `(1,2,0,3)` | 7.000 COP | 0,993049 |

#### 2. Decodificación: de prioridades a flujos

En una red **completa**, el decodificador visita los nodos de mayor a menor prioridad. Si visita una empresa, busca sus plantas por menor costo; si visita una planta, busca las empresas por menor costo. Los empates se resuelven por prioridad del otro nodo. En cada paso asigna el mínimo entre oferta pendiente y capacidad libre:

```python
cantidad = min(pendiente[i], libre[j])
matriz[i][j] += cantidad
```

El individuo 1 comienza por P1. Allí A y B cuestan lo mismo, pero A tiene mayor prioridad: A ocupa las 3 t de P1 y B termina en P2; costo **23.000 COP**. El individuo 3 comienza por B: sus 2 t van a P1; A usa la tonelada restante de P1 y las 2 t de P2; costo **7.000 COP**.

En una red **parcial**, una asignación codiciosa podría bloquear la única ruta de una empresa. El motor ordena las rutas por prioridades y costo, y usa un algoritmo de flujo para permitir reasignaciones y cubrir toda la oferta. Ese flujo garantiza factibilidad de la red validada, pero no minimiza por sí mismo el costo:

```python
matriz = _distribuir_con_flujo(problema, conexiones, orden_empresas)
```

#### 3. Costo y aptitud

El costo $Z$ suma $x_{ij}(c^T_{ij}+p_i+o_j)$ sobre las rutas usadas. Si el decodificador devolviera un faltante superior a la tolerancia, la evaluación falla: no asigna una aptitud artificial ni aplica un factor de penalización. Para un plan completo, la aptitud es:

$$
f=\frac{1}{1+Z/C_{\mathrm{ref}}}, \qquad C_{\mathrm{ref}}>0.
$$

```python
if not factible:
    raise ArithmeticError("El decodificador produjo un plan incompleto en una red factible")
aptitud = 1.0 / (1.0 + plan.costo / configuracion.escala_costo_referencia)
```

Con $C_{\mathrm{ref}}=1.000.000$ COP, el plan de 23.000 COP obtiene $f=0,977517$ y el de 7.000 COP $f=0,993049$. Por eso el torneo prefiere el segundo. La escala cambia el valor numérico de la aptitud, pero mantiene el orden de los costos factibles.

#### 4. Selección por torneo

Para cada padre se toma una muestra aleatoria **sin reemplazo** de $k$ individuos y gana la mayor aptitud; un empate se resuelve aleatoriamente. Los dos padres se seleccionan por separado.

```python
participantes = generador.sample(poblacion, tamano)
mejor_valor = max(_preferencia(ind) for ind in participantes)
```

Con $k=2$, si la muestra contiene a los individuos 1 y 3 de la tabla, gana el 3 ($0,993049>0,977517$). La selección es probabilística: esa pareja de participantes es solo un caso posible.

#### 5. Cruce OX de dos puntos

Con la probabilidad de cruce configurada, se aplica **OX**: cada hijo conserva un segmento inclusivo de un padre y completa los huecos con los genes del otro en orden circular, sin duplicados. Si no se activa el cruce, se copian los cromosomas de los padres. La interfaz utiliza OX; el contrato del motor también admite cruce por bloques, pero no lo presenta como opción del formulario.

```python
hijo[inicio:fin + 1] = base[inicio:fin + 1]
usados = set(base[inicio:fin + 1])
```

Por ejemplo, al conservar las posiciones 0 y 1 del individuo 1, $(2,1\mid3,0)$, y completar con el individuo 2, `(3,2,0,1)`, el hijo es `(2,1,0,3)`. Su decodificación cuesta **7.000 COP**. Es una aplicación posible del operador, no un resultado garantizado de cada generación.

#### 6. Mutación por intercambio

Cada hijo tiene una probabilidad independiente de mutar. La mutación intercambia **dos posiciones distintas**; conserva la permutación y puede mejorar o empeorar el plan.

```python
primera, segunda = generador.sample(range(len(cromosoma)), 2)
genes[primera], genes[segunda] = genes[segunda], genes[primera]
```

Si el individuo 1, `(2,1,3,0)`, intercambia las posiciones de B y P1, queda `(2,3,1,0)`: B se atiende primero y el costo baja de **23.000** a **7.000 COP**. El 5 % es la probabilidad de efectuar el intercambio, no la probabilidad de mejorar.

#### 7. Elitismo y reemplazo parcial

En cada generación se protegen los mejores $e$ individuos y se eligen $r$ posiciones entre las restantes. Los hijos evaluados ocupan esas posiciones; los demás individuos permanecen. No se reemplaza obligatoriamente toda la población.

```python
protegidos = set(mejores_indices[:configuracion.elitismo])
posiciones = generador.sample(posiciones_disponibles, configuracion.reemplazos)
nueva_poblacion = poblacion.copy()
```

Con población 4, elitismo 1 y reemplazos 2, se conserva al menos uno de los planes de 7.000 COP y se evalúan **dos hijos** por generación. Las evaluaciones acumuladas son $4+2g$ después de $g$ generaciones completas.

#### 8. Registro y detención

La generación 0 registra la población inicial; cada generación posterior informa mejor costo de esa población, mejor costo acumulado, candidatos factibles, evaluaciones y tiempo transcurrido. La evolución termina al llegar al máximo de generaciones o cuando se alcanza el límite de generaciones sin una mejora **superior** al umbral $\Delta_{\min}$:

```python
if mejora > configuracion.umbral_mejora_cop:
    referencia_mejora = mejor_acumulado.plan.costo
    generaciones_sin_mejora = 0
else:
    generaciones_sin_mejora += 1
```

La función [`ejecutar`](python-engines/genetic_solver/algoritmo.py) comprueba el límite tras cada generación. Con semilla 42 y los parámetros de la tabla, el mejor costo ya es 7.000 COP en la generación 0; no mejora en las generaciones 1 y 2, así que termina por el límite de dos generaciones sin mejora:

| Generación | Mejor costo acumulado | Evaluaciones acumuladas | Candidatos factibles |
| ---: | ---: | ---: | ---: |
| 0 | 7.000 COP | 4 | 4 |
| 1 | 7.000 COP | 6 | 4 |
| 2 | 7.000 COP | 8 | 4 |

### Ajuste de parámetros y comparación

La sección «Ajuste de parámetros AG» llama bajo demanda a [`ajustar_hiperparametros.py`](python-engines/genetic_solver/ajustar_hiperparametros.py). Optuna TPE realiza 12 ensayos de configuraciones candidatas, cada uno con las mismas dos semillas. El presupuesto común se acota entre 300 y 1.200 evaluaciones; las generaciones se derivan de ese presupuesto, el tamaño de la población y los reemplazos. Busca el **menor costo promedio** de las dos ejecuciones. Ajusta población, tasa de cruce, tasa de mutación, tamaño del torneo, elitismo y reemplazos. El operador de cruce y la escala de aptitud se heredan sin cambios de la configuración de entrada; el formulario utiliza OX y la escala predeterminada. La recomendación se guarda en el navegador, asociada al escenario, cuando se pulsa «Usar esta configuración».

```python
generaciones = max(1, (presupuesto - poblacion) // reemplazos)
```

Por ejemplo, con presupuesto 300, población 40 y 20 reemplazos, el límite derivado es $\lfloor(300-40)/20\rfloor=13$ generaciones: hasta $40+13(20)=300$ evaluaciones por semilla. El ajuste busca una buena configuración dentro de ese espacio y presupuesto; no certifica que sea la mejor posible.

Al comparar ambos métodos sobre **el mismo escenario**, la capa de aplicación calcula el **GAP** solo si el exacto certificó un óptimo positivo y el AG obtuvo un plan factible:

$$
\operatorname{GAP}(\%)=100\,\frac{Z_{\mathrm{AG}}-Z^*}{Z^*}.
$$

```java
return 100.0 * (costo_ag - costo_exacto) / costo_exacto;
```

En el ejemplo, $Z^*=7.000$ COP y un AG que entregue el plan de 23.000 COP tendría $\operatorname{GAP}=228,57\%$. Si entrega el plan de 7.000 COP, el GAP es $0\%$. Cuando no hay óptimo certificado, $Z^*=0$ o el AG no produjo un plan factible, el porcentaje queda «No disponible». El cálculo está en [`MotorComparacionRendimiento`](backend/src/main/java/com/ecoresiduos/llano/application/MotorComparacionRendimiento.java), no en React.

## Módulos funcionales

Las rutas del frontend utilizan nombres de negocio:

| Ruta | Módulo |
|------|--------|
| `/panel` | Panel de Control |
| `/empresas` | Empresas Generadoras |
| `/plantas` | Plantas Procesadoras |
| `/oferta-semanal` | Oferta Semanal |
| `/capacidad-plantas` | Capacidad de Plantas |
| `/rutas-viales` | Rutas y Distancias Viales (mapa OpenStreetMap con cálculo de rutas) |
| `/costos-transporte` | Costos de Transporte |
| `/validacion` | Validación del Escenario |
| `/resolucion-exacta` | Resolución Exacta |
| `/asignacion-costos` | Asignación y Costos |
| `/simulacion` | Laboratorio de escenarios y sensibilidad exacta |
| `/comparacion-sensibilidad` | Respuesta del exacto y AG ante una variante guardada; costo, tiempo, CPU y memoria por proceso |
| `/comparacion-metodos` | Comparación Exacto vs Algoritmo Genético |
| `/escalabilidad` | Escalabilidad de la Red |
| `/evolucion-ag` | Evolución del Algoritmo Genético |
| `/ajuste-ag` | Configuración y ajuste de parámetros del AG |
| `/procedimiento-exacto` | Procedimiento del Método Exacto |

La ruta raíz `/` redirige automáticamente a `/panel`.

## Interfaz de programación (API REST)

Prefijo base: `/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/escenarios` | Lista los escenarios disponibles |
| GET | `/escenarios/{esc_id}` | Obtiene el detalle de un escenario |
| POST | `/escenarios/{esc_id}/empresas` | Registra una empresa generadora |
| POST | `/escenarios/{esc_id}/plantas` | Registra una planta procesadora |
| PUT | `/escenarios/{esc_id}/empresas/{emp_id}/oferta` | Actualiza la oferta de una empresa |
| PUT | `/escenarios/{esc_id}/ofertas` | Actualiza ofertas en lote |
| PUT | `/escenarios/{esc_id}/plantas/{pla_id}/capacidad` | Actualiza la capacidad de una planta |
| PUT | `/escenarios/{esc_id}/capacidades` | Actualiza capacidades en lote |
| GET | `/escenarios/{esc_id}/rutas` | Lista las rutas del escenario |
| POST | `/escenarios/{esc_id}/rutas/{ruta_id}/reintentar-osrm` | Reintenta el cálculo de distancia vial |
| PUT | `/escenarios/{esc_id}/rutas/{ruta_id}/costo` | Modifica el costo de una ruta |
| PUT | `/escenarios/{esc_id}/costos` | Guarda una matriz de costos de forma atómica |
| PUT | `/escenarios/{esc_id}/tarifa` | Aplica una tarifa común a rutas con distancia válida |
| POST | `/escenarios/{esc_id}/simulaciones` | Guarda una variante con su referencia histórica |
| POST | `/escenarios/{esc_id}/simulaciones/{variante_id}/comparar-metodos` | Ejecuta exacto y AG en referencia y variante |
| POST | `/escenarios/{esc_id}/validar` | Valida la consistencia del escenario |
| POST | `/escenarios/{esc_id}/simular-inconsistencia` | Introduce una inconsistencia de demostración |
| POST | `/escenarios/{esc_id}/corregir-inconsistencias` | Corrige las inconsistencias detectadas |
| POST | `/escenarios/{esc_id}/optimizar` | Inicia la optimización (exacta o genética) |
| POST | `/escenarios/{esc_id}/ag/ajustar` | Recomienda parámetros del AG mediante Optuna bajo demanda |
| POST | `/escenarios/{esc_id}/sensibilidad` | Ejecuta un análisis de sensibilidad |
| GET | `/ejecuciones/{ejecucion_id}` | Consulta el estado y resultado de una ejecución |
| GET | `/optimizacion/evolucion-ag/{ejecucion_id}` | Consulta la evolución por generaciones del algoritmo genético |
| GET | `/optimizacion/procedimiento-exacto/{ejecucion_id}` | Consulta los pasos del método exacto |

## Motores de optimización en Python

- `python-engines/exact_solver/solver_exacto.py`: solucionador exacto del problema de transporte, con procedimiento Vogel–MODI, salida JSONL y medición del tiempo.
- `python-engines/genetic_solver/solver_genetico.py`: algoritmo genético de permutaciones de prioridades, decodificación a flujos factibles y emisión JSONL de cada generación. Su solución es heurística y no certifica el óptimo.
- `python-engines/genetic_solver/ajustar_hiperparametros.py`: ajuste Optuna TPE que se ejecuta únicamente al solicitarlo desde la sección «Ajuste de parámetros AG».
- `python-engines/common/jsonl_protocol.py`: utilidades de serialización compartidas por ambos motores.
- `python-engines/common/costos_modelo.py`: construcción compartida de los coeficientes de transporte, adquisición y operación.

## Pruebas

Pruebas unitarias y de integración del backend, incluidos los contratos HTTP y los procesos Python:

```bash
cd backend
bash mvnw test
cd ..
```

Pruebas del motor genético y del frontend; compilación de producción:

```bash
./.venv/bin/python -m unittest discover -s python-engines/genetic_solver -p 'test_*.py'
cd frontend
npm test
npm run build
```

## Documentación

- `docs/PLAN_IMPLEMENTACION.md`: hoja de ruta histórica del proyecto; algunas decisiones fueron reemplazadas por la formulación vigente.
- `docs/MODELO_MATEMATICO.md`: formulación vigente que ejecutan ambos motores.
- `docs/HUs y RNF/`: requisitos y diccionario originales, conservados como referencia de planificación.
- `docs/diagramas/`: diagramas de clases (`DC`) y de secuencia (`DS`) en formato `.drawio`.
- `mockups/`: maquetas HTML de referencia de cada vista.

## Estado actual y trabajo pendiente

Implementado:

- Backend en cinco capas con persistencia JSON de escenarios, API REST y puente con Python.
- Frontend con vistas por módulo, enrutamiento semántico, selector de escenario activo y datos dinámicos por escenario.
- Validación de escenarios con detección y corrección de inconsistencias.
- Motores Python funcionales: solución exacta por Vogel–MODI y algoritmo genético por prioridades con seguimiento por generación. El ajuste de parámetros usa Optuna bajo demanda.
- Sensibilidad comparada de referencia y variante, escalabilidad medida, y recursos del proceso Python por ejecución.

Pendiente:

- Incorporar una base de datos si se necesita consulta multiusuario o trazabilidad histórica de ejecuciones; los escenarios ya se conservan como archivos JSON.

## Licencia

Este proyecto se distribuye bajo los términos indicados en el archivo [LICENSE](LICENSE).
