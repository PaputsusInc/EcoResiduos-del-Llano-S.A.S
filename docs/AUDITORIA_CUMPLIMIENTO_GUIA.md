# Auditoría de cumplimiento de la guía del proyecto

> Esta auditoría registra el estado **antes de las correcciones**. La formulación vigente está en [MODELO_MATEMATICO.md](MODELO_MATEMATICO.md); los cambios posteriores incluyen costos de adquisición y operación, comparación de ambos métodos bajo sensibilidad, escalabilidad medida, guardado atómico y separación por puertos. El dictamen y la tabla siguientes son históricos, no describen el estado actual.

**Fecha:** 13 de noviembre de 2026  
**Fuente:** `ProyectoFinal_Optimizacion_2026-2-2.pdf`, páginas 1–4.  
**Alcance:** software, modelado, pruebas y demostración práctica. Se excluye por completo el entregable del informe IEEE y sus exigencias documentales propias. La asignación de roles del grupo no se puede comprobar en el repositorio.

## Dictamen

**Cumplimiento sustancial, pero todavía no integral.** Los motores exacto y genético, la comparación básica, la simulación exacta y el ajuste de parámetros funcionan. Hay cuatro brechas relevantes para la sustentación: la vista de escalabilidad muestra cifras fijas ajenas a los cálculos actuales; la edición de costos puede anunciar éxito tras fallos de guardado; el laboratorio visible compara solo el método exacto ante perturbaciones; y la formulación formal pedida en la fase 1 no está completa ni inequívoca en el código y la documentación del software.

Estados usados: **Cumple** = implementación y evidencia funcional; **Parcial** = existe la capacidad, pero falta una parte explícita o la interfaz puede inducir a error; **No cumple** = la pantalla o capacidad solicitada no entrega el resultado real; **No verificado** = no se ejecutó una prueba completa de ese punto.

## Revisión requisito por requisito

