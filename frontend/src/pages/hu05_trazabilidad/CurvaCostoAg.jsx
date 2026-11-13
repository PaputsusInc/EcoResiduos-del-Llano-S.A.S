import React, { useState } from 'react';
import { Activity, ArrowDownRight, ChartNoAxesCombined, Play } from 'lucide-react';
import { resumirCurvaCosto } from './curvaCostoAg';

const dinero = (valor) => Number.isFinite(valor)
  ? `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP` : '—';
const compacto = (valor) => `$ ${Intl.NumberFormat('es-CO', {
  notation: 'compact', maximumFractionDigits: 1
}).format(valor)}`;
const numero = (valor) => Number.isFinite(valor) ? valor.toLocaleString('es-CO') : '—';

export default function CurvaCostoAg({ historial, enCurso, onIniciar }) {
  const resumen = resumirCurvaCosto(historial);
  const [vista, setVista] = useState('detalle');
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState(null);
  const { puntos } = resumen;

  if (puntos.length < 2) {
    const soloInicial = puntos.length === 1;
    return (
      <section aria-labelledby="curva-titulo" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><ChartNoAxesCombined aria-hidden="true" className="h-5 w-5" /></div>
          <div>
            <h2 id="curva-titulo" className="text-lg font-bold text-slate-950">Evolución del costo</h2>
            <p className="mt-1 text-sm text-slate-600">El costo del mejor plan factible se sigue generación por generación.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex max-w-2xl items-start gap-4">
            <div className="rounded-full border border-emerald-200 bg-white p-3 text-emerald-700">
              {enCurso ? <Activity aria-hidden="true" className="h-5 w-5 animate-pulse" /> : <Play aria-hidden="true" className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{soloInicial ? 'Población inicial registrada' : enCurso ? 'Preparando la primera generación' : 'Inicia el AG para ver su evolución'}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {soloInicial
                  ? `Generación 0: ${dinero(puntos[0].mejor_costo_acumulado)}. La curva tendrá una tendencia cuando llegue la siguiente generación.`
                    : enCurso
                    ? 'El motor está preparando los primeros candidatos. La evolución aparecerá aquí cuando registre sus costos.'
                    : 'Aún no hay generaciones registradas. Al ejecutar el AG podrás observar cuándo baja el costo y cuándo deja de mejorar.'}
              </p>
            </div>
          </div>
          {!enCurso && !soloInicial && <button type="button" onClick={onIniciar}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            <Play aria-hidden="true" className="h-4 w-4" /> Iniciar AG
          </button>}
        </div>
      </section>
    );
  }

  const detalle = resumen.puedeAmpliar && vista === 'detalle';
  const finVista = detalle ? resumen.finDetalle : resumen.ultimo.numero;
  const visibles = puntos.filter((punto) => punto.numero <= finVista);
  const primero = visibles[0];
  const ultimoVisible = visibles.at(-1);
  const seleccionado = visibles.find((punto) => punto.numero === generacionSeleccionada) || ultimoVisible;
  const indiceSeleccionado = visibles.indexOf(seleccionado);

  const ancho = 920;
  const izquierda = 94;
  const derecha = 886;
  const arriba = 34;
  const abajo = 256;
  const valores = visibles.map((punto) => punto.mejor_costo_acumulado);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const amplitud = maximo - minimo;
  const margen = amplitud > 0 ? amplitud * 0.14 : Math.max(1, maximo * 0.025);
  const piso = Math.max(0, minimo - margen);
  const techo = maximo + margen;
  const x = (numeroGeneracion) => izquierda + ((numeroGeneracion - primero.numero) / Math.max(1, finVista - primero.numero)) * (derecha - izquierda);
  const y = (costo) => abajo - ((costo - piso) / Math.max(1, techo - piso)) * (abajo - arriba);
  const puntosLinea = visibles.map((punto) => [x(punto.numero), y(punto.mejor_costo_acumulado)]);
  const recorrido = puntosLinea.reduce((trazo, [puntoX, puntoY], indice) => indice === 0
    ? `M ${puntoX} ${puntoY}` : `${trazo} H ${puntoX} V ${puntoY}`, '');
  const area = `${recorrido} L ${x(ultimoVisible.numero)} ${abajo} L ${x(primero.numero)} ${abajo} Z`;
  const marcasX = [...new Set(Array.from({ length: 5 }, (_, indice) =>
    Math.round(primero.numero + ((finVista - primero.numero) * indice) / 4)))];
  const marcasY = Array.from({ length: 4 }, (_, indice) => techo - ((techo - piso) * indice) / 3);

  function seleccionarConPuntero(evento) {
    const rectangulo = evento.currentTarget.getBoundingClientRect();
    const posicion = ((evento.clientX - rectangulo.left) / rectangulo.width) * ancho;
    const cercano = visibles.reduce((elegido, punto) =>
      Math.abs(x(punto.numero) - posicion) < Math.abs(x(elegido.numero) - posicion) ? punto : elegido, visibles[0]);
    setGeneracionSeleccionada(cercano.numero);
  }

  return (
    <section aria-labelledby="curva-titulo" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-5 pt-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Curva de convergencia</p>
          <h2 id="curva-titulo" className="mt-1 text-lg font-bold text-slate-950">Evolución del mejor costo</h2>
          <p className="mt-1 text-sm text-slate-600">Cada descenso indica que el AG encontró un plan factible más barato.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {enCurso ? 'Actualizando la ejecución' : `${numero(puntos.length)} generaciones registradas`}
        </span>
      </div>

      <div className="grid gap-4 border-y border-slate-100 bg-slate-50/70 px-6 py-4 md:grid-cols-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Costo inicial</p><p className="mt-1 text-base font-bold text-slate-900">{dinero(resumen.inicial)}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mejor costo encontrado</p><p className="mt-1 text-base font-bold text-emerald-800">{dinero(resumen.ultimo.mejor_costo_acumulado)}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reducción observada</p><p className="mt-1 flex items-center gap-1 text-base font-bold text-slate-900"><ArrowDownRight aria-hidden="true" className="h-4 w-4 text-emerald-700" />{dinero(resumen.ahorro)} <span className="text-xs font-semibold text-slate-500">({resumen.porcentajeAhorro.toFixed(1)} %)</span></p></div>
      </div>

      <div className="px-4 pb-5 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span aria-hidden="true" className="inline-block h-0.5 w-6 rounded bg-emerald-700" /> Mejor costo acumulado
          </div>
          {resumen.puedeAmpliar && <div role="group" aria-label="Alcance de la gráfica" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button type="button" onClick={() => setVista('detalle')} aria-pressed={detalle}
              className={`min-h-11 rounded-md px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${detalle ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Ahorro principal</button>
            <button type="button" onClick={() => setVista('completa')} aria-pressed={!detalle}
              className={`min-h-11 rounded-md px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${!detalle ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Ejecución completa</button>
          </div>}
        </div>
        <p className="mt-3 text-xs text-slate-600">Mostrando generaciones {primero.numero}–{finVista} de {resumen.ultimo.numero}. {detalle ? `Al menos el 95 % de la reducción se alcanzó en la generación ${resumen.generacionAhorroPrincipal}; el costo final se ve en «Ejecución completa».` : 'La escala horizontal incluye toda la ejecución.'}</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <svg viewBox="0 0 920 310" className="min-w-[700px] w-full" role="img"
            aria-label={`Costo inicial ${dinero(resumen.inicial)} y mejor costo ${dinero(resumen.ultimo.mejor_costo_acumulado)}. Última mejora en la generación ${resumen.ultimaMejora}.`}
            onPointerMove={seleccionarConPuntero}>
            <defs><linearGradient id="curva-ag-relleno" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity="0.16" /><stop offset="100%" stopColor="#059669" stopOpacity="0.01" /></linearGradient></defs>
            <text x={izquierda} y="19" fill="#475569" fontSize="12" fontWeight="600">COSTO · COP</text>
            {marcasY.map((valor) => <g key={valor}>
              <line x1={izquierda} x2={derecha} y1={y(valor)} y2={y(valor)} stroke="#e2e8f0" strokeDasharray="3 5" />
              <text x={izquierda - 12} y={y(valor) + 4} textAnchor="end" fill="#475569" fontSize="12">{compacto(valor)}</text>
            </g>)}
            {marcasX.map((valor) => <g key={valor}>
              <line x1={x(valor)} x2={x(valor)} y1={abajo} y2={abajo + 5} stroke="#94a3b8" />
              <text x={x(valor)} y={abajo + 23} textAnchor="middle" fill="#475569" fontSize="12">{valor}</text>
            </g>)}
            <path d={area} fill="url(#curva-ag-relleno)" />
            <path d={recorrido} fill="none" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {visibles.filter((punto, indice) => indice > 0 && punto.mejor_costo_acumulado < visibles[indice - 1].mejor_costo_acumulado - 1e-6).map((punto) =>
              <circle key={punto.numero} cx={x(punto.numero)} cy={y(punto.mejor_costo_acumulado)} r="4" fill="white" stroke="#047857" strokeWidth="2" />)}
            <line x1={x(seleccionado.numero)} x2={x(seleccionado.numero)} y1={arriba} y2={abajo} stroke="#0f766e" strokeDasharray="4 5" opacity="0.55" />
            <circle cx={x(seleccionado.numero)} cy={y(seleccionado.mejor_costo_acumulado)} r="7" fill="#047857" stroke="white" strokeWidth="3" />
            <text x={(izquierda + derecha) / 2} y="303" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">GENERACIÓN</text>
          </svg>
        </div>
        <div className="mt-4 grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Generación {seleccionado.numero}</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{dinero(seleccionado.mejor_costo_acumulado)}</p>
            <p className="mt-1 text-xs text-slate-600">Mejor de esta generación: {dinero(seleccionado.mejor_costo_factible)} · {numero(seleccionado.candidatos_factibles)} planes factibles</p>
          </div>
          <div className="self-center sm:w-44">
            <label htmlFor="explorar-generacion-ag" className="block text-xs font-semibold text-slate-700">Explorar generaciones</label>
            <input id="explorar-generacion-ag" type="range" min="0" max={visibles.length - 1} value={indiceSeleccionado}
              onChange={(evento) => setGeneracionSeleccionada(visibles[Number(evento.target.value)].numero)}
              aria-valuetext={`Generación ${seleccionado.numero}, ${dinero(seleccionado.mejor_costo_acumulado)}`}
              className="mt-2 w-full accent-emerald-700" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {resumen.cantidadMejoras === 0
            ? 'El costo se mantuvo igual desde la población inicial. La línea horizontal representa un resultado estable, no datos faltantes.'
            : resumen.generacionesEstables > 0
              ? `La última mejora apareció en la generación ${resumen.ultimaMejora}; después hubo ${numero(resumen.generacionesEstables)} generaciones sin un costo menor.`
              : `El AG encontró ${numero(resumen.cantidadMejoras)} mejoras hasta la generación ${resumen.ultimaMejora}.`}
        </p>
      </div>
    </section>
  );
}
