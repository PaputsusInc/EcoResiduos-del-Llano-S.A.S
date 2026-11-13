package com.ecoresiduos.llano.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pruebas Unitarias del Núcleo de Dominio (Capa 4)")
class DomainModelUnitTest {

    private Escenario crearEscenarioReferencia() {
        Escenario esc = new Escenario("ESC-01", "Caso de referencia", "Una semana simulada", "COP", "Empresas ficticias contextualizadas en el Meta");

        // 10 empresas (ofertas: 25, 15, 18, 12, 8, 6, 10, 11, 5, 5 -> total 115.0 t/sem)
        esc.getEmpresas().add(new Empresa("EMP-01", "Palmeras del Llano", "Acacías", 3.99, -73.77, "Palma de aceite", 25.0));
        esc.getEmpresas().add(new Empresa("EMP-02", "Agropecuaria San Martín", "San Martín", 3.69, -73.70, "Cascarilla de arroz", 15.0));
        esc.getEmpresas().add(new Empresa("EMP-03", "Hacienda La Cabaña", "Cumaral", 4.27, -73.49, "Palma de aceite", 18.0));
        esc.getEmpresas().add(new Empresa("EMP-04", "Arrocera del Ariari", "Fuente de Oro", 3.46, -73.62, "Cascarilla de arroz", 12.0));
        esc.getEmpresas().add(new Empresa("EMP-05", "Frutales y Cítricos Meta", "Granada", 3.55, -73.70, "Residuos cítricos", 8.0));
        esc.getEmpresas().add(new Empresa("EMP-06", "BioCacao de la Sierra", "Villavicencio", 4.142, -73.626, "Cacao y derivados", 6.0));
        esc.getEmpresas().add(new Empresa("EMP-07", "AgroForestal La Esperanza", "Castilla la Nueva", 3.83, -73.69, "Forestal maderable", 10.0));
        esc.getEmpresas().add(new Empresa("EMP-08", "Plantaciones San Rafael", "Puerto López", 4.09, -72.96, "Palma de aceite", 11.0));
        esc.getEmpresas().add(new Empresa("EMP-09", "Ganadería Sostenible Guamal", "Guamal", 3.88, -73.77, "Estiércol y pecuario", 5.0));
        esc.getEmpresas().add(new Empresa("EMP-10", "Agropecuaria Cabuyaro", "Cabuyaro", 4.28, -72.79, "Cascarilla de arroz", 5.0));

        // 4 plantas (capacidades: 45, 25, 35, 30 -> total 135.0 t/sem)
        esc.getPlantas().add(new Planta("PLA-01", "Planta Villavicencio", "Villavicencio", 4.15, -73.61, 45.0));
        esc.getPlantas().add(new Planta("PLA-02", "Planta Restrepo", "Restrepo", 4.26, -73.56, 25.0));
        esc.getPlantas().add(new Planta("PLA-03", "Planta Granada", "Granada", 3.54, -73.70, 35.0));
        esc.getPlantas().add(new Planta("PLA-04", "Planta Puerto Gaitán", "Puerto Gaitán", 4.31, -72.08, 30.0));

        // Generar las 40 rutas de la red
        for (Empresa emp : esc.getEmpresas()) {
            for (Planta pla : esc.getPlantas()) {
                String rutaId = emp.getId() + "->" + pla.getId();
                if ("EMP-10->PLA-03".equals(rutaId)) {
                    // Ruta no disponible EMP-10 -> PLA-03
                    Ruta rInactiva = new Ruta(rutaId, emp.getId(), pla.getId(), null, "OSRM (provisional)",
                            new ArrayList<>(), "sin_ruta", 300.0, null, false, false);
                    esc.getRutas().add(rInactiva);
                } else if ("EMP-01->PLA-01".equals(rutaId)) {
                    Ruta r1 = new Ruta(rutaId, emp.getId(), pla.getId(), 27.5, "OSRM (provisional)",
                            Arrays.asList(Arrays.asList(-73.77, 3.99), Arrays.asList(-73.61, 4.15)), "calculada", 300.0, 8250.0, true, true);
                    esc.getRutas().add(r1);
                } else {
                    Ruta r = new Ruta(rutaId, emp.getId(), pla.getId(), 50.0, "OSRM (provisional)",
                            new ArrayList<>(), "calculada", 300.0, 15000.0, true, true);
                    esc.getRutas().add(r);
                }
            }
        }

        esc.calcular_totales_red();
        esc.validar_balance_red();
        return esc;
    }

    @Test
    @DisplayName("Debe calcular correctamente la oferta total (115.0 t) y capacidad total (135.0 t)")
    void testCalculoTotalesRed() {
        Escenario esc = crearEscenarioReferencia();
        assertEquals(115.0, esc.getOferta_total_t(), 1e-6, "La oferta total debe sumar 115.0 t/semana");
        assertEquals(135.0, esc.getCapacidad_total_t(), 1e-6, "La capacidad total debe sumar 135.0 t/semana");
        assertTrue(esc.validar_balance_red(), "El balance debe ser factible cuando oferta <= capacidad");
        assertEquals("", esc.getAviso_capacidad(), "El aviso debe estar vacío cuando la capacidad es suficiente");
    }

