export function resumirCurvaCosto(historial) {
  const puntos = (Array.isArray(historial) ? historial : [])
    .filter((registro) => Number.isInteger(registro.numero)
      && registro.numero >= 0 && Number.isFinite(registro.mejor_costo_acumulado))
    .sort((a, b) => a.numero - b.numero);

  if (puntos.length === 0) return { puntos, puedeAmpliar: false };

  const inicial = puntos[0].mejor_costo_acumulado;
  const ultimo = puntos.at(-1);
  let ultimaMejora = puntos[0].numero;
  let cantidadMejoras = 0;
  for (let indice = 1; indice < puntos.length; indice += 1) {
    if (puntos[indice].mejor_costo_acumulado < puntos[indice - 1].mejor_costo_acumulado - 1e-6) {
      ultimaMejora = puntos[indice].numero;
      cantidadMejoras += 1;
    }
  }

  const ahorro = Math.max(0, inicial - ultimo.mejor_costo_acumulado);
  const costoConAhorroPrincipal = inicial - ahorro * 0.95;
  const generacionAhorroPrincipal = puntos.find((punto) =>
    punto.mejor_costo_acumulado <= costoConAhorroPrincipal + 1e-6)?.numero ?? ultimo.numero;
  const margen = Math.max(4, Math.ceil(ultimo.numero * 0.04));
  const finDetalle = Math.min(ultimo.numero, Math.max(8, generacionAhorroPrincipal + margen));
  return {
    puntos, inicial, ultimo, ahorro,
    porcentajeAhorro: inicial > 0 ? (ahorro / inicial) * 100 : 0,
    ultimaMejora, cantidadMejoras,
    generacionAhorroPrincipal,
    generacionesEstables: ultimo.numero - ultimaMejora,
    finDetalle,
    puedeAmpliar: cantidadMejoras > 0 && finDetalle < ultimo.numero
  };
}
