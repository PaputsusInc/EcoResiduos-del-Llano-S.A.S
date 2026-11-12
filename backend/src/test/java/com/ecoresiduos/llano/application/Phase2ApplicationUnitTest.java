package com.ecoresiduos.llano.application;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PerturbacionSensibilidad;
import com.ecoresiduos.llano.domain.model.ReporteComparativo;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.exposition.ValidadorContratosEntrada;
import com.ecoresiduos.llano.infrastructure.persistence.AdaptadorPersistencia;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pruebas Unitarias de Casos de Uso, Persistencia y Validación (Fase 2)")
class Phase2ApplicationUnitTest {

    private AdaptadorPersistencia repositorio;
    private ValidadorContratosEntrada validador;
    private MotorComparacionRendimiento motorComparacion;
    private OrquestadorOptimizacion orquestador;
    private MotorAnalisisSensibilidad motorSensibilidad;

    @BeforeEach
    void setUp() {
        repositorio = new AdaptadorPersistencia();
        repositorio.cargar_datos_semilla(); // Precarga ESC-01, ESC-04, EJE-01, EJE-02

        validador = new ValidadorContratosEntrada();
        motorComparacion = new MotorComparacionRendimiento();
        orquestador = new OrquestadorOptimizacion(repositorio, null, null, motorComparacion, validador);
        motorSensibilidad = new MotorAnalisisSensibilidad(repositorio, orquestador, motorComparacion);
    }

    @Test
    @DisplayName("AdaptadorPersistencia debe precargar datos semilla oficiales (ESC-01, ESC-04, EJE-01)")
    void testDatosSemillaPersistencia() {
        Escenario esc01 = repositorio.obtener_por_id("ESC-01");
        assertNotNull(esc01, "ESC-01 debe estar precargado en memoria");
        assertEquals("Caso de referencia", esc01.getNombre());
        assertEquals(10, esc01.getEmpresas().size(), "ESC-01 debe tener 10 empresas");
        assertEquals(4, esc01.getPlantas().size(), "ESC-01 debe tener 4 plantas");
        assertEquals(115.0, esc01.getOferta_total_t(), 1e-6);
        assertEquals(135.0, esc01.getCapacidad_total_t(), 1e-6);

        // Comprobar que EMP-10->PLA-03 es no disponible (distancia null, inactiva)
        var rInactiva = esc01.getRutas().stream().filter(r -> r.getId().equals("EMP-10->PLA-03")).findFirst().orElseThrow();
        assertNull(rInactiva.getDistancia_km());
        assertFalse(rInactiva.getActiva());
        assertEquals("sin_ruta", rInactiva.getEstado_consulta());

        // Comprobar ESC-04 (inviable 120 t > 100 t)
        Escenario esc04 = repositorio.obtener_por_id("ESC-04");
        assertNotNull(esc04);
        assertEquals("Capacidad superada por la oferta", esc04.getAviso_capacidad());

        // Comprobar EJE-01 precargado con Z* = 997.500 COP
        ResultadoOptimizacion eje01 = repositorio.obtener_resultado_por_id("EJE-01");
        assertNotNull(eje01);
        assertEquals("OPTIMO", eje01.getEstado());
        assertEquals(997500.0, eje01.getCosto_total_Z(), 1e-6);
        assertFalse(eje01.getSensibilidad_dual().isEmpty(), "Debe contener precios sombra y rangos de optimalidad");
    }

    @Test
    @DisplayName("ValidadorContratosEntrada debe validar coordenadas geográficas finitas en [-90,90] y [-180,180]")
    void testValidacionCoordenadas() {
        List<String> validos = validador.validar_coordenadas_geograficas(4.142, -73.626);
        assertTrue(validos.isEmpty(), "Coordenadas válidas en Meta no deben tener errores");

        List<String> latInvalida = validador.validar_coordenadas_geograficas(95.0, -73.0);
        assertFalse(latInvalida.isEmpty(), "Latitud > 90 debe ser rechazada");
        assertTrue(latInvalida.get(0).contains("latitud"));

        List<String> lonInvalida = validador.validar_coordenadas_geograficas(4.0, -200.0);
        assertFalse(lonInvalida.isEmpty(), "Longitud < -180 debe ser rechazada");
        assertTrue(lonInvalida.get(0).contains("longitud"));
    }