    @Test
    @DisplayName("Debe activar aviso normativo exacto cuando la oferta supera la capacidad (RF-11, DD-24)")
    void testAvisoCapacidadSuperada() {
        Escenario esc = crearEscenarioReferencia();
        // Aumentar oferta de EMP-01 en 30 t -> oferta total = 145.0 t > 135.0 t
        esc.actualizar_oferta_empresa("EMP-01", 55.0);

        assertEquals(145.0, esc.getOferta_total_t(), 1e-6);
        assertEquals(135.0, esc.getCapacidad_total_t(), 1e-6);
        assertFalse(esc.validar_balance_red(), "Debe retornar false cuando la oferta supera la capacidad");
        assertEquals("Capacidad superada por la oferta", esc.getAviso_capacidad(),
                "Debe desplegar exactamente el texto normativo «Capacidad superada por la oferta»");
    }

    @Test
    @DisplayName("Debe invalidar recorrido vial (estado_consulta='pendiente', distancia_km=null) al cambiar coordenadas")
    void testInvalidarRecorridoAlCambiarCoordenadas() {
        Escenario esc = crearEscenarioReferencia();
        Ruta r1 = esc.getRutas().stream().filter(r -> r.getId().equals("EMP-01->PLA-01")).findFirst().orElseThrow();
        assertEquals("calculada", r1.getEstado_consulta());
        assertEquals(27.5, r1.getDistancia_km());
        assertFalse(r1.getGeometria().isEmpty());

        // Editar coordenadas de EMP-01 mediante guardar_empresa
        Empresa empMod = new Empresa("EMP-01", "Palmeras del Llano", "Acacías Nueva Ubicación", 4.05, -73.80, "Palma de aceite", 25.0);
        List<Ruta> afectadas = esc.guardar_empresa(empMod);

        assertFalse(afectadas.isEmpty(), "Debe registrar rutas afectadas");
        assertEquals("pendiente", r1.getEstado_consulta(), "El estado de consulta debe volver a 'pendiente'");
        assertNull(r1.getDistancia_km(), "La distancia debe ser null (nunca cero ficticio, DD-17)");
        assertTrue(r1.getGeometria().isEmpty(), "La geometría debe quedar vacía");
    }

    @Test
    @DisplayName("Debe calcular costo unitario c_ij = distancia * tarifa una sola vez (DD-19, DD-20)")
    void testCalculoCostoUnitario() {
        Ruta ruta = new Ruta("EMP-01->PLA-01", "EMP-01", "PLA-01", 42.5, "OSRM (provisional)",
                Collections.emptyList(), "calculada", 300.0, null, true, true);
        Double costo = ruta.calcular_costo_unitario();
        assertEquals(12750.0, costo, 1e-6, "42.5 km * 300 COP/(t·km) = 12.750 COP/t (DD-20)");
    }

    @Test
    @DisplayName("Debe comprobar factibilidad de flujos respetando todas las restricciones (RF-09)")
    void testComprobarFactibilidadFlujos() {
        Escenario esc = crearEscenarioReferencia();
        ResultadoOptimizacion res = new ResultadoOptimizacion("EJE-01", "ESC-01", "EXACTO", "OPTIMO");

        // Asignación óptima de referencia de hu_19 ($ 997.500 COP)
        Map<String, Double> flujosOptimos = new LinkedHashMap<>();
        flujosOptimos.put("EMP-01->PLA-01", 25.0);
        flujosOptimos.put("EMP-02->PLA-03", 15.0);
        flujosOptimos.put("EMP-03->PLA-02", 18.0);
        flujosOptimos.put("EMP-04->PLA-03", 12.0);
        flujosOptimos.put("EMP-05->PLA-03", 8.0);
        flujosOptimos.put("EMP-06->PLA-01", 5.0);
        flujosOptimos.put("EMP-06->PLA-02", 1.0);
        flujosOptimos.put("EMP-07->PLA-01", 10.0);
        flujosOptimos.put("EMP-08->PLA-04", 11.0);
        flujosOptimos.put("EMP-09->PLA-01", 5.0);
        flujosOptimos.put("EMP-10->PLA-04", 5.0);

        res.setMatriz_flujos_optimos(flujosOptimos);

        // Verificar factibilidad con tolerancia 1e-6
        assertTrue(res.comprobar_factibilidad_flujos(esc, 1e-6), "La asignación debe cumplir con 100% de las restricciones de oferta y capacidad");

        // Si intentamos asignar flujo por una conexión no disponible (EMP-10->PLA-03)
        flujosOptimos.put("EMP-10->PLA-03", 5.0);
        flujosOptimos.put("EMP-10->PLA-04", 0.0);
        res.setMatriz_flujos_optimos(flujosOptimos);
        assertFalse(res.comprobar_factibilidad_flujos(esc, 1e-6), "No debe ser factible si envía toneladas por una conexión inactiva o incompatible");
    }

