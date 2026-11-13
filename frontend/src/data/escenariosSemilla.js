/**
 * Datos semilla y catálogo de escenarios para EcoResiduos del Llano S.A.S.
 * Permite sincronización completa entre frontend y backend, garantizando funcionamiento
 * tanto con backend Spring Boot conectado como en modo standalone/desarrollo local.
 */

// 30 Empresas contextualizadas en el Meta
export const EMPRESAS_META_30 = [
  { id: 'EMP-01', nombre: 'Palmeras del Llano', ubicacion: 'Acacías (Vía San Carlos)', latitud: 3.99, longitud: -73.77, tipo_residuo: 'Palma de aceite', oferta_t: 25.0 },
  { id: 'EMP-02', nombre: 'Agropecuaria San Martín', ubicacion: 'San Martín (Vereda Camoa)', latitud: 3.69, longitud: -73.70, tipo_residuo: 'Cascarilla de arroz', oferta_t: 15.0 },
  { id: 'EMP-03', nombre: 'Hacienda La Cabaña', ubicacion: 'Cumaral (Sector Guacavía)', latitud: 4.27, longitud: -73.49, tipo_residuo: 'Palma de aceite', oferta_t: 18.0 },
  { id: 'EMP-04', nombre: 'Arrocera del Ariari', ubicacion: 'Fuente de Oro (Troncal Llano)', latitud: 3.46, longitud: -73.62, tipo_residuo: 'Cascarilla de arroz', oferta_t: 12.0 },
  { id: 'EMP-05', nombre: 'Frutales y Cítricos Meta', ubicacion: 'Granada (Vía Lejanías)', latitud: 3.55, longitud: -73.70, tipo_residuo: 'Residuos cítricos', oferta_t: 8.0 },
  { id: 'EMP-06', nombre: 'BioCacao de la Sierra', ubicacion: 'Villavicencio (Vía antigua)', latitud: 4.142, longitud: -73.626, tipo_residuo: 'Cacao y derivados', oferta_t: 6.0 },
  { id: 'EMP-07', nombre: 'AgroForestal La Esperanza', ubicacion: 'Castilla la Nueva (Vereda Cacayal)', latitud: 3.83, longitud: -73.69, tipo_residuo: 'Forestal maderable', oferta_t: 10.0 },
  { id: 'EMP-08', nombre: 'Plantaciones San Rafael', ubicacion: 'Puerto López (km 24)', latitud: 4.09, longitud: -72.96, tipo_residuo: 'Palma de aceite', oferta_t: 11.0 },
  { id: 'EMP-09', nombre: 'Ganadería Sostenible Guamal', ubicacion: 'Guamal (Vía San Martín)', latitud: 3.88, longitud: -73.77, tipo_residuo: 'Estiércol y pecuario', oferta_t: 5.0 },
  { id: 'EMP-10', nombre: 'Agropecuaria Cabuyaro', ubicacion: 'Cabuyaro (Margen río Meta)', latitud: 4.28, longitud: -72.79, tipo_residuo: 'Cascarilla de arroz', oferta_t: 5.0 },
  { id: 'EMP-11', nombre: 'Cítricos del Ariari', ubicacion: 'Lejanías (Vereda La Cristalina)', latitud: 3.52, longitud: -74.02, tipo_residuo: 'Residuos cítricos', oferta_t: 14.0 },
  { id: 'EMP-12', nombre: 'Palma Real de Casanare-Meta', ubicacion: 'Barranca de Upía (Sector Central)', latitud: 4.57, longitud: -72.97, tipo_residuo: 'Palma de aceite', oferta_t: 22.0 },
  { id: 'EMP-13', nombre: 'Arroces del Piedemonte', ubicacion: 'Restrepo (Vereda Salinas)', latitud: 4.25, longitud: -73.57, tipo_residuo: 'Cascarilla de arroz', oferta_t: 16.0 },
  { id: 'EMP-14', nombre: 'Biomasa del Guayabero', ubicacion: 'San Juan de Arama (Vía Mesetas)', latitud: 3.38, longitud: -73.88, tipo_residuo: 'Forestal maderable', oferta_t: 9.0 },
  { id: 'EMP-15', nombre: 'Agropecuaria Puerto Lleras', ubicacion: 'Puerto Lleras (Margen Río Ariari)', latitud: 3.28, longitud: -73.37, tipo_residuo: 'Cascarilla de arroz', oferta_t: 13.0 },
  { id: 'EMP-16', nombre: 'Frutales de Vista Hermosa', ubicacion: 'Vista Hermosa (Sector Caño Blanco)', latitud: 3.12, longitud: -73.75, tipo_residuo: 'Residuos cítricos', oferta_t: 11.0 },
  { id: 'EMP-17', nombre: 'Palma del Upía', ubicacion: 'Cumaral (Sector Caney)', latitud: 4.31, longitud: -73.45, tipo_residuo: 'Palma de aceite', oferta_t: 20.0 },
  { id: 'EMP-18', nombre: 'Agropecuaria Puerto Rico', ubicacion: 'Puerto Rico (Vereda San Rafael)', latitud: 2.94, longitud: -73.41, tipo_residuo: 'Cascarilla de arroz', oferta_t: 15.0 },
  { id: 'EMP-19', nombre: 'Cacaoteros de Mesetas', ubicacion: 'Mesetas (Vereda La Argentina)', latitud: 3.38, longitud: -74.05, tipo_residuo: 'Cacao y derivados', oferta_t: 7.0 },
  { id: 'EMP-20', nombre: 'Forestal Mapiripán', ubicacion: 'Mapiripán (Sector Palmeras)', latitud: 2.89, longitud: -72.13, tipo_residuo: 'Forestal maderable', oferta_t: 18.0 },
  { id: 'EMP-21', nombre: 'Agropecuaria El Castillo', ubicacion: 'El Castillo (Vía Medellín del Ariari)', latitud: 3.56, longitud: -73.80, tipo_residuo: 'Cascarilla de arroz', oferta_t: 12.0 },
  { id: 'EMP-22', nombre: 'Platanera El Dorado', ubicacion: 'El Dorado (Sector La Meseta)', latitud: 3.73, longitud: -73.83, tipo_residuo: 'Residuos cítricos', oferta_t: 8.0 },
  { id: 'EMP-23', nombre: 'Agroindustrial San Carlos', ubicacion: 'Guamal (Vereda Montecristo)', latitud: 3.85, longitud: -73.74, tipo_residuo: 'Palma de aceite', oferta_t: 17.0 },
  { id: 'EMP-24', nombre: 'BioPalma Altillanura', ubicacion: 'Puerto Gaitán (Sector Rubiales)', latitud: 4.15, longitud: -71.95, tipo_residuo: 'Palma de aceite', oferta_t: 26.0 },
  { id: 'EMP-25', nombre: 'Arrocera Puerto Concordia', ubicacion: 'Puerto Concordia (Sector Central)', latitud: 2.62, longitud: -72.76, tipo_residuo: 'Cascarilla de arroz', oferta_t: 14.0 },
  { id: 'EMP-26', nombre: 'Cacao Orgánico San Juanito', ubicacion: 'San Juanito (Cordillera Oriental)', latitud: 4.45, longitud: -73.67, tipo_residuo: 'Cacao y derivados', oferta_t: 6.0 },
  { id: 'EMP-27', nombre: 'Silvopastoril San Martín', ubicacion: 'San Martín (Vereda Iracá)', latitud: 3.65, longitud: -73.65, tipo_residuo: 'Estiércol y pecuario', oferta_t: 9.0 },
  { id: 'EMP-28', nombre: 'Agroforestal Apiay', ubicacion: 'Villavicencio (Corredor Apiay)', latitud: 4.08, longitud: -73.54, tipo_residuo: 'Forestal maderable', oferta_t: 12.0 },
  { id: 'EMP-29', nombre: 'Agropecuaria Caño Cristales', ubicacion: 'La Macarena (Sector Guayabero)', latitud: 2.18, longitud: -73.78, tipo_residuo: 'Biomasa Mixta', oferta_t: 10.0 },
  { id: 'EMP-30', nombre: 'Palmera Manacacías', ubicacion: 'Puerto Gaitán (Sector Manacacías)', latitud: 4.20, longitud: -72.10, tipo_residuo: 'Palma de aceite', oferta_t: 24.0 }
];

