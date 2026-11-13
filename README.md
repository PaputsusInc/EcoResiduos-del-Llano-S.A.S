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

El Coordinador Logístico de la empresa debe asignar la oferta semanal de biomasa de cada empresa generadora (toneladas por semana) a un conjunto de plantas procesadoras con capacidad máxima limitada, minimizando el costo total de transporte. El modelo considera:

- Oferta obligatoria por empresa: toda la biomasa generada debe ser evacuada.
- Capacidad máxima por planta: ninguna planta puede recibir más de su capacidad semanal.
- Costo unitario de transporte por ruta, derivado de la distancia vial y de la tarifa por kilómetro.
- Verificación de factibilidad: cuando la oferta total supera la capacidad total, el escenario se declara infactible con el mensaje «Capacidad superada por la oferta».

Las magnitudes decimales (ofertas, capacidades, distancias, coordenadas, costos, precios sombra, rangos y tiempos) se manejan con precisión de doble precisión (`Double`) en el backend.

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
./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

El servicio queda disponible en `http://localhost:8080`. Es necesario que la variable de entorno `JAVA_HOME` apunte a una instalación de JDK 21.

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
| `/sensibilidad-costos` | Variación de Costos |
| `/sensibilidad-ofertas` | Variación de Ofertas |
| `/sensibilidad-capacidades` | Variación de Capacidades |
| `/evaluacion-sensibilidad` | Evaluación de Sensibilidad |
| `/precios-sombra` | Precios Sombra |
| `/rangos-optimalidad` | Rangos de Optimalidad |
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
| POST | `/escenarios/{esc_id}/validar` | Valida la consistencia del escenario |
| POST | `/escenarios/{esc_id}/simular-inconsistencia` | Introduce una inconsistencia de demostración |
| POST | `/escenarios/{esc_id}/corregir-inconsistencias` | Corrige las inconsistencias detectadas |
| POST | `/escenarios/{esc_id}/optimizar` | Inicia la optimización (exacta o genética) |
| POST | `/escenarios/{esc_id}/sensibilidad` | Ejecuta un análisis de sensibilidad |
| GET | `/ejecuciones/{ejecucion_id}` | Consulta el estado y resultado de una ejecución |
| GET | `/optimizacion/evolucion-ag/{ejecucion_id}` | Consulta la evolución por generaciones del algoritmo genético |
| GET | `/optimizacion/procedimiento-exacto/{ejecucion_id}` | Consulta los pasos del método exacto |

## Motores de optimización en Python

- `python-engines/exact_solver/solver_exacto.py`: solucionador exacto con entrada y salida JSONL, medición de tiempo en segundos y emisión de los pasos del procedimiento. Incluye una lógica de referencia modular y comentada, con la función designada para integrar la implementación matemática definitiva.
- `python-engines/genetic_solver/solver_genetico.py`: algoritmo genético con entrada y salida JSONL, emisión de un registro por generación, medición de tiempo y una lógica de referencia modular con el punto de integración indicado.
- `python-engines/common/jsonl_protocol.py`: utilidades de serialización compartidas por ambos motores.

## Pruebas

Pruebas del backend (40 pruebas: unitarias de dominio y aplicación, del controlador HTTP y de integración con los procesos Python):

```bash
cd backend
./mvnw test
```

Verificación de compilación del frontend:

```bash
cd frontend
npm run build
```

## Documentación

- `docs/PLAN_IMPLEMENTACION.md`: hoja de ruta técnica del proyecto.
- `docs/HUs y RNF/`: historias de usuario, requisitos funcionales, requisitos no funcionales y diccionario de datos.
- `docs/diagramas/`: diagramas de clases (`DC`) y de secuencia (`DS`) en formato `.drawio`.
- `mockups/`: maquetas HTML de referencia de cada vista.

## Estado actual y trabajo pendiente

Implementado:

- Backend completo en las cinco capas con persistencia en memoria, API REST y puente con Python.
- Frontend con las 20 vistas, enrutamiento semántico, selector de escenario activo y datos dinámicos por escenario.
- Validación de escenarios con detección y corrección de inconsistencias.
- Motores Python con el protocolo JSONL y una lógica de referencia funcional.

Pendiente:

- Incorporar la implementación matemática definitiva en los puntos de integración de `solver_exacto.py` (método exacto) y `solver_genetico.py` (algoritmo genético).
- Conectar las vistas de dualidad y sensibilidad a los resultados reales de los motores, actualmente calculados de forma analítica en el frontend para los escenarios de demostración.
- Sustituir la persistencia en memoria por una base de datos si se requiere conservar los datos entre ejecuciones.

## Licencia

Este proyecto se distribuye bajo los términos indicados en el archivo [LICENSE](LICENSE).
