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
7. [Módulos funcionales](#módulos-funcionales)
8. [Interfaz de programación (API REST)](#interfaz-de-programación-api-rest)
9. [Motores de optimización en Python](#motores-de-optimización-en-python)
10. [Pruebas](#pruebas)
11. [Documentación](#documentación)
12. [Estado actual y trabajo pendiente](#estado-actual-y-trabajo-pendiente)
13. [Licencia](#licencia)

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
- Sensibilidad comparada de referencia y variante, escalabilidad medida, y recursos del proceso Python por corrida.

Pendiente:

- Incorporar una base de datos si se necesita consulta multiusuario o trazabilidad histórica de ejecuciones; los escenarios ya se conservan como archivos JSON.

## Licencia

Este proyecto se distribuye bajo los términos indicados en el archivo [LICENSE](LICENSE).