// 8 Plantas procesadoras en nodos estratégicos del Meta
export const PLANTAS_META_8 = [
  { id: 'PLA-01', nombre: 'Planta Villavicencio', ubicacion: 'Villavicencio (Zona Industrial Catama)', latitud: 4.15, longitud: -73.61, capacidad_maxima_t: 70.0, tipos_residuos_compatibles: ['Palma', 'Arroz', 'Cítricos', 'Cacao', 'Forestal'] },
  { id: 'PLA-02', nombre: 'Planta Restrepo', ubicacion: 'Restrepo (Corredor vial Piedemonte)', latitud: 4.26, longitud: -73.56, capacidad_maxima_t: 45.0, tipos_residuos_compatibles: ['Palma', 'Arroz', 'Forestal', 'Pecuario'] },
  { id: 'PLA-03', nombre: 'Planta Granada', ubicacion: 'Granada (Nodo Regional Ariari)', latitud: 3.54, longitud: -73.70, capacidad_maxima_t: 60.0, tipos_residuos_compatibles: ['Arroz', 'Cítricos', 'Palma', 'Pecuario'] },
  { id: 'PLA-04', nombre: 'Planta Puerto Gaitán', ubicacion: 'Puerto Gaitán (Carretera Puerto López-Gaitán)', latitud: 4.31, longitud: -72.08, capacidad_maxima_t: 65.0, tipos_residuos_compatibles: ['Palma', 'Arroz', 'Forestal'] },
  { id: 'PLA-05', nombre: 'Planta Acacías', ubicacion: 'Acacías (Nodo Agroindustrial Oro Negro)', latitud: 3.98, longitud: -73.76, capacidad_maxima_t: 55.0, tipos_residuos_compatibles: ['Palma', 'Arroz', 'Forestal', 'Pecuario'] },
  { id: 'PLA-06', nombre: 'Planta San Martín', ubicacion: 'San Martín (Nodo Regional Camoa)', latitud: 3.68, longitud: -73.69, capacidad_maxima_t: 45.0, tipos_residuos_compatibles: ['Arroz', 'Pecuario', 'Cítricos'] },
  { id: 'PLA-07', nombre: 'Planta Puerto López', ubicacion: 'Puerto López (Puerto Fluvial Río Meta)', latitud: 4.08, longitud: -72.95, capacidad_maxima_t: 50.0, tipos_residuos_compatibles: ['Palma', 'Arroz', 'Forestal'] },
  { id: 'PLA-08', nombre: 'Planta Cumaral', ubicacion: 'Cumaral (Sector Guacavía - Upía)', latitud: 4.27, longitud: -73.48, capacidad_maxima_t: 40.0, tipos_residuos_compatibles: ['Palma', 'Cacao', 'Cítricos'] }
];

