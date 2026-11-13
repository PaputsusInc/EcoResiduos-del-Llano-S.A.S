package com.ecoresiduos.llano.application;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import com.ecoresiduos.llano.infrastructure.optimizer.PythonProcessRunner;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class GestorEscenariosSimulacion {
    private final IPuertoRepositorioEscenarios repositorio;
    private final OrquestadorOptimizacion orquestador;
    private final PythonProcessRunner python;
    private final ObjectMapper json;

    @Value("${ecoresiduos.python.scenario-builder-path:../python-engines/exact_solver/construir_escenario.py}")
    private String rutaConstructor = "../python-engines/exact_solver/construir_escenario.py";

    public GestorEscenariosSimulacion(IPuertoRepositorioEscenarios repositorio,
            OrquestadorOptimizacion orquestador, PythonProcessRunner python, ObjectMapper json) {
        this.repositorio = repositorio;
        this.orquestador = orquestador;
        this.python = python;
        this.json = json;
    }

    public Escenario crear(String referenciaId, String nombre, List<Map<String, Object>> variaciones) {
        Escenario referencia = repositorio.obtener_por_id(referenciaId);
        if (referencia == null) throw new IllegalArgumentException("Escenario de referencia no encontrado");
        if (nombre == null || nombre.isBlank() || nombre.trim().length() > 100) {
            throw new IllegalArgumentException("El nombre debe tener entre 1 y 100 caracteres");
        }
        if (variaciones == null || variaciones.isEmpty() || variaciones.size() > 30) {
            throw new IllegalArgumentException("Indica entre 1 y 30 variaciones");
        }
        Escenario variante = materializar(referencia, variaciones);
        variante.setId("SIM-" + UUID.randomUUID());
        variante.setNombre(nombre.trim());
        variante.setReferencia_id(referenciaId);
        variante.setVariaciones(variaciones);
        variante.setProcedencia_datos("Simulación de " + referenciaId);
        variante.setReferencia_snapshot(referencia.clonar_profundo(referencia.getId(), referencia.getNombre()));
        repositorio.guardar(variante);
        return variante;
    }

    public Escenario actualizar(String referenciaId, String varianteId, String nombre,
            List<Map<String, Object>> variaciones) {
        Escenario anterior = repositorio.obtener_por_id(varianteId);
        if (anterior == null || !referenciaId.equals(anterior.getReferencia_id())) {
            throw new IllegalArgumentException("La variante no pertenece a la referencia indicada");
        }
        if (nombre == null || nombre.isBlank() || nombre.trim().length() > 100) {
            throw new IllegalArgumentException("El nombre debe tener entre 1 y 100 caracteres");
        }
        if (variaciones == null || variaciones.isEmpty() || variaciones.size() > 30) {
            throw new IllegalArgumentException("Indica entre 1 y 30 variaciones");
        }
        Escenario base = anterior.getReferencia_snapshot();
        if (base == null) throw new IllegalStateException("La variante no conserva su referencia original");
        Escenario variante = materializar(base, variaciones);
        variante.setId(varianteId);
        variante.setNombre(nombre.trim());
        variante.setReferencia_id(referenciaId);
        variante.setReferencia_snapshot(base);
        variante.setVariaciones(variaciones);
        variante.setProcedencia_datos(anterior.getProcedencia_datos());
        repositorio.guardar(variante);
        return variante;
    }

    private Escenario materializar(Escenario referencia, List<Map<String, Object>> variaciones) {
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

    public Map<String, Object> comparar(String referenciaId, String varianteId) {
        Escenario variante = repositorio.obtener_por_id(varianteId);
        if (variante == null || !referenciaId.equals(variante.getReferencia_id())) {
            throw new IllegalArgumentException("La variante no pertenece a la referencia indicada");
        }
        Escenario referencia = variante.getReferencia_snapshot();
        if (referencia == null) throw new IllegalStateException("La variante no conserva su referencia original");
        ResultadoOptimizacion base = orquestador.resolverEscenarioExacto(referencia);
        ResultadoOptimizacion simulacion = orquestador.ejecutar_modelo_exacto(varianteId);
        return resumir(base, simulacion);
    }

    public Map<String, Object> resumir(ResultadoOptimizacion base, ResultadoOptimizacion simulacion) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("referencia", base);
        respuesta.put("variante", simulacion);
        if (base.getCosto_total_Z() != null && simulacion.getCosto_total_Z() != null) {
            respuesta.put("delta_costo_cop", simulacion.getCosto_total_Z() - base.getCosto_total_Z());
            Map<String, Double> cambios = new LinkedHashMap<>();
            var rutas = new java.util.LinkedHashSet<>(base.getMatriz_flujos_optimos().keySet());
            rutas.addAll(simulacion.getMatriz_flujos_optimos().keySet());
            for (String ruta : rutas) {
                double delta = simulacion.getMatriz_flujos_optimos().getOrDefault(ruta, 0.0)
                        - base.getMatriz_flujos_optimos().getOrDefault(ruta, 0.0);
                if (Math.abs(delta) > 1e-7) cambios.put(ruta, delta);
            }
            respuesta.put("cambios_flujo_t", cambios);
        }
        return respuesta;
    }
}
