package com.ecoresiduos.llano;

import com.ecoresiduos.llano.infrastructure.persistence.AdaptadorPersistencia;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ControladorPeticionesHTTPTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AdaptadorPersistencia persistencia;

    @BeforeEach
    void setUp() {
        persistencia.cargar_datos_semilla();
    }

    // -------------------------------------------------------------------------
    // Sesión y Escenarios Generales
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/escenarios debe retornar lista de escenarios con código 200")
    void testListarEscenarios() throws Exception {
        mockMvc.perform(get("/api/escenarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenarios", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.escenario_activo_id", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/escenarios/ESC-01 debe retornar escenario base con código 200")
    void testObtenerEscenarioExistente() throws Exception {
        mockMvc.perform(get("/api/escenarios/ESC-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario.id", is("ESC-01")))
                .andExpect(jsonPath("$.escenario.oferta_total_t", is(115.0)))
                .andExpect(jsonPath("$.escenario.capacidad_total_t", is(135.0)));
    }

    @Test
    @DisplayName("GET /api/escenarios/ESC-INEXISTENTE debe retornar 404")
    void testObtenerEscenarioInexistente() throws Exception {
        mockMvc.perform(get("/api/escenarios/ESC-INEXISTENTE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", containsString("no encontrado")));
    }

    // -------------------------------------------------------------------------
    // HU-01: Empresas Generadoras
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/empresas debe crear empresa y retornar 201")
    void testPostGuardarEmpresaValida() throws Exception {
        Map<String, Object> payload = Map.of(
                "id", "EMP-99",
                "nombre", "Empresa Test Bio",
                "ubicacion", "Villavicencio",
                "latitud", 4.12,
                "longitud", -73.63,
                "tipo_residuo", "Palma de aceite",
                "oferta_t", 14.0
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/empresas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.escenario", notNullValue()))
                .andExpect(jsonPath("$.rutas_actualizadas", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/empresas debe retornar 400 con latitud fuera de rango")
    void testPostGuardarEmpresaInvalida() throws Exception {
        Map<String, Object> payload = Map.of(
                "id", "EMP-BAD",
                "latitud", 195.0, // Invalido: [-90, 90]
                "longitud", -73.63,
                "oferta_t", 10.0
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/empresas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores", hasSize(greaterThanOrEqualTo(1))));
    }

    // -------------------------------------------------------------------------
    // HU-02: Plantas Procesadoras
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/plantas debe crear planta y retornar 201")
    void testPostGuardarPlantaValida() throws Exception {
        Map<String, Object> payload = Map.of(
                "id", "PLA-99",
                "nombre", "Planta Test Verde",
                "ubicacion", "Acacías",
                "latitud", 3.98,
                "longitud", -73.76,
                "capacidad_maxima_t", 25.0
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/plantas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.escenario", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/plantas debe retornar 400 con capacidad negativa")
    void testPostGuardarPlantaInvalida() throws Exception {
        Map<String, Object> payload = Map.of(
                "id", "PLA-BAD",
                "latitud", 4.15,
                "longitud", -73.61,
                "capacidad_maxima_t", -15.0 // Invalido: >= 0
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/plantas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores", hasSize(greaterThanOrEqualTo(1))));
    }

    // -------------------------------------------------------------------------
    // HU-03: Oferta de Empresas
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/empresas/EMP-01/oferta debe actualizar oferta con 200")
    void testPutActualizarOfertaValida() throws Exception {
        Map<String, Object> payload = Map.of("oferta_t", 28.5);

        mockMvc.perform(put("/api/escenarios/ESC-01/empresas/EMP-01/oferta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario", notNullValue()));
    }

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/empresas/EMP-01/oferta debe retornar 400 con oferta negativa")
    void testPutActualizarOfertaInvalida() throws Exception {
        Map<String, Object> payload = Map.of("oferta_t", -8.0);

        mockMvc.perform(put("/api/escenarios/ESC-01/empresas/EMP-01/oferta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores", hasSize(greaterThanOrEqualTo(1))));
    }

    // -------------------------------------------------------------------------
    // HU-04: Capacidad de Plantas
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/plantas/PLA-01/capacidad debe actualizar capacidad con 200")
    void testPutActualizarCapacidadValida() throws Exception {
        Map<String, Object> payload = Map.of("capacidad_maxima_t", 50.0);

        mockMvc.perform(put("/api/escenarios/ESC-01/plantas/PLA-01/capacidad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario", notNullValue()));
    }

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/plantas/PLA-01/capacidad debe retornar 400 con capacidad negativa")
    void testPutActualizarCapacidadInvalida() throws Exception {
        Map<String, Object> payload = Map.of("capacidad_maxima_t", -20.0);

        mockMvc.perform(put("/api/escenarios/ESC-01/plantas/PLA-01/capacidad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores", hasSize(greaterThanOrEqualTo(1))));
    }

    // -------------------------------------------------------------------------
    // HU-05: Rutas y Distancias Viales OSRM
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/escenarios/ESC-01/rutas debe retornar conexiones con código 200")
    void testGetConsultarRutasMapa() throws Exception {
        mockMvc.perform(get("/api/escenarios/ESC-01/rutas")
                        .param("empresa_id", "EMP-01")
                        .param("planta_id", "PLA-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario_id", is("ESC-01")))
                .andExpect(jsonPath("$.rutas", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/rutas/{ruta_id}/reintentar-osrm debe reintentar consulta vial con 200")
    void testPostReintentarConsultaVial() throws Exception {
        mockMvc.perform(post("/api/escenarios/ESC-01/rutas/EMP-01->PLA-01/reintentar-osrm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario", notNullValue()));
    }

    // -------------------------------------------------------------------------
    // HU-06: Costos de Transporte
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/rutas/{ruta_id}/costo debe actualizar costos unitarios con 200")
    void testPutActualizarCostoTransporteValido() throws Exception {
        Map<String, Object> payload = Map.of(
                "costo_unitario_t", 8950.0,
                "tarifa_t_km", 310.0
        );

        mockMvc.perform(put("/api/escenarios/ESC-01/rutas/EMP-01->PLA-01/costo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matriz_costos", notNullValue()));
    }

    @Test
    @DisplayName("PUT /api/escenarios/ESC-01/rutas/{ruta_id}/costo debe retornar 400 con costo unitario negativo")
    void testPutActualizarCostoTransporteInvalido() throws Exception {
        Map<String, Object> payload = Map.of(
                "costo_unitario_t", -500.0
        );

        mockMvc.perform(put("/api/escenarios/ESC-01/rutas/EMP-01->PLA-01/costo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", notNullValue()));
    }

    // -------------------------------------------------------------------------
    // HU-07: Validación de Escenario (200 y 422)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/validar debe retornar 200 para escenario válido")
    void testPostValidarEscenarioValido() throws Exception {
        mockMvc.perform(post("/api/escenarios/ESC-01/validar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valido", is(true)))
                .andExpect(jsonPath("$.inconsistencias", hasSize(0)));
    }

    // -------------------------------------------------------------------------
    // HU-08, HU-09, HU-16, HU-17, HU-18, HU-19: Optimización
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/optimizar con método EXACTO debe retornar 200 y Z* = 997.500 COP")
    void testPostOptimizarExacto() throws Exception {
        Map<String, Object> payload = Map.of(
                "metodo", "EXACTO",
                "asincrono", false
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultado.estado", is("OPTIMO")))
                .andExpect(jsonPath("$.resultado.costo_total_Z", closeTo(997500.0, 1e-3)))
                .andExpect(jsonPath("$.desglose_asignaciones", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/optimizar con asincrono=true debe retornar 202 Accepted y estado EN_EJECUCION")
    void testPostOptimizarAsincrono() throws Exception {
        Map<String, Object> payload = Map.of(
                "metodo", "AG",
                "asincrono", true,
                "config_ag", Map.of(
                        "tamano_poblacion", 20,
                        "generaciones", 10,
                        "tasa_cruce", 0.80,
                        "tasa_mutacion", 0.05
                )
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.ejecucion_id", notNullValue()))
                .andExpect(jsonPath("$.estado", is("EN_EJECUCION")));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/optimizar con COMPARATIVO debe retornar 200 y ReporteComparativo")
    void testPostOptimizarComparativo() throws Exception {
        Map<String, Object> payload = Map.of(
                "metodo", "COMPARATIVO",
                "asincrono", false,
                "config_ag", Map.of(
                        "tamano_poblacion", 20,
                        "generaciones", 10,
                        "tasa_cruce", 0.80,
                        "tasa_mutacion", 0.05
                )
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporte.resultado_exacto.estado", is("OPTIMO")))
                .andExpect(jsonPath("$.reporte.resultado_genetico.estado", is("FACTIBLE_SIN_CERTIFICAR")));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/optimizar con AG inválido (tamano_poblacion < 2) debe retornar 400")
    void testPostOptimizarAgInvalido() throws Exception {
        Map<String, Object> payload = Map.of(
                "metodo", "AG",
                "asincrono", false,
                "config_ag", Map.of(
                        "tamano_poblacion", 1 // Invalido: >= 2
                )
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("La configuración AG asíncrona debe rechazar claves desconocidas")
    void testPostOptimizarAgAsincronoConClaveDesconocida() throws Exception {
        Map<String, Object> payload = Map.of(
                "metodo", "AG",
                "asincrono", true,
                "config_ag", Map.of("max_generaciones", 10)
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("max_generaciones")));
    }

    // -------------------------------------------------------------------------
    // HU-10 a HU-13: Sensibilidad
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Sensibilidad exacta reoptimiza tarifas y conserva el escenario original")
    void testSensibilidadExactaTransitoria() throws Exception {
        mockMvc.perform(post("/api/escenarios/ESC-01/sensibilidad-exacta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"COSTOS\",\"porcentaje\":20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultado.estado", is("OPTIMO")))
                .andExpect(jsonPath("$.resultado.costo_total_Z", is(1197000.0)))
                .andExpect(jsonPath("$.resultado.analisis_sensibilidad.costos", hasSize(39)));

        mockMvc.perform(get("/api/escenarios/ESC-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.escenario.oferta_total_t", is(115.0)));
    }

    @Test
    @DisplayName("POST /api/escenarios/ESC-01/sensibilidad debe generar y evaluar variante de sensibilidad con 200")
    void testPostEjecutarSensibilidad() throws Exception {
        Map<String, Object> payload = Map.of(
                "tipo_variacion", "COSTOS",
                "nombre_variante", "Variante Aumento Costos",
                "perturbaciones", List.of(
                        Map.of(
                                "id", "PERT-01",
                                "referencia_id", "ESC-01",
                                "variante_id", "ESC-VAR-01",
                                "parametro_objetivo", "COSTO_UNITARIO",
                                "entidad_afectada_id", "EMP-01->PLA-01",
                                "valor_referencia", 8250.0,
                                "porcentaje_variacion", 20.0,
                                "valor_variante", 9900.0
                        )
                ),
                "config_ag", Map.of(
                        "tamano_poblacion", 20,
                        "generaciones", 10,
                        "tasa_cruce", 0.80,
                        "tasa_mutacion", 0.05
                )
        );

        mockMvc.perform(post("/api/escenarios/ESC-01/sensibilidad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referencia", notNullValue()))
                .andExpect(jsonPath("$.variante", notNullValue()))
                .andExpect(jsonPath("$.reporte_referencia", notNullValue()))
                .andExpect(jsonPath("$.reporte_variante", notNullValue()));
    }

    // -------------------------------------------------------------------------
    // HU-18: Polling de Evolución AG
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/optimizacion/evolucion-ag/EJE-02 debe retornar seguimiento generacional con 200")
    void testGetConsultarEvolucionAg() throws Exception {
        mockMvc.perform(get("/api/optimizacion/evolucion-ag/EJE-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultado.id", is("EJE-02")))
                .andExpect(jsonPath("$.resultado.metodo_usado", is("AG")))
                .andExpect(jsonPath("$.avance_generacion", notNullValue()))
                .andExpect(jsonPath("$.max_generaciones", notNullValue()))
                .andExpect(jsonPath("$.en_curso", is(false)));
    }

    // -------------------------------------------------------------------------
    // HU-19, HU-14, HU-15: Procedimiento Exacto y Análisis Dual
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/optimizacion/procedimiento-exacto/EJE-01 debe retornar pasos y análisis dual con 200")
    void testGetConsultarProcedimientoExacto() throws Exception {
        mockMvc.perform(get("/api/optimizacion/procedimiento-exacto/EJE-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultado.id", is("EJE-01")))
                .andExpect(jsonPath("$.resultado.metodo_usado", is("EXACTO")))
                .andExpect(jsonPath("$.resultado.costo_total_Z", is(997500.0)))
                .andExpect(jsonPath("$.precios_sombra", notNullValue()))
                .andExpect(jsonPath("$.rangos_sensibilidad", notNullValue()))
                .andExpect(jsonPath("$.desglose_asignaciones", notNullValue()));
    }
}