    @Test
    @DisplayName("Debe aplicar perturbación de sensibilidad en un clon sin mutar el escenario de referencia")
    void testPerturbacionSensibilidadSinMutarReferencia() {
        Escenario referencia = crearEscenarioReferencia();
        assertEquals(25.0, referencia.getEmpresas().get(0).getOferta_t(), 1e-6);

        PerturbacionSensibilidad pert = new PerturbacionSensibilidad(
                "PERT-01", "ESC-01", "ESC-02", "Aumento Oferta EMP-01 +20%",
                "OFERTA_EMPRESA", "EMP-01", 25.0, 20.0, 30.0
        );

        Escenario variante = pert.aplicar_a_escenario(referencia);

        // La variante debe tener 30.0 t
        assertEquals(30.0, variante.getEmpresas().get(0).getOferta_t(), 1e-6);
        assertEquals("ESC-02", variante.getId());

        // La referencia debe permanecer INTACTA con 25.0 t (DD-43, DD-45)
        assertEquals(25.0, referencia.getEmpresas().get(0).getOferta_t(), 1e-6);
        assertEquals("ESC-01", referencia.getId());
    }

    @Test
    @DisplayName("El clon conserva adquisición y operación sin compartir datos mutables con la referencia")
    void testClonProfundoConservaCostosYDatosOperativos() {
        Escenario referencia = crearEscenarioReferencia();
        referencia.getEmpresas().get(0).setPrecio_tonelada(123.0);
        referencia.getPlantas().get(0).setCosto_operacion_t(456.0);
        referencia.setReferencia_id("ESC-ANTERIOR");
        referencia.setVariaciones(List.of(Map.of("tipo", "OFERTA")));
        referencia.setReferencia_snapshot(new Escenario("ESC-ANTERIOR", "Anterior", null, null, null));

        Escenario clon = referencia.clonar_profundo("ESC-COPIA", "Copia");

        assertEquals("ESC-COPIA", clon.getId());
        assertEquals("Copia", clon.getNombre());
        assertEquals(123.0, clon.getEmpresas().get(0).getPrecio_tonelada());
        assertEquals(456.0, clon.getPlantas().get(0).getCosto_operacion_t());
        assertEquals(referencia.getOferta_total_t(), clon.getOferta_total_t());
        assertEquals(referencia.getCapacidad_total_t(), clon.getCapacidad_total_t());
        assertNull(clon.getReferencia_id());
        assertTrue(clon.getVariaciones().isEmpty());
        assertNull(clon.getReferencia_snapshot());
        assertNotSame(referencia.getEmpresas().get(0), clon.getEmpresas().get(0));
        assertNotSame(referencia.getPlantas().get(0), clon.getPlantas().get(0));
        assertNotSame(referencia.getRutas().get(0).getGeometria().get(0),
                clon.getRutas().get(0).getGeometria().get(0));

        clon.getEmpresas().get(0).setPrecio_tonelada(999.0);
        clon.getPlantas().get(0).setCosto_operacion_t(999.0);
        clon.getRutas().get(0).getGeometria().get(0).set(0, 0.0);
        assertEquals(123.0, referencia.getEmpresas().get(0).getPrecio_tonelada());
        assertEquals(456.0, referencia.getPlantas().get(0).getCosto_operacion_t());
        assertEquals(-73.77, referencia.getRutas().get(0).getGeometria().get(0).get(0));
    }

    @Test
    @DisplayName("ReporteComparativo debe formatear porcentaje de gap o «No disponible» (RF-28, DD-35)")
    void testReporteComparativoResumen() {
        ResultadoOptimizacion opt = new ResultadoOptimizacion("EJE-01", "ESC-01", "EXACTO", "OPTIMO");
        opt.setCosto_total_Z(997500.0);
        opt.setTiempo_ejecucion_s(0.04);

        ResultadoOptimizacion ag = new ResultadoOptimizacion("EJE-02", "ESC-01", "AG", "FACTIBLE_SIN_CERTIFICAR");
        ag.setCosto_total_Z(1050000.0);
        ag.setTiempo_ejecucion_s(0.35);

        double gap = 100.0 * (1050000.0 - 997500.0) / 997500.0; // 5.263%
        ReporteComparativo rep = new ReporteComparativo("ESC-01", "EJE-01", "EJE-02", 10, 4,
                new ConfiguracionAG(), opt, ag, gap, 52500.0, 0.31);

        Map<String, Object> resumen = rep.obtener_resumen_comparativo();
        assertEquals(gap, (Double) resumen.get("porcentaje_gap"), 1e-6);
        assertEquals("5.26 %", resumen.get("gap_etiqueta"));

        // Caso donde el AG no halló factible: gap debe ser null y mostrar «No disponible»
        rep.setPorcentaje_gap(null);
        Map<String, Object> resumenNoDisp = rep.obtener_resumen_comparativo();
        assertNull(resumenNoDisp.get("porcentaje_gap"));
        assertEquals("No disponible", resumenNoDisp.get("gap_etiqueta"));
    }
}