// Matriz de distancias base para ESC-01 (10 x 4)
const DISTANCIAS_10x4 = [
  [27.5, 41.2, 62.0, 148.0],
  [64.0, 78.5, 32.0, 185.0],
  [22.0, 14.5, 108.0, 115.0],
  [88.5, 102.0, 18.0, 210.0],
  [76.0, 90.0, 8.5, 198.0],
  [9.5, 23.0, 84.0, 126.0],
  [48.0, 62.0, 51.0, 169.0],
  [82.0, 96.0, 165.0, 42.0],
  [42.0, 56.0, 48.0, 163.0],
  [112.0, 104.0, null, 78.0]
];

function generarRutasEscenario(empresas, plantas, distanciasMatriz = null, tarifaBase = 300.0) {
  const rutas = [];
  empresas.forEach((emp, i) => {
    plantas.forEach((pla, j) => {
      const rutaId = `${emp.id}->${pla.id}`;
      let distKm = distanciasMatriz ? distanciasMatriz[i]?.[j] : null;

      if (distKm === undefined || distKm === null) {
        if (distanciasMatriz && emp.id === 'EMP-10' && pla.id === 'PLA-03') {
          // Ruta no transitable
          rutas.push({
            id: rutaId,
            empresa_id: emp.id,
            planta_id: pla.id,
            distancia_km: null,
            proveedor_vial: 'OSRM (provisional)',
            geometria: [],
            estado_calculo: 'sin_ruta',
            tarifa_t_km: tarifaBase,
            costo_unitario_t: null,
            activa: false,
            compatible: false
          });
          return;
        }
        // Distancia vial estimada en el Meta
        const dLat = Math.abs(emp.latitud - pla.latitud);
        const dLon = Math.abs(emp.longitud - pla.longitud);
        const distEucl = Math.sqrt(dLat * dLat + (dLon * 0.998) * (dLon * 0.998)) * 111.0;
        distKm = Math.max(9.5, Math.round(distEucl * 1.32 * 10) / 10);
      }

      const costoUnit = Math.round(distKm * tarifaBase);
      rutas.push({
        id: rutaId,
        empresa_id: emp.id,
        planta_id: pla.id,
        distancia_km: distKm,
        proveedor_vial: 'OSRM (provisional)',
        geometria: [
          [emp.longitud, emp.latitud],
          [pla.longitud, pla.latitud]
        ],
        estado_calculo: 'calculada',
        tarifa_t_km: tarifaBase,
        costo_unitario_t: costoUnit,
        activa: true,
        compatible: true
      });
    });
  });
  return rutas;
}

