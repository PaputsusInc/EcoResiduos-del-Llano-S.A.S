package com.ecoresiduos.llano;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.infrastructure.persistence.AdaptadorPersistencia;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "ecoresiduos.escenarios.directorio=target/test-escenarios")
class SimulacionEscenariosIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AdaptadorPersistencia repositorio;

    @Test
    void escenariosSemillaDeSensibilidadSePuedenCompararSinCreacionManual() throws Exception {
        assertNotNull(repositorio.obtener_por_id("ESC-02").getReferencia_snapshot());
        assertNotNull(repositorio.obtener_por_id("ESC-03").getReferencia_snapshot());
        JsonNode respuesta = json.readTree(mvc.perform(post(
                "/api/escenarios/ESC-01/simulaciones/ESC-02/comparar-metodos")
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"config_ag":{"tamano_poblacion":12,"generaciones":8,"semilla":42}}
                """))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("OPTIMO", respuesta.path("referencia").path("resultado_exacto").path("estado").asText());
        assertEquals("FACTIBLE_SIN_CERTIFICAR", respuesta.path("variante").path("resultado_genetico").path("estado").asText());
    }

    @Test
    void crearPersistirYCompararConMotorExacto() throws Exception {
        String payload = """
                {"nombre":"Tarifas y capacidad", "variaciones":[
                  {"tipo":"COSTOS","porcentaje":10},
                  {"tipo":"CAPACIDAD","nodo_id":"PLA-01","porcentaje":-5}
                ]}
                """;
        JsonNode preview = json.readTree(mvc.perform(post("/api/escenarios/ESC-01/simulaciones/previsualizar")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("OPTIMO", preview.path("variante").path("estado").asText());

        JsonNode creado = json.readTree(mvc.perform(post("/api/escenarios/ESC-01/simulaciones")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String id = creado.path("escenario").path("id").asText();
        assertTrue(Files.exists(Path.of("target/test-escenarios", id + ".json")));
        repositorio.cargar_datos_semilla();
        assertNotNull(repositorio.obtener_por_id(id));

        JsonNode comparado = json.readTree(mvc.perform(post(
                "/api/escenarios/ESC-01/simulaciones/" + id + "/comparar"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("OPTIMO", comparado.path("variante").path("estado").asText());
        assertEquals(preview.path("variante").path("costo_total_Z").asDouble(),
                comparado.path("variante").path("costo_total_Z").asDouble(), 1e-6);
        assertTrue(comparado.path("cambios_flujo_t").isObject());

        String configuracion = """
                {"config_ag":{"tamano_poblacion":12,"generaciones":8,"tasa_cruce":0.8,
                 "tasa_mutacion":0.05,"tamano_torneo":3,"elitismo":1,"semilla":42}}
                """;
        JsonNode metodos = json.readTree(mvc.perform(post(
                "/api/escenarios/ESC-01/simulaciones/" + id + "/comparar-metodos")
                .contentType(MediaType.APPLICATION_JSON).content(configuracion))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("OPTIMO", metodos.path("referencia").path("resultado_exacto").path("estado").asText());
        assertEquals("FACTIBLE_SIN_CERTIFICAR", metodos.path("variante").path("resultado_genetico").path("estado").asText());
        assertTrue(metodos.path("variante").path("resultado_exacto").path("cpu_tiempo_s").asDouble() >= 0);
        assertTrue(metodos.path("variante").path("resultado_genetico").path("memoria_pico_mb").asDouble() > 0);

        repositorio.obtener_por_id("ESC-01").actualizar_oferta_empresa("EMP-01", 20.0);
        JsonNode estable = json.readTree(mvc.perform(post(
                "/api/escenarios/ESC-01/simulaciones/" + id + "/comparar"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(comparado.path("referencia").path("costo_total_Z").asDouble(),
                estable.path("referencia").path("costo_total_Z").asDouble(), 1e-6);
        JsonNode metodosEstables = json.readTree(mvc.perform(post(
                "/api/escenarios/ESC-01/simulaciones/" + id + "/comparar-metodos")
                .contentType(MediaType.APPLICATION_JSON).content(configuracion))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(metodos.path("referencia").path("resultado_exacto").path("costo_total_Z").asDouble(),
                metodosEstables.path("referencia").path("resultado_exacto").path("costo_total_Z").asDouble(), 1e-6);

        String edicion = """
                {"nombre":"Tarifas revisadas", "variaciones":[
                  {"tipo":"COSTOS","porcentaje":20}
                ]}
                """;
        JsonNode editado = json.readTree(mvc.perform(put(
                "/api/escenarios/ESC-01/simulaciones/" + id)
                .contentType(MediaType.APPLICATION_JSON).content(edicion))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("Tarifas revisadas", editado.path("escenario").path("nombre").asText());
        assertEquals(115.0, editado.path("escenario").path("oferta_total_t").asDouble(), 1e-6);
        assertEquals(id, editado.path("escenario").path("id").asText());
    }

    @Test
    void simulacionConservaCostosEnSnapshotYEdicion() throws Exception {
        Escenario referencia = repositorio.obtener_por_id("ESC-01")
                .clonar_profundo("ESC-REG-COSTOS", "Referencia con costos");
        referencia.getEmpresas().forEach(empresa -> empresa.setPrecio_tonelada(200.0));
        referencia.getPlantas().forEach(planta -> planta.setCosto_operacion_t(300.0));
        repositorio.guardar(referencia);

        String payload = """
                {"nombre":"Simulación con costos", "variaciones":[
                  {"tipo":"COSTOS","porcentaje":10}
                ]}
                """;
        JsonNode creado = json.readTree(mvc.perform(post("/api/escenarios/ESC-REG-COSTOS/simulaciones")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String id = creado.path("escenario").path("id").asText();
        assertEquals(200.0, creado.path("escenario").path("empresas").get(0).path("precio_tonelada").asDouble());
        assertEquals(300.0, creado.path("escenario").path("plantas").get(0).path("costo_operacion_t").asDouble());
        assertEquals(200.0, creado.path("escenario").path("referencia_snapshot")
                .path("empresas").get(0).path("precio_tonelada").asDouble());
        assertEquals(300.0, creado.path("escenario").path("referencia_snapshot")
                .path("plantas").get(0).path("costo_operacion_t").asDouble());

        repositorio.cargar_datos_semilla();
        Escenario guardado = repositorio.obtener_por_id(id);
        assertEquals(200.0, guardado.getReferencia_snapshot().getEmpresas().get(0).getPrecio_tonelada());
        assertEquals(300.0, guardado.getReferencia_snapshot().getPlantas().get(0).getCosto_operacion_t());

        JsonNode editado = json.readTree(mvc.perform(put(
                "/api/escenarios/ESC-REG-COSTOS/simulaciones/" + id)
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(200.0, editado.path("escenario").path("empresas").get(0).path("precio_tonelada").asDouble());
        assertEquals(300.0, editado.path("escenario").path("plantas").get(0).path("costo_operacion_t").asDouble());
    }

    @AfterAll
    static void limpiar() throws Exception {
        Path directorio = Path.of("target/test-escenarios");
        if (Files.exists(directorio)) {
            try (var archivos = Files.walk(directorio)) {
                archivos.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); } catch (Exception error) { throw new RuntimeException(error); }
                });
            }
        }
    }
}
