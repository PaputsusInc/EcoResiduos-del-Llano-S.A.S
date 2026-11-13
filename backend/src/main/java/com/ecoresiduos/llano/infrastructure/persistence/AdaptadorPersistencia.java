package com.ecoresiduos.llano.infrastructure.persistence;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Empresa;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PasoMetodoExacto;
import com.ecoresiduos.llano.domain.model.Planta;
import com.ecoresiduos.llano.domain.model.PrecioSombraDual;
import com.ecoresiduos.llano.domain.model.RegistroGeneracionAG;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.domain.model.Ruta;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AdaptadorPersistencia implements IPuertoRepositorioEscenarios {

    private final Map<String, Escenario> escenarios_memoria = new ConcurrentHashMap<>();
    private final Map<String, ResultadoOptimizacion> resultados_memoria = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ecoresiduos.escenarios.directorio:data/escenarios}")
    private String directorioEscenarios = "data/escenarios";

    // Catálogo de 30 empresas contextualizadas en el departamento del Meta
    private static final List<EmpresaDef> EMPRESAS_META = List.of(
            new EmpresaDef("EMP-01", "Palmeras del Llano", "Acacías (Vía San Carlos)", 3.99, -73.77, "Palma de aceite", 25.0),
            new EmpresaDef("EMP-02", "Agropecuaria San Martín", "San Martín (Vereda Camoa)", 3.69, -73.70, "Cascarilla de arroz", 15.0),
            new EmpresaDef("EMP-03", "Hacienda La Cabaña", "Cumaral (Sector Guacavía)", 4.27, -73.49, "Palma de aceite", 18.0),
            new EmpresaDef("EMP-04", "Arrocera del Ariari", "Fuente de Oro (Troncal Llano)", 3.46, -73.62, "Cascarilla de arroz", 12.0),
            new EmpresaDef("EMP-05", "Frutales y Cítricos Meta", "Granada (Vía Lejanías)", 3.55, -73.70, "Residuos cítricos", 8.0),
            new EmpresaDef("EMP-06", "BioCacao de la Sierra", "Villavicencio (Vía antigua)", 4.142, -73.626, "Cacao y derivados", 6.0),
            new EmpresaDef("EMP-07", "AgroForestal La Esperanza", "Castilla la Nueva (Vereda Cacayal)", 3.83, -73.69, "Forestal maderable", 10.0),
            new EmpresaDef("EMP-08", "Plantaciones San Rafael", "Puerto López (km 24)", 4.09, -72.96, "Palma de aceite", 11.0),
            new EmpresaDef("EMP-09", "Ganadería Sostenible Guamal", "Guamal (Vía San Martín)", 3.88, -73.77, "Estiércol y pecuario", 5.0),
            new EmpresaDef("EMP-10", "Agropecuaria Cabuyaro", "Cabuyaro (Margen río Meta)", 4.28, -72.79, "Cascarilla de arroz", 5.0),
            new EmpresaDef("EMP-11", "Cítricos del Ariari", "Lejanías (Vereda La Cristalina)", 3.52, -74.02, "Residuos cítricos", 14.0),
            new EmpresaDef("EMP-12", "Palma Real de Casanare-Meta", "Barranca de Upía (Sector Central)", 4.57, -72.97, "Palma de aceite", 22.0),
            new EmpresaDef("EMP-13", "Arroces del Piedemonte", "Restrepo (Vereda Salinas)", 4.25, -73.57, "Cascarilla de arroz", 16.0),
            new EmpresaDef("EMP-14", "Biomasa del Guayabero", "San Juan de Arama (Vía Mesetas)", 3.38, -73.88, "Forestal maderable", 9.0),
            new EmpresaDef("EMP-15", "Agropecuaria Puerto Lleras", "Puerto Lleras (Margen Río Ariari)", 3.28, -73.37, "Cascarilla de arroz", 13.0),
            new EmpresaDef("EMP-16", "Frutales de Vista Hermosa", "Vista Hermosa (Sector Caño Blanco)", 3.12, -73.75, "Residuos cítricos", 11.0),
            new EmpresaDef("EMP-17", "Palma del Upía", "Cumaral (Sector Caney)", 4.31, -73.45, "Palma de aceite", 20.0),
            new EmpresaDef("EMP-18", "Agropecuaria Puerto Rico", "Puerto Rico (Vereda San Rafael)", 2.94, -73.41, "Cascarilla de arroz", 15.0),
            new EmpresaDef("EMP-19", "Cacaoteros de Mesetas", "Mesetas (Vereda La Argentina)", 3.38, -74.05, "Cacao y derivados", 7.0),
            new EmpresaDef("EMP-20", "Forestal Mapiripán", "Mapiripán (Sector Palmeras)", 2.89, -72.13, "Forestal maderable", 18.0),
            new EmpresaDef("EMP-21", "Agropecuaria El Castillo", "El Castillo (Vía Medellín del Ariari)", 3.56, -73.80, "Cascarilla de arroz", 12.0),
            new EmpresaDef("EMP-22", "Platanera El Dorado", "El Dorado (Sector La Meseta)", 3.73, -73.83, "Residuos cítricos", 8.0),
            new EmpresaDef("EMP-23", "Agroindustrial San Carlos", "Guamal (Vereda Montecristo)", 3.85, -73.74, "Palma de aceite", 17.0),
            new EmpresaDef("EMP-24", "BioPalma Altillanura", "Puerto Gaitán (Sector Rubiales)", 4.15, -71.95, "Palma de aceite", 26.0),
            new EmpresaDef("EMP-25", "Arrocera Puerto Concordia", "Puerto Concordia (Sector Central)", 2.62, -72.76, "Cascarilla de arroz", 14.0),
            new EmpresaDef("EMP-26", "Cacao Orgánico San Juanito", "San Juanito (Cordillera Oriental)", 4.45, -73.67, "Cacao y derivados", 6.0),
            new EmpresaDef("EMP-27", "Silvopastoril San Martín", "San Martín (Vereda Iracá)", 3.65, -73.65, "Estiércol y pecuario", 9.0),
            new EmpresaDef("EMP-28", "Agroforestal Apiay", "Villavicencio (Corredor Apiay)", 4.08, -73.54, "Forestal maderable", 12.0),
            new EmpresaDef("EMP-29", "Agropecuaria Caño Cristales", "La Macarena (Sector Guayabero)", 2.18, -73.78, "Biomasa Mixta", 10.0),
            new EmpresaDef("EMP-30", "Palmera Manacacías", "Puerto Gaitán (Sector Manacacías)", 4.20, -72.10, "Palma de aceite", 24.0)
    );

    // Catálogo de 8 plantas procesadoras en nodos estratégicos del Meta
    private static final List<PlantaDef> PLANTAS_META = List.of(
            new PlantaDef("PLA-01", "Planta Villavicencio", "Villavicencio (Zona Industrial Catama)", 4.15, -73.61, 70.0,
                    List.of("Palma", "Arroz", "Cítricos", "Cacao", "Forestal")),
            new PlantaDef("PLA-02", "Planta Restrepo", "Restrepo (Corredor vial Piedemonte)", 4.26, -73.56, 45.0,
                    List.of("Palma", "Arroz", "Forestal", "Pecuario")),
            new PlantaDef("PLA-03", "Planta Granada", "Granada (Nodo Regional Ariari)", 3.54, -73.70, 60.0,
                    List.of("Arroz", "Cítricos", "Palma", "Pecuario")),
            new PlantaDef("PLA-04", "Planta Puerto Gaitán", "Puerto Gaitán (Carretera Puerto López-Gaitán)", 4.31, -72.08, 65.0,
                    List.of("Palma", "Arroz", "Forestal")),
            new PlantaDef("PLA-05", "Planta Acacías", "Acacías (Nodo Agroindustrial Oro Negro)", 3.98, -73.76, 55.0,
                    List.of("Palma", "Arroz", "Forestal", "Pecuario")),
            new PlantaDef("PLA-06", "Planta San Martín", "San Martín (Nodo Regional Camoa)", 3.68, -73.69, 45.0,
                    List.of("Arroz", "Pecuario", "Cítricos")),
            new PlantaDef("PLA-07", "Planta Puerto López", "Puerto López (Puerto Fluvial Río Meta)", 4.08, -72.95, 50.0,
                    List.of("Palma", "Arroz", "Forestal")),
            new PlantaDef("PLA-08", "Planta Cumaral", "Cumaral (Sector Guacavía - Upía)", 4.27, -73.48, 40.0,
                    List.of("Palma", "Cacao", "Cítricos"))
    );

    @PostConstruct
    public void cargar_datos_semilla() {
        // 1. Escenario Base Oficial: ESC-01 (Caso de referencia, Z* = 997.500 COP)
        Escenario esc01 = construirEscenario01();
        escenarios_memoria.put(esc01.getId(), esc01);

        // 2. Escenario Expansión de Oferta (+10%): ESC-02 (Oferta 126.5 t / Capacidad 135.0 t)
        Escenario esc02 = construirEscenario02(esc01);
        escenarios_memoria.put(esc02.getId(), esc02);

        // 3. Escenario Tarifas Combustible (+15%): ESC-03 (Tarifa 345 COP/t·km)
        Escenario esc03 = construirEscenario03(esc01);
        escenarios_memoria.put(esc03.getId(), esc03);

        // 4. Escenario Inviable de Prueba: ESC-04 (Exceso de oferta 120 t > 100 t)
        Escenario esc04 = construirEscenario04(esc01);
        escenarios_memoria.put(esc04.getId(), esc04);

        // 5. Escenarios Ampliados de Escalabilidad: ESC-AMP-20x6 y ESC-AMP-30x8 (HU-17)
        Escenario esc20x6 = construirEscenarioAmpliado("ESC-AMP-20x6", "Red Mediana (20 Empresas x 6 Plantas)", 20, 6);
        escenarios_memoria.put(esc20x6.getId(), esc20x6);

        Escenario esc30x8 = construirEscenarioAmpliado("ESC-AMP-30x8", "Red Ampliada (30 Empresas x 8 Plantas)", 30, 8);
        escenarios_memoria.put(esc30x8.getId(), esc30x8);

        // Catálogo geográfico investigado, aislado de los casos simulados.
        Escenario ubicaciones = construirEscenarioUbicacionesVerificadas();
        escenarios_memoria.put(ubicaciones.getId(), ubicaciones);

        cargarEscenariosGuardados();

        // 4. Ejecuciones Semilla de Referencia para ESC-01
        ResultadoOptimizacion eje01 = construirResultadoExactoEJE01(esc01);
        resultados_memoria.put(eje01.getId(), eje01);

        ResultadoOptimizacion eje02 = construirResultadoAgEJE02(esc01);
        resultados_memoria.put(eje02.getId(), eje02);

        // 5. Ejecución Semilla Inviable para ESC-04
        ResultadoOptimizacion eje04 = new ResultadoOptimizacion(
                "EJE-04", "ESC-04", "EXACTO", "INFACTIBLE_CERTIFICADO",
                "Capacidad superada por la oferta",
                "La oferta total (120.0 t/semana) supera la capacidad instalada agregada (100.0 t/semana)",
                null, 0.015, Collections.emptyMap()
        );
        resultados_memoria.put(eje04.getId(), eje04);
    }

    private Escenario construirEscenarioUbicacionesVerificadas() {
        Escenario esc = new Escenario("ESC-UBICACIONES", "Ubicaciones investigadas (sin volúmenes)",
                "Sin periodo operativo definido", "COP",
                "Puntos reales del Meta; relaciones históricas documentadas, sin cantidades operativas verificadas");
        esc.getEmpresas().add(new Empresa("EMP-01", "Cemerca / Llanabastos",
                "Central de Abastos, Anillo Vial, Villavicencio, Meta",
                4.121478, -73.611342, "Residuos orgánicos de plaza de mercado", 0.0));
        esc.getEmpresas().add(new Empresa("EMP-02", "Friogan, planta Villavicencio",
                "Km 8 vía Caños Negros–Catama, Villavicencio, Meta",
                4.131304, -73.556356, "Residuos orgánicos (tipo no especificado)", 0.0));
        esc.getPlantas().add(new Planta("PLA-01", "Bioagrícola del Llano, planta de compostaje PER",
                "Parque Ecológico Reciclante, km 18 vía Puerto Porfía, vereda San Juan Bosco, Villavicencio, Meta",
                4.133919, -73.435438, 0.0,
                List.of("Orgánicos de plaza de mercado", "Residuos vegetales de poda", "Orgánicos de Friogan")));
        esc.getPlantas().add(new Planta("PLA-02", "Extractora San Sebastiano, compostaje",
                "Planta extractora, km 38 vía Rubiales y desvío hacia Planas, Puerto Gaitán, Meta",
                4.098602, -71.915800, 0.0,
                List.of("Residuos orgánicos de la extracción de palma")));
        // No se generan rutas operativas sin oferta, capacidad ni transporte vigente acreditado.
        esc.calcular_totales_red();
        return esc;
    }

    private Escenario construirEscenario01() {
        Escenario esc = new Escenario("ESC-01", "Caso de referencia", "Una semana simulada", "COP",
                "Empresas ficticias contextualizadas en el Meta");

        // 10 Empresas Oficiales
        esc.getEmpresas().add(new Empresa("EMP-01", "Palmeras del Llano", "Acacías (Vía San Carlos)", 3.99, -73.77, "Palma de aceite", 25.0));
        esc.getEmpresas().add(new Empresa("EMP-02", "Agropecuaria San Martín", "San Martín (Vereda Camoa)", 3.69, -73.70, "Cascarilla de arroz", 15.0));
        esc.getEmpresas().add(new Empresa("EMP-03", "Hacienda La Cabaña", "Cumaral (Sector Guacavía)", 4.27, -73.49, "Palma de aceite", 18.0));
        esc.getEmpresas().add(new Empresa("EMP-04", "Arrocera del Ariari", "Fuente de Oro (Troncal Llano)", 3.46, -73.62, "Cascarilla de arroz", 12.0));
        esc.getEmpresas().add(new Empresa("EMP-05", "Frutales y Cítricos Meta", "Granada (Vía Lejanías)", 3.55, -73.70, "Residuos cítricos", 8.0));
        esc.getEmpresas().add(new Empresa("EMP-06", "BioCacao de la Sierra", "Villavicencio (Vía antigua)", 4.142, -73.626, "Cacao y derivados", 6.0));
        esc.getEmpresas().add(new Empresa("EMP-07", "AgroForestal La Esperanza", "Castilla la Nueva (Vereda Cacayal)", 3.83, -73.69, "Forestal maderable", 10.0));
        esc.getEmpresas().add(new Empresa("EMP-08", "Plantaciones San Rafael", "Puerto López (km 24)", 4.09, -72.96, "Palma de aceite", 11.0));
        esc.getEmpresas().add(new Empresa("EMP-09", "Ganadería Sostenible Guamal", "Guamal (Vía San Martín)", 3.88, -73.77, "Estiércol y pecuario", 5.0));
        esc.getEmpresas().add(new Empresa("EMP-10", "Agropecuaria Cabuyaro", "Cabuyaro (Margen río Meta)", 4.28, -72.79, "Cascarilla de arroz", 5.0));

        // 4 Plantas Oficiales
        esc.getPlantas().add(new Planta("PLA-01", "Planta Villavicencio", "Villavicencio (Zona Industrial Catama)", 4.15, -73.61, 45.0,
                Arrays.asList("Palma", "Arroz", "Cítricos", "Cacao", "Forestal")));
        esc.getPlantas().add(new Planta("PLA-02", "Planta Restrepo", "Restrepo (Corredor vial Piedemonte)", 4.26, -73.56, 25.0,
                Arrays.asList("Palma", "Arroz", "Forestal", "Pecuario")));
        esc.getPlantas().add(new Planta("PLA-03", "Planta Granada", "Granada (Nodo Regional Ariari)", 3.54, -73.70, 35.0,
                Arrays.asList("Arroz", "Cítricos", "Palma", "Pecuario")));
        esc.getPlantas().add(new Planta("PLA-04", "Planta Puerto Gaitán", "Puerto Gaitán (Carretera Puerto López-Gaitán)", 4.31, -72.08, 30.0,
                Arrays.asList("Palma", "Arroz", "Forestal")));

        // Matriz 10 x 4 de Distancias de hu_05_distancias_viales.html
        Double[][] distancias = {
                {27.5, 41.2, 62.0, 148.0}, // EMP-01
                {64.0, 78.5, 32.0, 185.0}, // EMP-02
                {22.0, 14.5, 108.0, 115.0}, // EMP-03
                {88.5, 102.0, 18.0, 210.0}, // EMP-04
                {76.0, 90.0, 8.5, 198.0},  // EMP-05
                {9.5, 23.0, 84.0, 126.0},   // EMP-06
                {48.0, 62.0, 51.0, 169.0}, // EMP-07
                {82.0, 96.0, 165.0, 42.0},  // EMP-08
                {42.0, 56.0, 48.0, 163.0}, // EMP-09
                {112.0, 104.0, null, 78.0}  // EMP-10 (PLA-03 es null/No disponible)
        };

        double tarifaBase = 300.0;

        for (int i = 0; i < esc.getEmpresas().size(); i++) {
            Empresa emp = esc.getEmpresas().get(i);
            for (int j = 0; j < esc.getPlantas().size(); j++) {
                Planta pla = esc.getPlantas().get(j);
                String rutaId = emp.getId() + "->" + pla.getId();
                Double d = distancias[i][j];

                if (d == null) {
                    Ruta rInactiva = new Ruta(rutaId, emp.getId(), pla.getId(), null, "OSRM (provisional)",
                            new ArrayList<>(), "sin_ruta", tarifaBase, null, false, false);
                    esc.getRutas().add(rInactiva);
                } else {
                    Double costoUnitario = d * tarifaBase;
                    List<List<Double>> geo = Arrays.asList(
                            Arrays.asList(emp.getLongitud(), emp.getLatitud()),
                            Arrays.asList(pla.getLongitud(), pla.getLatitud())
                    );
                    Ruta r = new Ruta(rutaId, emp.getId(), pla.getId(), d, "OSRM (provisional)",
                            geo, "calculada", tarifaBase, costoUnitario, true, true);
                    esc.getRutas().add(r);
                }
            }
        }

        esc.calcular_totales_red();
        esc.validar_balance_red();
        return esc;
    }

    private Escenario construirEscenario02(Escenario ref) {
        Escenario esc02 = ref.clonar_profundo("ESC-02", "Expansión de Oferta (+10%)");
        esc02.setProcedencia_datos("Incremento general del 10% en residuos generados por el sector agroindustrial");
        for (Empresa emp : esc02.getEmpresas()) {
            double nueva = Math.round(emp.getOferta_t() * 1.10 * 10.0) / 10.0;
            emp.setOferta_t(nueva);
        }
        esc02.calcular_totales_red();
        esc02.validar_balance_red();
        return esc02;
    }

    private Escenario construirEscenario03(Escenario ref) {
        Escenario esc03 = ref.clonar_profundo("ESC-03", "Tarifas Combustible (+15%)");
        esc03.setProcedencia_datos("Alza de fletes y combustible a 345 COP/t·km sobre la red de transporte");
        double tarifaNueva = 345.0;
        for (Ruta r : esc03.getRutas()) {
            r.setTarifa_t_km(tarifaNueva);
            if (r.getDistancia_km() != null) {
                r.setCosto_unitario_t((double) Math.round(r.getDistancia_km() * tarifaNueva));
            }
        }
        esc03.calcular_totales_red();
        esc03.validar_balance_red();
        return esc03;
    }

    private Escenario construirEscenario04(Escenario ref) {
        Escenario esc04 = ref.clonar_profundo("ESC-04", "Exceso de Oferta");
        // Ajustar ofertas para sumar 120.0 t
        esc04.actualizar_oferta_empresa("EMP-09", 10.0);

        // Reducir capacidades para sumar 100.0 t
        esc04.actualizar_capacidad_planta("PLA-01", 30.0);
        esc04.actualizar_capacidad_planta("PLA-02", 20.0);
        esc04.actualizar_capacidad_planta("PLA-03", 30.0);
        esc04.actualizar_capacidad_planta("PLA-04", 20.0);

        esc04.calcular_totales_red();
        esc04.validar_balance_red();
        return esc04;
    }

    private Escenario construirEscenarioAmpliado(String id, String nombre, int cantEmpresas, int cantPlantas) {
        Escenario ampliado = new Escenario(id, nombre, "Una semana simulada", "COP", "Escenario ampliado de escalabilidad en el Meta");

        int nEmp = Math.min(cantEmpresas, EMPRESAS_META.size());
        for (int i = 0; i < nEmp; i++) {
            EmpresaDef d = EMPRESAS_META.get(i);
            ampliado.getEmpresas().add(new Empresa(d.id, d.nombre, d.ubicacion, d.lat, d.lon, d.tipo, d.oferta));
        }

        int nPla = Math.min(cantPlantas, PLANTAS_META.size());
        for (int j = 0; j < nPla; j++) {
            PlantaDef p = PLANTAS_META.get(j);
            ampliado.getPlantas().add(new Planta(p.id, p.nombre, p.ubicacion, p.lat, p.lon, p.cap, p.compatibles));
        }

        double tarifaBase = 300.0;
        for (Empresa emp : ampliado.getEmpresas()) {
            for (Planta pla : ampliado.getPlantas()) {
                String rutaId = emp.getId() + "->" + pla.getId();
                // Cálculo de distancia vial estimada según coordenadas geográficas en Meta (~1.3 factor curvatura vial)
                double dLat = Math.abs(emp.getLatitud() - pla.getLatitud());
                double dLon = Math.abs(emp.getLongitud() - pla.getLongitud());
                double distEucl = Math.sqrt(dLat * dLat + (dLon * 0.998) * (dLon * 0.998)) * 111.0;
                double distKm = Math.max(9.5, Math.round(distEucl * 1.32 * 10.0) / 10.0);
                double costoUnitario = Math.round(distKm * tarifaBase);

                List<List<Double>> geo = Arrays.asList(
                        Arrays.asList(emp.getLongitud(), emp.getLatitud()),
                        Arrays.asList(pla.getLongitud(), pla.getLatitud())
                );

                Ruta r = new Ruta(rutaId, emp.getId(), pla.getId(), distKm, "OSRM (provisional)",
                        geo, "calculada", tarifaBase, costoUnitario, true, true);
                ampliado.getRutas().add(r);
            }
        }

        ampliado.calcular_totales_red();
        ampliado.validar_balance_red();
        return ampliado;
    }

    private ResultadoOptimizacion construirResultadoExactoEJE01(Escenario esc) {
        ResultadoOptimizacion res = new ResultadoOptimizacion(
                "EJE-01", "ESC-01", "EXACTO", "OPTIMO",
                "", "Óptimo certificado por MODI y Simplex/HiGHS cumpliendo todas las restricciones de oferta y capacidad",
                997500.0, 0.042, new LinkedHashMap<>()
        );

        Map<String, Double> flujos = res.getMatriz_flujos_optimos();
        flujos.put("EMP-01->PLA-01", 25.0);
        flujos.put("EMP-02->PLA-03", 15.0);
        flujos.put("EMP-03->PLA-02", 18.0);
        flujos.put("EMP-04->PLA-03", 12.0);
        flujos.put("EMP-05->PLA-03", 8.0);
        flujos.put("EMP-06->PLA-01", 5.0);
        flujos.put("EMP-06->PLA-02", 1.0);
        flujos.put("EMP-07->PLA-01", 10.0);
        flujos.put("EMP-08->PLA-04", 11.0);
        flujos.put("EMP-09->PLA-01", 5.0);
        flujos.put("EMP-10->PLA-04", 5.0);

        // Sensibilidad Dual (Precios Sombra y Rangos de Optimalidad)
        List<PrecioSombraDual> duales = res.getSensibilidad_dual();
        duales.add(new PrecioSombraDual("EJE-01", "PLA-01", "Capacidad de PLA-01", "PLA-01.capacidad_maxima_t", 45.0, -4050.0, 0.0, 1.0, 5.0, "40.0 t/semana", "46.0 t/semana"));
        duales.add(new PrecioSombraDual("EJE-01", "PLA-02", "Capacidad de PLA-02", "PLA-02.capacidad_maxima_t", 25.0, 0.0, 6.0, null, 6.0, "19.0 t/semana", "Sin límite"));
        duales.add(new PrecioSombraDual("EJE-01", "PLA-03", "Capacidad de PLA-03", "PLA-03.capacidad_maxima_t", 35.0, -7200.0, 0.0, 8.0, 12.0, "23.0 t/semana", "43.0 t/semana"));
        duales.add(new PrecioSombraDual("EJE-01", "PLA-04", "Capacidad de PLA-04", "PLA-04.capacidad_maxima_t", 30.0, 0.0, 14.0, null, 14.0, "16.0 t/semana", "Sin límite"));

        duales.add(new PrecioSombraDual("EJE-01", "EMP-01", "Oferta de EMP-01", "EMP-01.oferta_t", 25.0, 8250.0, 0.0, 5.0, 5.0, "20.0 t/semana", "30.0 t/semana"));
        duales.add(new PrecioSombraDual("EJE-01", "EMP-02", "Oferta de EMP-02", "EMP-02.oferta_t", 15.0, 9600.0, 0.0, 10.0, 5.0, "10.0 t/semana", "25.0 t/semana"));
        duales.add(new PrecioSombraDual("EJE-01", "EMP-03", "Oferta de EMP-03", "EMP-03.oferta_t", 18.0, 4350.0, 0.0, 6.0, 8.0, "10.0 t/semana", "24.0 t/semana"));

        // Pasos exactos oficiales de hu_19 (Vogel + MODI)
        List<PasoMetodoExacto> pasos = res.getPasos_exactos();
        pasos.add(new PasoMetodoExacto("EJE-01", 1, "PREPARACION", "Lectura de nodos, ofertas (115 t), capacidades (135 t) y costos. Balanceo con Auxiliar (20 t)",
                Map.of("oferta_total", 115.0, "capacidad_total", 135.0, "auxiliar_t", 20.0, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 2, "FORMULACION", "Construcción formal del modelo de transporte lineal",
                Map.of("variables", 39, "restricciones", 14, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 3, "RESOLUCION", "Vogel Paso 1: Mayor penalización en Fila EMP-04 (21.150 COP/t) -> asignar 12 t a EMP-04->PLA-03",
                Map.of("submetodo", "VOGEL", "penalizacion", 21150.0, "asignacion", "EMP-04->PLA-03", "toneladas", 12.0, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 4, "RESOLUCION", "Vogel completado. Solución básica inicial factible alcanzada con costo $ 1.052.550 COP",
                Map.of("submetodo", "VOGEL", "costo_intermedio", 1052550.0, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 5, "RESOLUCION", "MODI Iteración 1: Celda entrante Auxiliar->PLA-02 (d_ij = -16.050 COP/t, theta = 1 t). Nuevo costo: $ 1.036.500 COP",
                Map.of("submetodo", "MODI", "iteracion", 1, "costo", 1036500.0, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 6, "RESOLUCION", "MODI Iteración 2: Celda entrante EMP-10->PLA-04 (d_ij = -7.800 COP/t, theta = 5 t). Nuevo costo: $ 997.500 COP",
                Map.of("submetodo", "MODI", "iteracion", 2, "costo", 997500.0, "es_intermedio", true)));
        pasos.add(new PasoMetodoExacto("EJE-01", 7, "VALIDACION", "Verificación estricta: 10 de 10 ofertas completas, 4 de 4 capacidades respetadas. Óptimo confirmado: $ 997.500 COP",
                Map.of("ofertas_cumplidas", 10, "capacidades_cumplidas", 4, "costo_optimo", 997500.0, "es_intermedio", false)));

        return res;
    }

    private ResultadoOptimizacion construirResultadoAgEJE02(Escenario esc) {
        ResultadoOptimizacion res = new ResultadoOptimizacion(
                "EJE-02", "ESC-01", "AG", "FACTIBLE_SIN_CERTIFICAR",
                "", "Máximo de 200 generaciones alcanzado. Solución factible encontrada sin certificación de optimalidad",
                1045200.0, 0.385, new LinkedHashMap<>()
        );

        res.setParametros_usados(new ConfiguracionAG(100, 200, 0.80, 0.05, "TORNEO", 1000.0, 42));

        Map<String, Double> flujos = res.getMatriz_flujos_optimos();
        flujos.put("EMP-01->PLA-01", 25.0);
        flujos.put("EMP-02->PLA-03", 15.0);
        flujos.put("EMP-03->PLA-02", 18.0);
        flujos.put("EMP-04->PLA-03", 12.0);
        flujos.put("EMP-05->PLA-03", 8.0);
        flujos.put("EMP-06->PLA-01", 6.0);
        flujos.put("EMP-07->PLA-01", 10.0);
        flujos.put("EMP-08->PLA-04", 11.0);
        flujos.put("EMP-09->PLA-01", 4.0);
        flujos.put("EMP-09->PLA-03", 1.0);
        flujos.put("EMP-10->PLA-04", 5.0);

        List<RegistroGeneracionAG> hist = res.getHistorial_generaciones();
        hist.add(new RegistroGeneracionAG("EJE-02", 0, 1180000.0, 1180000.0, 78, 0.4587));
        hist.add(new RegistroGeneracionAG("EJE-02", 50, 1095000.0, 1095000.0, 95, 0.4773));
        hist.add(new RegistroGeneracionAG("EJE-02", 100, 1060000.0, 1060000.0, 98, 0.4854));
        hist.add(new RegistroGeneracionAG("EJE-02", 150, 1048000.0, 1048000.0, 99, 0.4882));
        hist.add(new RegistroGeneracionAG("EJE-02", 200, 1045200.0, 1045200.0, 100, 0.4889));

        res.setCurva_convergencia_fitness(Arrays.asList(0.4587, 0.4773, 0.4854, 0.4882, 0.4889));
        return res;
    }

    @Override
    public Escenario obtener_por_id(String escenario_id) {
        if (escenario_id == null) return null;
        return escenarios_memoria.get(escenario_id);
    }

    @Override
    public void guardar(Escenario escenario) {
        if (escenario != null && escenario.getId() != null) {
            if (escenario.getId().startsWith("SIM-")) {
                persistirEscenario(escenario);
            }
            escenarios_memoria.put(escenario.getId(), escenario);
        }
    }

    private void persistirEscenario(Escenario escenario) {
        if (!escenario.getId().matches("SIM-[a-f0-9-]{36}")) {
            throw new IllegalArgumentException("Identificador de escenario simulado inválido");
        }
        try {
            Path directorio = Path.of(directorioEscenarios);
            Files.createDirectories(directorio);
            Path temporal = Files.createTempFile(directorio, "escenario-", ".tmp");
            try {
                objectMapper.writeValue(temporal.toFile(), escenario);
                Files.move(temporal, directorio.resolve(escenario.getId() + ".json"),
                        StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporal);
            }
        } catch (IOException error) {
            throw new IllegalStateException("No se pudo guardar el escenario: " + error.getMessage(), error);
        }
    }

    private void cargarEscenariosGuardados() {
        Path directorio = Path.of(directorioEscenarios);
        if (!Files.isDirectory(directorio)) return;
        try (var archivos = Files.list(directorio)) {
            archivos.filter(path -> path.getFileName().toString().matches("SIM-[a-f0-9-]{36}\\.json"))
                    .forEach(path -> {
                        try {
                            Escenario escenario = objectMapper.readValue(path.toFile(), Escenario.class);
                            if ((escenario.getId() + ".json").equals(path.getFileName().toString())) {
                                escenarios_memoria.put(escenario.getId(), escenario);
                            }
                        } catch (IOException error) {
                            throw new IllegalStateException("No se pudo leer " + path, error);
                        }
                    });
        } catch (IOException error) {
            throw new IllegalStateException("No se pudieron cargar los escenarios guardados", error);
        }
    }

    @Override
    public void guardar_resultado(ResultadoOptimizacion resultado) {
        if (resultado != null && resultado.getId() != null) {
            resultados_memoria.put(resultado.getId(), resultado);
        }
    }

    @Override
    public ResultadoOptimizacion obtener_resultado_por_id(String ejecucion_id) {
        if (ejecucion_id == null) return null;
        return resultados_memoria.get(ejecucion_id);
    }

    @Override
    public List<Escenario> listar_escenarios() {
        List<Escenario> lista = new ArrayList<>(escenarios_memoria.values());
        List<String> ordenPref = List.of("ESC-01", "ESC-02", "ESC-03", "ESC-AMP-30x8", "ESC-04", "ESC-AMP-20x6", "ESC-UBICACIONES");
        lista.sort((a, b) -> {
            int idxA = ordenPref.indexOf(a.getId());
            int idxB = ordenPref.indexOf(b.getId());
            if (idxA != -1 && idxB != -1) return Integer.compare(idxA, idxB);
            if (idxA != -1) return -1;
            if (idxB != -1) return 1;
            return a.getId().compareTo(b.getId());
        });
        return lista;
    }

    @Override
    public List<ResultadoOptimizacion> listar_resultados() {
        return new ArrayList<>(resultados_memoria.values());
    }

    @Override
    public void simular_inconsistencia_demo(String escenario_id) {
        Escenario esc = escenarios_memoria.get(escenario_id != null ? escenario_id : "ESC-01");
        if (esc == null) return;

        // Inconsistencia 1: EMP-06 latitud fuera del rango permitido (-90 a 90)
        for (Empresa emp : esc.getEmpresas()) {
            if ("EMP-06".equals(emp.getId())) {
                emp.setLatitud(95.5);
                break;
            }
        }

        // Inconsistencia 2: Ruta EMP-03->PLA-02 costo unitario negativo
        for (Ruta r : esc.getRutas()) {
            if ("EMP-03->PLA-02".equals(r.getId())) {
                r.setCosto_unitario_t(-1200.0);
                break;
            }
        }

        // Inconsistencia 3: Ruta con referencia a planta inexistente PLA-99
        esc.getRutas().removeIf(r -> "EMP-08->PLA-99".equals(r.getId()));
        Ruta rutaInvalida = new Ruta("EMP-08->PLA-99", "EMP-08", "PLA-99", 42.0, "OSRM (provisional)",
                new ArrayList<>(), "error", 300.0, 12600.0, true, true);
        esc.getRutas().add(rutaInvalida);
    }

    @Override
    public void corregir_inconsistencias_demo(String escenario_id) {
        Escenario esc = escenarios_memoria.get(escenario_id != null ? escenario_id : "ESC-01");
        if (esc == null) return;

        // Corrección 1: Restaurar latitud oficial de EMP-06
        for (Empresa emp : esc.getEmpresas()) {
            if ("EMP-06".equals(emp.getId())) {
                emp.setLatitud(4.142);
                break;
            }
        }

        // Corrección 2: Restaurar costo unitario oficial de EMP-03->PLA-02
        for (Ruta r : esc.getRutas()) {
            if ("EMP-03->PLA-02".equals(r.getId())) {
                r.setCosto_unitario_t(4350.0);
                break;
            }
        }

        // Corrección 3: Remover ruta con referencia inexistente
        esc.getRutas().removeIf(r -> "EMP-08->PLA-99".equals(r.getId()) || "PLA-99".equals(r.getPlanta_id()));
    }

    private static class EmpresaDef {
        final String id, nombre, ubicacion, tipo;
        final double lat, lon, oferta;
        EmpresaDef(String id, String nombre, String ubicacion, double lat, double lon, String tipo, double oferta) {
            this.id = id; this.nombre = nombre; this.ubicacion = ubicacion;
            this.lat = lat; this.lon = lon; this.tipo = tipo; this.oferta = oferta;
        }
    }

    private static class PlantaDef {
        final String id, nombre, ubicacion;
        final double lat, lon, cap;
        final List<String> compatibles;
        PlantaDef(String id, String nombre, String ubicacion, double lat, double lon, double cap, List<String> compatibles) {
            this.id = id; this.nombre = nombre; this.ubicacion = ubicacion;
            this.lat = lat; this.lon = lon; this.cap = cap; this.compatibles = compatibles;
        }
    }
}