// 1. ESC-01: Caso de referencia (10 x 4)
const empresasEsc01 = EMPRESAS_META_30.slice(0, 10).map(e => ({ ...e }));
const plantasEsc01 = [
  { ...PLANTAS_META_8[0], capacidad_maxima_t: 45.0 },
  { ...PLANTAS_META_8[1], capacidad_maxima_t: 25.0 },
  { ...PLANTAS_META_8[2], capacidad_maxima_t: 35.0 },
  { ...PLANTAS_META_8[3], capacidad_maxima_t: 30.0 }
];
const rutasEsc01 = generarRutasEscenario(empresasEsc01, plantasEsc01, DISTANCIAS_10x4);

export const ESCENARIO_01 = {
  id: 'ESC-01',
  nombre: 'Caso de referencia',
  descripcion: 'Escenario base oficial con 10 empresas y 4 plantas en el Meta',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: 115.0,
  capacidad_total_t: 135.0,
  aviso_capacidad: false,
  empresas: empresasEsc01,
  plantas: plantasEsc01,
  rutas: rutasEsc01
};

// 2. ESC-02: Expansión de Oferta (+10%)
const empresasEsc02 = empresasEsc01.map(e => ({
  ...e,
  oferta_t: Math.round(e.oferta_t * 1.10 * 10) / 10
}));
const plantasEsc02 = plantasEsc01.map(p => ({ ...p }));
const rutasEsc02 = generarRutasEscenario(empresasEsc02, plantasEsc02, DISTANCIAS_10x4, 300.0);
const ofertaTot02 = empresasEsc02.reduce((s, e) => s + e.oferta_t, 0); // 126.5 t
const capTot02 = plantasEsc02.reduce((s, p) => s + p.capacidad_maxima_t, 0); // 135.0 t