| Requisito de la guía | Estado | Evidencia y límite |
| --- | --- | --- |
| Red inicial de 10 empresas y 4 plantas en Villavicencio, Restrepo, Granada y Puerto Gaitán | **Cumple** | La semilla `ESC-01` contiene las diez fuentes, los cuatro destinos y 115 t de oferta frente a 135 t de capacidad (`backend/.../infrastructure/persistence/AdaptadorPersistencia.java`, `construirEscenario01`). Los nombres del caso son simulados y contextualizados; no se presentan como mediciones reales. |
| Ampliar empresas y plantas | **Parcial** | Existen formularios y rutas HTTP para agregarlas. Sin embargo, si falla el backend, las páginas de empresas y plantas fabrican rutas, distancias y costos en React y muestran éxito local; esa versión puede diferir de la usada por los motores (`frontend/src/pages/hu01_parametrizacion/Hu01EmpresasGeneradorasPage.jsx`, `Hu02PlantasProcesadorasPage.jsx`). |
| Grafo dirigido \(G=(V,E)\), nodos, arcos, distancias estimadas y costo por km·t | **Parcial** | `Empresa`, `Planta`, `Ruta` y `NodoPaso` representan la red. `Ruta` contiene origen, destino, distancia y tarifa, con `costo_unitario_t = distancia_km × tarifa_t_km`. No se encontró una definición formal completa de \(V\) y \(E\) en la documentación ejecutable. Los casos semilla emplean distancias estimadas; el fallback de Haversine conserva la etiqueta «OSRM (provisional)», aunque ya no corresponde a una ruta vial obtenida de OSRM. Los nodos de paso son opcionales según la guía. |
| Modelo lineal explícito: conjuntos, parámetros, variables, objetivo, oferta, demanda y no negatividad | **Parcial** | El motor resuelve implícitamente \(\min\sum c_{ij}x_{ij}\), evacúa toda la oferta, limita la entrada a cada planta y prohíbe flujos negativos/rutas bloqueadas. El objeto `modelo_formulado` publica solo una cadena del objetivo y algunos totales; faltan una especificación formal completa y los costos de operación como coeficiente independiente. `Planta` solo define capacidad máxima, no demanda mínima o exacta independiente. Hay que acordar con el docente si «demanda/capacidad» permite este modelo de cupos máximos. El «precio de la tonelada» mencionado en la contextualización tampoco es un parámetro editable separado. |
| Módulo exacto y solución óptima global del modelo | **Cumple** | `python-engines/exact_solver/transporte_vogel_modi.py` construye una solución con Vogel y pivota con MODI. `solver_exacto.py` entrega costo, flujos, duales y pasos. Se verificó `ESC-01` en el servidor: `OPTIMO`, 997.500 COP. La certificación corresponde al modelo de transporte implementado, con sus costos y restricciones actuales. |
| Validación de todas las restricciones | **Cumple** | `ResultadoOptimizacion.comprobar_factibilidad_flujos` revisa no negatividad, rutas activas/compatibles, igualdad de oferta y cotas de capacidad. Las pruebas incluyen redes inviables por cuello de botella, rutas ausentes y decimales. |
| AG personalizado y cromosoma de asignación/rutas | **Cumple** | `genetic_solver/problema.py` codifica una permutación de prioridades de fuentes y plantas y la decodifica en flujos. La decodificación respeta las rutas permitidas y la capacidad. Esta es una codificación indirecta de la asignación, válida para el requisito. |
| Fitness inverso del costo con penalización por violación de capacidad | **Parcial** | `algoritmo.py:evaluar` usa una aptitud inversa de costo normalizado y penaliza **oferta no cubierta** (`faltante`). No calcula una penalización explícita por exceso de capacidad porque el decodificador construye planes dentro de la capacidad. El resultado práctico es más fuerte en factibilidad, pero no coincide literalmente con la función de aptitud descrita por la guía. Conviene explicarlo o ajustar la formulación. |
| Selección, cruce y mutación | **Cumple** | Hay torneo, cruce OX de dos cortes y mutación por intercambio. El formulario muestra el operador real aplicado y no ofrece una alternativa sin respaldo de la interfaz. Existe además un cruce por bloques en el motor, fuera del formulario básico. |
| Población, generaciones, tasas de cruce y mutación ajustables en interfaz | **Cumple** | `AjusteParametrosAgPage.jsx` expone los cuatro valores, los valida y los conserva por escenario. Optuna propone una configuración solo al pulsar «Ajustar parámetros»; la recomendación no equivale a garantía de óptimo global. El endpoint respondió HTTP 200 en una ejecución real con 12 ensayos. |
| Matriz de costos, ofertas y capacidades editables | **Parcial** | Ofertas y capacidades tienen formularios y API. La matriz de costos también se edita, pero `Hu06CostosTransportePage.jsx:98-141` actualiza primero el estado local, ignora los errores de cada PUT y aun así muestra «guardada exitosamente». El motor puede ejecutar valores distintos a los que el usuario cree haber guardado. |
| Simular combustible/transporte, oferta porcentual y cuellos de botella de planta | **Cumple** | `LaboratorioSimulacionPage.jsx` permite combinar hasta 30 variaciones, previsualizar, guardar y volver a comparar. `construir_escenario.py` materializa los cambios sin modificar la referencia. Una previsualización HTTP real de +10 % en la oferta de `EMP-01` pasó de 997.500 a 1.028.250 COP. |
| Precios sombra y rangos que conservan la base óptima | **Cumple** | `analisis_sensibilidad.py` calcula potenciales MODI, rangos de oferta/capacidad y tarifas, además de rangos de factibilidad. La vista de sensibilidad los presenta. La respuesta real de la simulación devolvió 14 términos independientes (10 fuentes y 4 plantas). |
| Comparación exacto vs. AG: costo, tiempo y gap | **Cumple** | `MotorComparacionRendimiento` consolida ambos resultados; `Hu16ComparacionExactoVsAgPage.jsx` solicita `COMPARATIVO` y los muestra. Las tres redes semilla devolvieron costos y brechas coherentes en una llamada HTTP real. La lectura de tiempo es la de cada corrida, no un benchmark estadístico. |
| Respuesta de **ambos** métodos bajo sensibilidad | **Parcial** | `MotorAnalisisSensibilidad.evaluar_escenario_sensibilidad` y `POST /api/escenarios/{id}/sensibilidad` pueden producir dos reportes comparativos. La página principal del laboratorio llama a `/simulaciones/...`, donde `GestorEscenariosSimulacion.comparar` ejecuta **solo exacto**. El usuario no ve allí cómo cambian el costo, gap y tiempo del AG frente a la referencia perturbada. |
| Escalabilidad con resultados medidos | **No cumple en la interfaz** | El backend sí tiene `ESCALABILIDAD` para ejecutar 10×4, 20×6 y 30×8. `Hu17EscalabilidadRedPage.jsx` no lo llama: muestra constantes de costo, tiempo y memoria y afirma que usa simplex. Los costos fijos de 20×6 y 30×8 son 2.054.300 y 3.120.800 COP; la ejecución real devolvió 4.220.250 y 6.391.050 COP. No hay medición real de memoria ni repeticiones suficientes para afirmar un factor de velocidad. El motor exacto actual es Vogel–MODI. |
| Código modular en Git e instrucciones de ejecución | **Parcial** | El repositorio tiene módulos Java/React/Python, tests y `README.md` con instalación y arranque. La separación hexagonal no es estricta: la capa `application` importa adaptadores de `infrastructure` y validación de `exposition`; además, varias páginas React calculan rutas/costos de respaldo. Estas dependencias no impiden ejecutar, pero contradicen la arquitectura declarada. |
| Demostración funcional con varios escenarios y sensibilidad en vivo | **Parcial / pendiente de ensayo completo** | Se comprobaron por HTTP optimización exacta, ajuste AG, simulación y escalabilidad del backend; los tests Java usan API con motores reales. No se repitió en esta auditoría una demostración completa de punta a punta en el navegador con guardado de cambios, comparación de ambos métodos y contingencia de errores. La pantalla de escalabilidad y el guardado de costos impiden presentarla como completamente lista. |

