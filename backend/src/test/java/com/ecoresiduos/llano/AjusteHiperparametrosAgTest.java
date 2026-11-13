package com.ecoresiduos.llano;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.port.IPuertoAjustadorHiperparametrosAG;
import com.ecoresiduos.llano.infrastructure.persistence.AdaptadorPersistencia;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AjusteHiperparametrosAgTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AdaptadorPersistencia persistencia;
    @MockBean IPuertoAjustadorHiperparametrosAG ajustador;

    @BeforeEach
    void preparar() {
        persistencia.cargar_datos_semilla();
        reset(ajustador);
    }

    @Test
    void ajusteSoloSeEjecutaAlSolicitarElEndpoint() throws Exception {
        String configuracion = json.writeValueAsString(Map.of("config_ag", Map.of(
                "tamano_poblacion", 4, "generaciones", 1,
                "tasa_cruce", 0.8, "tasa_mutacion", 0.05
        )));
        mvc.perform(post("/api/escenarios/ESC-01/optimizar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "metodo", "AG", "config_ag", Map.of(
                                        "tamano_poblacion", 4, "generaciones", 1
                                )))))
                .andExpect(status().isOk());
        verifyNoInteractions(ajustador);

        when(ajustador.ajustar(any(Escenario.class), any(ConfiguracionAG.class)))
                .thenReturn(Map.of("ensayos_completados", 12, "mejor_costo_promedio", 100.0));
        mvc.perform(post("/api/escenarios/ESC-01/ag/ajustar")
                        .contentType(MediaType.APPLICATION_JSON).content(configuracion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ensayos_completados").value(12));
        verify(ajustador, times(1)).ajustar(any(Escenario.class), any(ConfiguracionAG.class));
    }

    @Test
    void configuracionInvalidaNoLlegaAlAjustador() throws Exception {
        mvc.perform(post("/api/escenarios/ESC-01/ag/ajustar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("config_ag", Map.of(
                                "tamano_poblacion", 1
                        )))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores").isArray());
        verifyNoInteractions(ajustador);
    }
}