export const ESCENARIO_02 = {
  id: 'ESC-02',
  nombre: 'Expansión de Oferta (+10%)',
  descripcion: 'Incremento general del 10% en residuos generados por el sector agroindustrial',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: ofertaTot02,
  capacidad_total_t: capTot02,
  aviso_capacidad: false,
  empresas: empresasEsc02,
  plantas: plantasEsc02,
  rutas: rutasEsc02
};

// 3. ESC-03: Tarifas Combustible (+15%)
const empresasEsc03 = empresasEsc01.map(e => ({ ...e }));
const plantasEsc03 = plantasEsc01.map(p => ({ ...p }));
const rutasEsc03 = generarRutasEscenario(empresasEsc03, plantasEsc03, DISTANCIAS_10x4, 345.0);
const ofertaTot03 = empresasEsc03.reduce((s, e) => s + e.oferta_t, 0); // 115.0 t
const capTot03 = plantasEsc03.reduce((s, p) => s + p.capacidad_maxima_t, 0); // 135.0 t

export const ESCENARIO_03 = {
  id: 'ESC-03',
  nombre: 'Tarifas Combustible (+15%)',
  descripcion: 'Alza de fletes y combustible a 345 COP/t·km sobre la red de transporte',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: ofertaTot03,
  capacidad_total_t: capTot03,
  aviso_capacidad: false,
  empresas: empresasEsc03,
  plantas: plantasEsc03,
  rutas: rutasEsc03
};

// 2. ESC-AMP-30x8: Red Ampliada (30 x 8)
const empresasEsc30x8 = EMPRESAS_META_30.map(e => ({ ...e }));
const plantasEsc30x8 = PLANTAS_META_8.map(p => ({ ...p }));
const rutasEsc30x8 = generarRutasEscenario(empresasEsc30x8, plantasEsc30x8);
const ofertaTot30x8 = empresasEsc30x8.reduce((s, e) => s + e.oferta_t, 0);
const capTot30x8 = plantasEsc30x8.reduce((s, p) => s + p.capacidad_maxima_t, 0);

export const ESCENARIO_AMP_30x8 = {
  id: 'ESC-AMP-30x8',
  nombre: 'Red Ampliada (30 Empresas x 8 Plantas)',
  descripcion: 'Red logística expandida en 14 municipios del departamento del Meta',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: ofertaTot30x8,
  capacidad_total_t: capTot30x8,
  aviso_capacidad: false,
  empresas: empresasEsc30x8,
  plantas: plantasEsc30x8,
  rutas: rutasEsc30x8
};

// 3. ESC-04: Exceso de Oferta (Inviable: 120 t > 100 t)
const empresasEsc04 = empresasEsc01.map(e => e.id === 'EMP-09' ? { ...e, oferta_t: 10.0 } : { ...e });
const plantasEsc04 = [
  { ...plantasEsc01[0], capacidad_maxima_t: 30.0 },
  { ...plantasEsc01[1], capacidad_maxima_t: 20.0 },
  { ...plantasEsc01[2], capacidad_maxima_t: 30.0 },
  { ...plantasEsc01[3], capacidad_maxima_t: 20.0 }
];
const rutasEsc04 = generarRutasEscenario(empresasEsc04, plantasEsc04, DISTANCIAS_10x4);

export const ESCENARIO_04 = {
  id: 'ESC-04',
  nombre: 'Exceso de Oferta',
  descripcion: 'Escenario inviable de prueba con oferta semanal superior a capacidad',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: 120.0,
  capacidad_total_t: 100.0,
  aviso_capacidad: true,
  empresas: empresasEsc04,
  plantas: plantasEsc04,
  rutas: rutasEsc04
};