## Comprobaciones realizadas el 13 de noviembre de 2026

- `.venv/bin/python -m unittest discover -s python-engines -p 'test_*.py'`: **19 pruebas, 0 fallos, 0 omitidas**.
- `cd backend && bash mvnw test -q`: **47 pruebas, 0 fallos, 0 errores, 0 omitidas** (conteo desde los XML de Surefire).
- `cd frontend && npm test`: **10 pruebas, 0 fallos**.
- `cd frontend && npm run build`: compilación terminada. Vite advirtió que un bundle supera 500 kB; no afecta directamente el cumplimiento matemático.
- Servidor Spring Boot iniciado temporalmente; se consultaron endpoints HTTP reales y se detuvo al terminar.

| Red | Exacto (COP) | AG (COP) | Gap AG | Configuración |
| --- | ---: | ---: | ---: | --- |
| `ESC-01` | 997.500 | 997.650 | 0,015 % | Población 20, 12 generaciones, semilla 42 |
| `ESC-AMP-20x6` | 4.220.250 | 4.497.750 | 6,575 % | Igual |
| `ESC-AMP-30x8` | 6.391.050 | 6.722.730 | 5,190 % | Igual |

Estas cifras proceden de una ejecución HTTP del modo `ESCALABILIDAD`; no son una estimación de desempeño estadístico. Los tiempos cambian entre corridas y equipos, de modo que la comparación de velocidad exige varias repeticiones, mismo presupuesto AG y descripción de la máquina.

## Correcciones priorizadas antes de sustentar

1. **Sustituir la vista de escalabilidad fija por la respuesta real** de `ESCALABILIDAD`; eliminar la memoria inventada y el texto «simplex». Mostrar configuración AG, dimensión, costo, tiempo y gap por red; medir tiempos de forma repetible si se formularán conclusiones de velocidad.
2. **Hacer confiable el guardado de la matriz de costos.** Enviar cambios al backend, reportar fallos por celda o por lote y recargar el escenario confirmado. Evitar éxito optimista y cálculos de rutas/costos dentro de React. Aplicar el mismo principio a los fallbacks locales de alta de empresas y plantas.
3. **Mostrar ambos enfoques bajo sensibilidad.** Conectar el laboratorio con el caso de uso comparativo existente, o ampliar el caso de uso de simulación por un puerto apropiado. Exhibir costo y tiempo exacto/AG, gap antes/después y cambios de flujo junto a los duales y rangos exactos.
4. **Cerrar el contrato del modelo con el docente.** Documentar expresamente \(V\), \(E\), conjuntos, \(x_{ij}\), objetivo y restricciones. Confirmar si las plantas requieren demanda mínima/exacta, costo de operación y precio por tonelada como variables separadas; implementarlos si la respuesta es sí. No presentarlos como ya soportados.
5. **Limpiar la dependencia hexagonal.** La aplicación debe depender de puertos del dominio o de aplicación; los adaptadores Python, HTTP/OSRM y validadores de transporte deben implementarlos desde infraestructura/exposición. Los cálculos matemáticos y de negocio deben quedar en el motor correspondiente, no en componentes React.
6. **Explicar el fitness del AG con precisión.** La capacidad se respeta al decodificar; la penalización implementada es por oferta faltante. Si se exige la penalización literal por capacidad, añadir una medida de violación consistente y una prueba que la active.

## Límite de esta auditoría

Las pruebas aprobadas demuestran los casos que ejecutan, no validan automáticamente cada interacción visual ni sustituyen el ensayo final de sustentación. Esta revisión no modifica los motores ni las pantallas existentes.