    @Test
    @DisplayName("ValidadorContratosEntrada debe validar y normalizar tasas del AG de porcentaje a proporción [0, 1]")
    void testValidacionYNormalizacionTasasAG() {
        ConfiguracionAG config = new ConfiguracionAG(100, 200, 80.0, 5.0, "TORNEO", 1000.0);
        List<String> errores = validador.validar_hiperparametros_ag(config);
        assertTrue(errores.isEmpty(), "Configuración con tasas en porcentaje [0, 100] debe ser válida");

        // Normalización automática
        assertEquals(0.80, config.getTasa_cruce(), 1e-6, "80 % debe normalizarse a 0.80");
        assertEquals(0.05, config.getTasa_mutacion(), 1e-6, "5 % debe normalizarse a 0.05");

        // Configuración con tamaño de población inválido (< 2)
        ConfiguracionAG configInvalida = new ConfiguracionAG(1, 200, 0.8, 0.05, "TORNEO", 1000.0);
        List<String> erroresPob = validador.validar_hiperparametros_ag(configInvalida);
        assertFalse(erroresPob.isEmpty(), "Población < 2 debe ser rechazada");
    }

    @Test
    @DisplayName("MotorComparacionRendimiento debe calcular gap según RF-28 o retornar null (No disponible)")
    void testCalculoGapOptimalidad() {
        // Óptimo certificado y AG factible
        Double gap = motorComparacion.calcular_gap_optimalidad(997500.0, "OPTIMO", 1045200.0, "FACTIBLE_SIN_CERTIFICAR");
        assertNotNull(gap);
        assertEquals(4.7819, gap, 1e-3, "100 * (1.045.200 - 997.500) / 997.500 = 4.78 %");

        // Si el exacto no certificó OPTIMO
        Double gapInviable = motorComparacion.calcular_gap_optimalidad(null, "INFACTIBLE_CERTIFICADO", 1045200.0, "FACTIBLE_SIN_CERTIFICAR");
        assertNull(gapInviable, "Debe ser null («No disponible») si no hay óptimo certificado");

        // Si el AG no encontró candidato factible
        Double gapSinFactible = motorComparacion.calcular_gap_optimalidad(997500.0, "OPTIMO", null, "SIN_CANDIDATO_FACTIBLE_AG");
        assertNull(gapSinFactible, "Debe ser null («No disponible») si el AG no es factible");
    }

    @Test
    @DisplayName("OrquestadorOptimizacion debe permitir modificar oferta, capacidad y costos viales")
    void testOrquestadorModificaciones() {
        Escenario esc = orquestador.modificar_oferta_empresa("ESC-01", "EMP-01", 30.0);
        assertEquals(30.0, esc.getEmpresas().get(0).getOferta_t(), 1e-6);
        assertEquals(120.0, esc.getOferta_total_t(), 1e-6);

        Escenario escCap = orquestador.modificar_capacidad_planta("ESC-01", "PLA-01", 50.0);
        assertEquals(50.0, escCap.getPlantas().get(0).getCapacidad_maxima_t(), 1e-6);
        assertEquals(140.0, escCap.getCapacidad_total_t(), 1e-6);

        Escenario escTarifa = orquestador.modificar_costo_transporte("ESC-01", "GLOBAL", null, 350.0);
        var r1 = escTarifa.getRutas().stream().filter(r -> r.getId().equals("EMP-01->PLA-01")).findFirst().orElseThrow();
        assertEquals(350.0, r1.getTarifa_t_km(), 1e-6);
        assertEquals(27.5 * 350.0, r1.getCosto_unitario_t(), 1e-6, "27.5 km * 350 COP/t-km = 9625.0 COP/t");
    }

    @Test
    @DisplayName("MotorAnalisisSensibilidad debe generar variantes de oferta, capacidad y costo sin mutar la referencia")
    void testMotorSensibilidadGeneracionVariantes() {
        Escenario refOriginal = repositorio.obtener_por_id("ESC-01");
        double ofertaOriginal = refOriginal.getEmpresas().get(0).getOferta_t(); // 25.0 o 30.0 según test anterior

        PerturbacionSensibilidad pOferta = new PerturbacionSensibilidad(
                "PERT-OF", "ESC-01", "ESC-VAR-01", "Oferta +10%", "OFERTA_EMPRESA", "EMP-01", ofertaOriginal, 10.0, ofertaOriginal + 5.0
        );

        Escenario variante = motorSensibilidad.generar_variante_oferta("ESC-01", List.of(pOferta));
        assertNotNull(variante);
        assertEquals("ESC-VAR-01", variante.getId());
        assertEquals(ofertaOriginal + 5.0, variante.getEmpresas().get(0).getOferta_t(), 1e-6);

        // La referencia en el repositorio debe seguir existiendo con su valor original
        Escenario refEnRepo = repositorio.obtener_por_id("ESC-01");
        assertEquals(ofertaOriginal, refEnRepo.getEmpresas().get(0).getOferta_t(), 1e-6,
                "El escenario de referencia no debe mutar al crear una variante (DD-43, DD-45)");
    }
}

