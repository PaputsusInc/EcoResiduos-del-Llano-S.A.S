package com.ecoresiduos.llano.infrastructure.optimizer;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.port.IPuertoConstructorEscenarios;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class AdaptadorConstructorEscenarios implements IPuertoConstructorEscenarios {
    private final PythonProcessRunner python;
    private final ObjectMapper json;

    @Value("${ecoresiduos.python.scenario-builder-path:../python-engines/exact_solver/construir_escenario.py}")
    private String rutaConstructor = "../python-engines/exact_solver/construir_escenario.py";

    public AdaptadorConstructorEscenarios(PythonProcessRunner python, ObjectMapper json) {
        this.python = python;
        this.json = json;
    }

    @Override
    public Escenario materializar(Escenario referencia, List<Map<String, Object>> variaciones) {
        var script = python.resolverRutaScript(rutaConstructor);
        if (script == null || !script.isFile()) {
            throw new IllegalStateException("No se encontró el constructor matemático de escenarios");
        }
        Path salida = null;
        Path errores = null;
        try {
            salida = Files.createTempFile("escenario-salida-", ".json");
            errores = Files.createTempFile("escenario-error-", ".txt");
            Process proceso = new ProcessBuilder(python.resolverComandoPython(script))
                    .directory(script.getParentFile())
                    .redirectOutput(salida.toFile())
                    .redirectError(errores.toFile())
                    .start();
            try (var entrada = proceso.getOutputStream()) {
                json.writeValue(entrada, Map.of("escenario", referencia, "variaciones", variaciones));
            }
            if (!proceso.waitFor(30, TimeUnit.SECONDS)) {
                proceso.destroyForcibly();
                throw new IllegalStateException("La construcción del escenario excedió el tiempo permitido");
            }
            if (proceso.exitValue() != 0) {
                throw new IllegalArgumentException(Files.readString(errores).trim());
            }
            return json.readValue(salida.toFile(), Escenario.class);
        } catch (IOException error) {
            throw new IllegalStateException("No se pudo construir el escenario", error);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Construcción interrumpida", error);
        } finally {
            try {
                if (salida != null) Files.deleteIfExists(salida);
                if (errores != null) Files.deleteIfExists(errores);
            } catch (IOException ignored) { }
        }
    }
}
