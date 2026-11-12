package com.ecoresiduos.llano.config;

import com.ecoresiduos.llano.application.MotorAnalisisSensibilidad;
import com.ecoresiduos.llano.application.MotorComparacionRendimiento;
import com.ecoresiduos.llano.application.OrquestadorOptimizacion;
import com.ecoresiduos.llano.domain.port.IPuertoOptimizador;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import com.ecoresiduos.llano.exposition.ValidadorContratosEntrada;
import com.ecoresiduos.llano.infrastructure.optimizer.AdaptadorGenetico;
import com.ecoresiduos.llano.infrastructure.optimizer.AdaptadorSolucionadorExacto;
import com.ecoresiduos.llano.infrastructure.optimizer.PythonProcessRunner;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class UseCaseBeansConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }

    @Bean
    public HttpClient httpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();
    }
}

