package com.ecoresiduos.llano;

import com.ecoresiduos.llano.application.MotorComparacionRendimiento;
import com.ecoresiduos.llano.application.OrquestadorOptimizacion;
import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ReporteComparativo;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.exposition.ValidadorContratosEntrada;
import com.ecoresiduos.llano.infrastructure.optimizer.AdaptadorGenetico;
import com.ecoresiduos.llano.infrastructure.optimizer.AdaptadorSolucionadorExacto;
import com.ecoresiduos.llano.infrastructure.optimizer.PythonProcessRunner;
import com.ecoresiduos.llano.infrastructure.persistence.AdaptadorPersistencia;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class ProcessBuilderIntegrationTest {

    private AdaptadorPersistencia persistencia;
    private PythonProcessRunner runner;
    private AdaptadorSolucionadorExacto adaptadorExacto;
    private AdaptadorGenetico adaptadorGenetico;
    private OrquestadorOptimizacion orquestador;
    private ValidadorContratosEntrada validador;
    private MotorComparacionRendimiento motorComparacion;

    @BeforeEach
    void setUp() {
        persistencia = new AdaptadorPersistencia();
        persistencia.cargar_datos_semilla();

        ObjectMapper mapper = new ObjectMapper();
        runner = new PythonProcessRunner(mapper);

        adaptadorExacto = new AdaptadorSolucionadorExacto(persistencia, runner);
        adaptadorGenetico = new AdaptadorGenetico(persistencia, runner);

        validador = new ValidadorContratosEntrada();
        motorComparacion = new MotorComparacionRendimiento();

        orquestador = new OrquestadorOptimizacion(
                persistencia,
                adaptadorExacto,
                adaptadorGenetico,
                motorComparacion,
                validador
        );
    }

    @Test
    @DisplayName("Debe resolver ESC-01 con método EXACTO produciendo Z* = 997.500 COP y pasos exactos en vivo")
    void testSolverExactoEscenario01Optimo() {
        Escenario esc01 = persistencia.obtener_por_id("ESC-01");
        assertNotNull(esc01, "ESC-01 debe existir en persistencia");

        ResultadoOptimizacion resultado = adaptadorExacto.resolver(esc01, null);

        assertNotNull(resultado, "El resultado de optimización no debe ser nulo");
        assertEquals("OPTIMO", resultado.getEstado(), "El estado debe ser OPTIMO");
        assertNotNull(resultado.getCosto_total_Z(), "El costo Z no debe ser nulo");
        assertEquals(997500.0, resultado.getCosto_total_Z(), 1e-3, "El costo Z* debe ser exactamente 997.500 COP");

        // Validar comprobación de flujos de dominio
        Boolean factible = resultado.comprobar_factibilidad_flujos(esc01, 1e-6);
        assertTrue(factible, "Los flujos óptimos deben ser factibles según las reglas de negocio");

        // Validar pasos exactos generados
        assertNotNull(resultado.getPasos_exactos(), "Debe contener la lista de pasos exactos");
        assertFalse(resultado.getPasos_exactos().isEmpty(), "La lista de pasos exactos no debe estar vacía");
        assertTrue(resultado.getPasos_exactos().stream().anyMatch(p -> "PREPARACION".equals(p.getEtapa())));
        assertTrue(resultado.getPasos_exactos().stream().anyMatch(p -> "FORMULACION".equals(p.getEtapa())));
        assertTrue(resultado.getPasos_exactos().stream().anyMatch(p -> "RESOLUCION".equals(p.getEtapa())));
        assertTrue(resultado.getPasos_exactos().stream().anyMatch(p -> "VALIDACION".equals(p.getEtapa())));

        // Validar modelo formulado
        assertNotNull(resultado.getModelo_formulado(), "Debe contener el modelo formulado");
        assertFalse(resultado.getModelo_formulado().isEmpty(), "El modelo formulado no debe estar vacío");

        // Validar sensibilidad dual
        assertNotNull(resultado.getSensibilidad_dual(), "Debe contener lista de precios sombra y rangos");
        assertFalse(resultado.getSensibilidad_dual().isEmpty(), "La sensibilidad dual no debe estar vacía");
        assertTrue(resultado.getSensibilidad_dual().stream().anyMatch(ps -> ps.getNodo_id() != null));

        // Validar tiempo de ejecución
        assertNotNull(resultado.getTiempo_ejecucion_s(), "El tiempo de ejecución debe estar cronometrado");
        assertTrue(resultado.getTiempo_ejecucion_s() >= 0.0, "El tiempo de ejecución debe ser no negativo");

        // Validar que se persistió en AdaptadorPersistencia
        ResultadoOptimizacion guardado = persistencia.obtener_resultado_por_id(resultado.getId());
        assertNotNull(guardado, "El resultado debe estar guardado en persistencia");
        assertEquals("OPTIMO", guardado.getEstado());
    }

    @Test
    @DisplayName("Debe detectar infactibilidad en ESC-04 (120 t > 100 t) con INFACTIBLE_CERTIFICADO")
    void testSolverExactoEscenario04Infactible() {
        Escenario esc04 = persistencia.obtener_por_id("ESC-04");
        assertNotNull(esc04, "ESC-04 debe existir en persistencia");

        ResultadoOptimizacion resultado = adaptadorExacto.resolver(esc04, null);

        assertNotNull(resultado);
        assertEquals("INFACTIBLE_CERTIFICADO", resultado.getEstado(), "Debe certificar infactibilidad");
        assertEquals("Capacidad superada por la oferta", resultado.getCausa_estado(),
                "La causa debe ser exactamente la etiqueta literal RF-11");
        assertNull(resultado.getCosto_total_Z(), "El costo Z debe ser nulo en caso infactible");
        assertTrue(resultado.getMatriz_flujos_optimos() == null || resultado.getMatriz_flujos_optimos().isEmpty(),
                "No debe haber flujos asignados");

        // Debe registrar pasos de PREPARACION y FORMULACION
        assertNotNull(resultado.getPasos_exactos());
        assertFalse(resultado.getPasos_exactos().isEmpty());
    }

    @Test
    @DisplayName("Debe resolver ESC-01 con AG emitiendo generaciones 0..N y estado FACTIBLE_SIN_CERTIFICAR")
    void testSolverGeneticoGeneracionesYEvolucion() {
        Escenario esc01 = persistencia.obtener_por_id("ESC-01");
        assertNotNull(esc01);

        ConfiguracionAG configAg = new ConfiguracionAG(20, 10, 0.80, 0.05, "TORNEO", 1000.0, 42);

        ResultadoOptimizacion resultado = adaptadorGenetico.resolver(esc01, configAg);

        assertNotNull(resultado);
        assertEquals("FACTIBLE_SIN_CERTIFICAR", resultado.getEstado(),
                "El AG debe terminar con FACTIBLE_SIN_CERTIFICAR cuando encuentra solución factible");
        assertNotNull(resultado.getCosto_total_Z(), "Debe obtener costo Z");
        assertTrue(resultado.getCosto_total_Z() > 0.0, "El costo debe ser positivo");

        // Validar emisión de generaciones 0 a 10 (11 generaciones en total)
        assertNotNull(resultado.getHistorial_generaciones());
        assertEquals(11, resultado.getHistorial_generaciones().size(),
                "Debe contener exactamente 11 registros generacionales (desde generación 0 hasta 10)");
        assertEquals(0, resultado.getHistorial_generaciones().get(0).getNumero(),
                "El primer registro debe ser la generación inicial 0");
        assertEquals(10, resultado.getHistorial_generaciones().get(10).getNumero(),
                "El último registro debe ser la generación 10");

        // Curva de convergencia
        assertNotNull(resultado.getCurva_convergencia_fitness());
        assertFalse(resultado.getCurva_convergencia_fitness().isEmpty());

        // Comprobar factibilidad de flujos en dominio
        Boolean factible = resultado.comprobar_factibilidad_flujos(esc01, 1e-6);
        assertTrue(factible, "La solución del AG debe satisfacer completamente la oferta y capacidad");
    }

    @Test
    @DisplayName("Debe integrar OrquestadorOptimizacion para comparar EXACTO vs AG generando ReporteComparativo")
    void testOrquestadorComparacionRendimiento() {
        ConfiguracionAG configAg = new ConfiguracionAG(20, 10, 0.80, 0.05, "TORNEO", 1000.0, 42);

        ReporteComparativo reporte = orquestador.ejecutar_comparacion_metodos("ESC-01", configAg);

        assertNotNull(reporte);
        assertNotNull(reporte.getResultado_exacto());
        assertNotNull(reporte.getResultado_genetico());

        assertEquals("OPTIMO", reporte.getResultado_exacto().getEstado());
        assertEquals("FACTIBLE_SIN_CERTIFICAR", reporte.getResultado_genetico().getEstado());

        assertEquals(997500.0, reporte.getResultado_exacto().getCosto_total_Z(), 1e-3);
        assertNotNull(reporte.getPorcentaje_gap(), "El gap porcentual debe ser calculado");
        assertTrue(reporte.getPorcentaje_gap() >= 0.0, "El gap debe ser no negativo");
    }
}
