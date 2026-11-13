# Verificación de los motores de optimización

Fecha: 12 de noviembre de 2026. Se probaron los siete escenarios semilla del backend, ambos motores por proceso Python, la API `POST /api/escenarios/{id}/optimizar` y el modo comparativo. Los costos y flujos se contrastaron con un modelo de programación lineal formulado aparte en la prueba de auditoría. Para cada resultado factible se comprobó oferta por empresa, capacidad por planta, rutas activas y compatibles, no negatividad y suma de costo = flujo × tarifa.

## Escenarios incluidos

Configuración AG de la comparación: población 20, 12 generaciones, semilla 42. El AG es heurístico: su costo puede superar el óptimo certificado.

| Escenario | Exacto | Costo exacto (COP) | AG | Costo AG (COP) | Brecha AG |
| --- | --- | ---: | --- | ---: | ---: |
| ESC-01 | Óptimo | 997.500 | Factible | 997.650 | 0,015 % |
| ESC-02 | Óptimo | 1.280.985 | Factible | 1.289.025 | 0,628 % |
| ESC-03 | Óptimo | 1.147.153 | Factible | 1.147.326 | 0,015 % |
| ESC-04 | Inviable: oferta mayor que capacidad | — | Sin candidato factible | — | — |
| ESC-AMP-20x6 | Óptimo | 4.220.250 | Factible | 4.497.750 | 6,575 % |
| ESC-AMP-30x8 | Óptimo | 6.391.050 | Factible | 6.722.730 | 5,190 % |
| ESC-UBICACIONES | Óptimo matemático sin envíos | 0 | Factible sin envíos | 0 | No aplica |

ESC-UBICACIONES contiene coordenadas verificadas, pero ofertas, capacidades y rutas operativas están en cero. Su solución vacía no constituye un plan de transporte real.

## Casos adicionales

- 90 redes generadas de forma reproducible: 45 factibles y 45 inviables; 180 ejecuciones de motores sin errores de estado, oferta, capacidad, rutas o costo. Además, 600 redes adicionales contrastaron Vogel–MODI con un modelo lineal independiente: 322 factibles y 278 inviables, sin diferencias de costo ni violaciones de dualidad. Se incluyeron costos cero y de 100 millones COP/t, rutas ausentes, inactivas e incompatibles, capacidades cero y distintas dimensiones de red.
- Regresiones puntuales: red de una empresa y una planta, oferta cero, capacidad sobrante, cuellos de botella con capacidad agregada suficiente, rutas bloqueadas con costo presente, cantidades fraccionarias y oferta menor que la tolerancia numérica.
- 14 pruebas Python y suite Java/Maven completas: aprobadas. Compilación del frontend con Vite: aprobada. Prueba manual local: “Resolver en Vivo” mostró ESC-01 con costo 997.500 COP y la vista de procedimiento mostró la ejecución y sus flujos reales.

## Correcciones necesarias encontradas

1. El motor exacto usaba una ruta inactiva o incompatible si conservaba un costo. Ahora respeta ambas banderas.
2. Bloqueaba costos válidos a partir de 100 millones COP/t. Las rutas inexistentes se representan con cotas cero, sin costo centinela.
3. Una red sin conexiones suficientes terminaba sin resultado aunque la capacidad total alcanzara. Ahora informa `INFACTIBLE_CERTIFICADO`.
4. Los pasos MODI anteriores contenían valores fijos. El motor exacto ahora ejecuta Vogel para construir la base y MODI para pivotar y certificar la optimalidad. El análisis de sensibilidad calcula rangos de base óptima, factibilidad y tarifas; los precios sombra proceden de los potenciales duales MODI.
5. Se preserva la precisión de flujos y costos emitidos. El AG no descarta ofertas positivas pequeñas por usar la tolerancia como umbral de asignación.
6. La vista exacta usaba costos de referencia y un método HTTP inexistente. Ahora muestra la respuesta de la API; el procedimiento carga pasos reales de la ejecución.

Esta cobertura verifica todos los escenarios incluidos y un conjunto amplio de casos límite. Ninguna batería finita demuestra corrección para literalmente todas las entradas imaginables. En particular, el AG no certifica el óptimo global.
