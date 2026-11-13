# Modelo matemático implementado

Esta formulación describe el problema que ejecutan **ambos** motores. Las magnitudes son semanales y los costos están en COP.

## Red y parámetros

- Grafo dirigido bipartito \(G=(V,E)\), con \(V=I\cup J\): \(I\) son empresas generadoras y \(J\) son plantas procesadoras. \(E\subseteq I\times J\) contiene únicamente rutas activas, compatibles y con costo de transporte definido. Los nodos de paso no se usan en esta instancia.
- \(s_i\ge0\): oferta de la empresa \(i\), en toneladas por semana.
- \(u_j\ge0\): capacidad máxima semanal de la planta \(j\). Es la **demanda/capacidad de recepción** usada por el proyecto; no se impone una demanda mínima. La holgura puede quedar sin usar.
- \(d_{ij}\): distancia estimada de la ruta, en km. \(t_{ij}\): tarifa, en COP/(t·km). El costo unitario de transporte es \(c^T_{ij}=d_{ij}t_{ij}\), o un valor unitario COP/t editado directamente en la matriz.
- \(p_i\ge0\): precio de **adquisición** de una tonelada de residuo de la empresa \(i\), en COP/t. Se interpreta como costo, no como ingreso de venta.
- \(o_j\ge0\): costo de procesamiento en la planta \(j\), en COP/t.

Los coeficientes \(p_i\) y \(o_j\) son opcionales y valen cero en las redes semilla y en escenarios guardados antes de incorporarlos. Un precio uniforme por fuente cambia el costo total, pero con toda la oferta obligatoriamente evacuada no cambia por sí solo la asignación. El costo de operación de cada planta sí puede cambiar el destino elegido.

## Decisión, objetivo y restricciones

\(x_{ij}\) es el flujo semanal en toneladas de la empresa \(i\) a la planta \(j\). Se minimiza:

\[
Z=\sum_{(i,j)\in E}(c^T_{ij}+p_i+o_j)x_{ij}.
\]

Sujeto a:

\[
\sum_{j:(i,j)\in E}x_{ij}=s_i \quad\forall i\in I,
\qquad
\sum_{i:(i,j)\in E}x_{ij}\le u_j \quad\forall j\in J,
\qquad
x_{ij}\ge0.
\]

Las rutas fuera de \(E\) tienen flujo cero. Si la oferta supera la capacidad total, o las conexiones disponibles no permiten cubrirla, el modelo es infactible. El método exacto balancea internamente la capacidad sobrante con un origen auxiliar de costo cero; no es una empresa real ni crea material.

## Relación con la sensibilidad y el AG

- Una variación de **costos** escala el componente de transporte \(c^T_{ij}\). Precio y operación permanecen fijos. Los rangos de MODI se reportan sobre el coeficiente total \(c^T_{ij}+p_i+o_j\).
- Una variación de **oferta** cambia \(s_i\); una de **capacidad** cambia \(u_j\). El laboratorio llama capacidad a la demanda de recepción que puede atender cada planta.
- El AG decodifica prioridades en flujos que satisfacen estas restricciones. Su aptitud es \(1/(1+Z/C_{ref})\) para una escala positiva \(C_{ref}\). Una solución incompleta indica un error del decodificador y detiene la ejecución; no existe un parámetro de penalización sin efecto.
- El exacto certifica el mínimo de esta formulación mediante Vogel y MODI. El AG produce una solución factible sin certificar optimalidad. La brecha usa el costo de esta misma función objetivo en ambos motores.
