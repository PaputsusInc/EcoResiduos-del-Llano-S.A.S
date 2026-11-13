package com.ecoresiduos.llano.infrastructure.optimizer;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PasoMetodoExacto;
import com.ecoresiduos.llano.domain.model.PrecioSombraDual;
import com.ecoresiduos.llano.domain.model.RegistroGeneracionAG;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class PythonProcessRunner {

    private static final Logger log = LoggerFactory.getLogger(PythonProcessRunner.class);

    private final ObjectMapper objectMapper;

    @Value("${ecoresiduos.python.binary:}")
    private String configuredPythonBinary;

    public PythonProcessRunner() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @Autowired
    public PythonProcessRunner(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public File resolverRutaScript(String configurada) {
        if (configurada == null || configurada.isBlank()) {
            return null;
        }
        File f = new File(configurada);
        if (f.exists()) {
            return f.getAbsoluteFile();
        }
        String cleaned = configurada.replace("../", "").replace("./", "");
        File f2 = new File(cleaned);
        if (f2.exists()) {
            return f2.getAbsoluteFile();
        }
        File current = new File(".").getAbsoluteFile();
        while (current != null) {
            File candidate = new File(current, cleaned);
            if (candidate.exists()) {
                return candidate.getAbsoluteFile();
            }
            File candidateInEngines = new File(current, "python-engines/" + cleaned.replace("python-engines/", ""));
            if (candidateInEngines.exists()) {
                return candidateInEngines.getAbsoluteFile();
            }
            current = current.getParentFile();
        }
        return f.getAbsoluteFile();
    }

    public List<String> resolverComandoPython(File scriptFile) {
        List<String> comando = new ArrayList<>();
        if (configuredPythonBinary != null && !configuredPythonBinary.trim().isEmpty()) {
            String[] tokens = configuredPythonBinary.trim().split("\\s+");
            comando.addAll(Arrays.asList(tokens));
        } else {
            boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
            String interpreteVenv = isWindows ? ".venv/Scripts/python.exe" : ".venv/bin/python";
            File directorioMotores = scriptFile.getParentFile().getParentFile();
            File venv = new File(directorioMotores.getParentFile(), interpreteVenv);
            if (venv.isFile()) {
                comando.add(venv.getAbsolutePath());
            } else if (isWindows) {
                // En Windows, py -3 invoca el launcher oficial que contiene numpy y scipy
                comando.add("py");
                comando.add("-3");
            } else {
                comando.add("python3");
            }
        }
        comando.add(scriptFile.getAbsolutePath());
        return comando;
    }

    /**
     * Ejecuta una solicitud breve de entrada/salida JSON, sin historial ni persistencia.
     * El ajuste usa este camino solo cuando el usuario lo pide explícitamente.
     */
    public Map<String, Object> ejecutarJson(String rutaScript, Map<String, Object> payload, int timeoutSegundos) {
        File script = resolverRutaScript(rutaScript);
        if (script == null || !script.isFile()) {
            throw new IllegalStateException("No se encontró el script de ajuste de parámetros.");
        }
        Process proceso = null;
        try {
            ProcessBuilder comando = new ProcessBuilder(resolverComandoPython(script));
            comando.directory(script.getParentFile());
            proceso = comando.start();
            try (var entrada = proceso.getOutputStream()) {
                objectMapper.writeValue(entrada, payload);
            }
            if (!proceso.waitFor(timeoutSegundos, TimeUnit.SECONDS)) {
                proceso.destroyForcibly();
                throw new IllegalStateException("El ajuste superó el tiempo máximo permitido.");
            }
            String salida = new String(proceso.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String errores = new String(proceso.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (proceso.exitValue() != 0) {
                throw new IllegalStateException(errores.isBlank() ? "Falló el ajuste de parámetros." : errores);
            }
            return objectMapper.readValue(salida, new TypeReference<Map<String, Object>>() {});
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpió el ajuste de parámetros.", error);
        } catch (java.io.IOException error) {
            throw new IllegalStateException("No se pudo ejecutar el ajuste de parámetros: " + error.getMessage(), error);
        } finally {
            if (proceso != null && proceso.isAlive()) proceso.destroyForcibly();
        }
    }

    public ResultadoOptimizacion ejecutarProceso(
            String rutaScript,
            Map<String, Object> payload,
            ResultadoOptimizacion resultado,
            Escenario escenario,
            Double toleranciaNumerica,
            IPuertoRepositorioEscenarios repositorio) {

        File scriptFile = resolverRutaScript(rutaScript);
        if (scriptFile == null || !scriptFile.exists()) {
            log.error("Script Python no encontrado en ruta: {}", rutaScript);
            resultado.setEstado("ERROR_EJECUCION");
            resultado.setCausa_estado("No se encontró el script de Python en: " + rutaScript);
            resultado.setMotivo_finalizacion("Ruta de script inexistente");
            if (repositorio != null) {
                repositorio.guardar_resultado(resultado);
            }
            return resultado;
        }

        List<String> comando = resolverComandoPython(scriptFile);
        log.info("Iniciando motor Python con comando: {}", comando);

        Process process = null;
        try {
            ProcessBuilder pb = new ProcessBuilder(comando);
            if (scriptFile.getParentFile() != null) {
                pb.directory(scriptFile.getParentFile());
            }
            process = pb.start();

            // Hilo paralelo para capturar stderr sin bloquear el buffer
            StringBuilder stderrBuffer = new StringBuilder();
            Process finalProcess = process;
            Thread stderrThread = new Thread(() -> {
                try (BufferedReader errReader = new BufferedReader(
                        new InputStreamReader(finalProcess.getErrorStream(), StandardCharsets.UTF_8))) {
                    String errLine;
                    while ((errLine = errReader.readLine()) != null) {
                        stderrBuffer.append(errLine).append("\n");
                    }
                } catch (Exception e) {
                    // Ignorar cierre normal de stream
                }
            });
            stderrThread.setDaemon(true);
            stderrThread.start();

            // Enviar payload JSON a stdin y cerrar el flujo
            byte[] jsonBytes = objectMapper.writeValueAsBytes(payload);
            try (java.io.OutputStream os = process.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }

            // Leer stdout línea por línea en formato JSONL
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) {
                        continue;
                    }

                    try {
                        JsonNode node = objectMapper.readTree(line);
                        String tipo = node.has("TIPO") ? node.get("TIPO").asText() : "";

                        if ("MODELO_FORMULADO".equalsIgnoreCase(tipo)) {
                            if (node.has("modelo_formulado")) {
                                Map<String, Object> mod = objectMapper.convertValue(
                                        node.get("modelo_formulado"),
                                        new TypeReference<Map<String, Object>>() {});
                                resultado.setModelo_formulado(mod);
                                if (repositorio != null) {
                                    repositorio.guardar_resultado(resultado);
                                }
                            }
                        } else if ("PASO_EXACTO".equalsIgnoreCase(tipo)) {
                            PasoMetodoExacto paso = objectMapper.treeToValue(node, PasoMetodoExacto.class);
                            resultado.anexar_paso_exacto(paso);
                            if (repositorio != null) {
                                repositorio.guardar_resultado(resultado);
                            }
                        } else if ("GENERACION_AG".equalsIgnoreCase(tipo)) {
                            RegistroGeneracionAG reg = objectMapper.treeToValue(node, RegistroGeneracionAG.class);
                            resultado.anexar_generacion_ag(reg);
                            if (repositorio != null) {
                                repositorio.guardar_resultado(resultado);
                            }
                        } else if ("RESULTADO_FINAL".equalsIgnoreCase(tipo)) {
                            if (node.hasNonNull("costo_total_Z")) {
                                resultado.setCosto_total_Z(node.get("costo_total_Z").asDouble());
                            }
                            if (node.hasNonNull("tiempo_ejecucion_s")) {
                                resultado.setTiempo_ejecucion_s(node.get("tiempo_ejecucion_s").asDouble());
                            }
                            if (node.hasNonNull("cpu_tiempo_s")) {
                                resultado.setCpu_tiempo_s(node.get("cpu_tiempo_s").asDouble());
                            }
                            if (node.hasNonNull("memoria_pico_mb")) {
                                resultado.setMemoria_pico_mb(node.get("memoria_pico_mb").asDouble());
                            }
                            if (node.hasNonNull("estado")) {
                                resultado.setEstado(node.get("estado").asText());
                            }
                            if (node.hasNonNull("causa_estado")) {
                                resultado.setCausa_estado(node.get("causa_estado").asText());
                            }
                            if (node.hasNonNull("motivo_finalizacion")) {
                                resultado.setMotivo_finalizacion(node.get("motivo_finalizacion").asText());
                            }
                            if (node.has("matriz_flujos_optimos")) {
                                Map<String, Double> flujos = objectMapper.convertValue(
                                        node.get("matriz_flujos_optimos"),
                                        new TypeReference<Map<String, Double>>() {});
                                resultado.setMatriz_flujos_optimos(flujos);
                            }
                            if (node.has("sensibilidad_dual")) {
                                List<PrecioSombraDual> duales = objectMapper.convertValue(
                                        node.get("sensibilidad_dual"),
                                        new TypeReference<List<PrecioSombraDual>>() {});
                                resultado.setSensibilidad_dual(duales);
                            }
                            if (node.has("analisis_sensibilidad")) {
                                Map<String, Object> analisis = objectMapper.convertValue(
                                        node.get("analisis_sensibilidad"),
                                        new TypeReference<Map<String, Object>>() {});
                                resultado.setAnalisis_sensibilidad(analisis);
                            }
                            if (node.has("modelo_formulado") && (resultado.getModelo_formulado() == null || resultado.getModelo_formulado().isEmpty())) {
                                Map<String, Object> mod = objectMapper.convertValue(
                                        node.get("modelo_formulado"),
                                        new TypeReference<Map<String, Object>>() {});
                                resultado.setModelo_formulado(mod);
                            }
                            if (repositorio != null) {
                                repositorio.guardar_resultado(resultado);
                            }
                        }
                    } catch (Exception parseEx) {
                        log.warn("Línea stdout de Python no es JSON esperado: {}", line);
                    }
                }
            }

            int exitCode = process.waitFor();
            stderrThread.join(1000);

            if (exitCode != 0 && "EN_EJECUCION".equals(resultado.getEstado())) {
                log.error("Proceso Python terminó anormalmente con código {}. Stderr: {}", exitCode, stderrBuffer);
                resultado.setEstado("ERROR_EJECUCION");
                resultado.setCausa_estado("Proceso Python terminó con código " + exitCode + ": " + stderrBuffer.toString().trim());
                resultado.setMotivo_finalizacion("Falla en proceso externo");
            } else {
                // Verificar consistencia de flujos si el estado fue óptimo o factible
                if (!payload.containsKey("variacion") &&
                        ("OPTIMO".equals(resultado.getEstado()) || "FACTIBLE_SIN_CERTIFICAR".equals(resultado.getEstado()))) {
                    Boolean factible = resultado.comprobar_factibilidad_flujos(escenario, toleranciaNumerica);
                    log.info("Comprobación de factibilidad de flujos para {}: {}", resultado.getId(), factible);
                }
            }

        } catch (Exception e) {
            log.error("Excepción al ejecutar motor Python: ", e);
            resultado.setEstado("ERROR_EJECUCION");
            resultado.setCausa_estado("Excepción interna: " + e.getMessage());
            resultado.setMotivo_finalizacion("Excepción de ejecución");
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            if (repositorio != null) {
                repositorio.guardar_resultado(resultado);
            }
        }

        return resultado;
    }
}