// 4. ESC-AMP-20x6: Red Mediana (20 x 6)
const empresasEsc20x6 = EMPRESAS_META_30.slice(0, 20).map(e => ({ ...e }));
const plantasEsc20x6 = PLANTAS_META_8.slice(0, 6).map(p => ({ ...p }));
const rutasEsc20x6 = generarRutasEscenario(empresasEsc20x6, plantasEsc20x6);
const ofertaTot20x6 = empresasEsc20x6.reduce((s, e) => s + e.oferta_t, 0);
const capTot20x6 = plantasEsc20x6.reduce((s, p) => s + p.capacidad_maxima_t, 0);

export const ESCENARIO_AMP_20x6 = {
  id: 'ESC-AMP-20x6',
  nombre: 'Red Mediana (20 Empresas x 6 Plantas)',
  descripcion: 'Escenario intermedio de escalabilidad con 20 nodos generadores y 6 plantas',
  horizonte_temporal: 'Una semana simulada',
  moneda: 'COP',
  oferta_total_t: ofertaTot20x6,
  capacidad_total_t: capTot20x6,
  aviso_capacidad: false,
  empresas: empresasEsc20x6,
  plantas: plantasEsc20x6,
  rutas: rutasEsc20x6
};

// Puntos investigados. Las cantidades se dejan en 0 porque no hay oferta ni
// capacidad semanal vigente verificable; este escenario sirve para ubicar nodos.
export const ESCENARIO_UBICACIONES_VERIFICADAS = {
  id: 'ESC-UBICACIONES',
  nombre: 'Ubicaciones investigadas (sin volúmenes)',
  descripcion: 'Puntos reales del Meta; relaciones históricas documentadas, sin cantidades operativas verificadas',
  procedencia_datos: 'Puntos reales del Meta; relaciones históricas documentadas, sin cantidades operativas verificadas',
  periodo: 'Sin periodo operativo definido',
  horizonte_temporal: 'Sin periodo operativo definido',
  moneda: 'COP',
  oferta_total_t: 0,
  capacidad_total_t: 0,
  aviso_capacidad: false,
  empresas: [
    { id: 'EMP-01', nombre: 'Cemerca / Llanabastos', ubicacion: 'Central de Abastos, Anillo Vial, Villavicencio, Meta', latitud: 4.121478, longitud: -73.611342, tipo_residuo: 'Residuos orgánicos de plaza de mercado', oferta_t: 0 },
    { id: 'EMP-02', nombre: 'Friogan, planta Villavicencio', ubicacion: 'Km 8 vía Caños Negros–Catama, Villavicencio, Meta', latitud: 4.131304, longitud: -73.556356, tipo_residuo: 'Residuos orgánicos (tipo no especificado)', oferta_t: 0 }
  ],
  plantas: [
    { id: 'PLA-01', nombre: 'Bioagrícola del Llano, planta de compostaje PER', ubicacion: 'Parque Ecológico Reciclante, km 18 vía Puerto Porfía, vereda San Juan Bosco, Villavicencio, Meta', latitud: 4.133919, longitud: -73.435438, capacidad_maxima_t: 0, residuos_admitidos: ['Orgánicos de plaza de mercado', 'Residuos vegetales de poda', 'Orgánicos de Friogan'] },
    { id: 'PLA-02', nombre: 'Extractora San Sebastiano, compostaje', ubicacion: 'Planta extractora, km 38 vía Rubiales y desvío hacia Planas, Puerto Gaitán, Meta', latitud: 4.098602, longitud: -71.915800, capacidad_maxima_t: 0, residuos_admitidos: ['Residuos orgánicos de la extracción de palma'] }
  ],
  // Sin rutas activas: las fuentes no publican contratos, volúmenes ni tarifas vigentes.
  rutas: []
};

export const CATALOGO_ESCENARIOS_SEMILLA = [
  ESCENARIO_01,
  ESCENARIO_02,
  ESCENARIO_03,
  ESCENARIO_AMP_30x8,
  ESCENARIO_04,
  ESCENARIO_AMP_20x6,
  ESCENARIO_UBICACIONES_VERIFICADAS
];
