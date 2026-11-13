package com.ecoresiduos.llano.exposition;

import com.ecoresiduos.llano.application.MotorAnalisisSensibilidad;
import com.ecoresiduos.llano.application.GestorEscenariosSimulacion;
import com.ecoresiduos.llano.application.AjustadorHiperparametrosAG;
import com.ecoresiduos.llano.application.OrquestadorOptimizacion;
import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PerturbacionSensibilidad;
import com.ecoresiduos.llano.domain.model.ReporteComparativo;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.domain.model.Ruta;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class ControladorPeticionesHTTP {

    private static final Set<String> PARAMETROS_AG = Set.of(
            "tamano_poblacion", "generaciones", "tasa_cruce", "tasa_mutacion",
            "metodo_seleccion", "semilla", "tamano_torneo",
            "tipo_cruce", "puntos_cruce", "elitismo", "reemplazos",
            "limite_sin_mejora", "umbral_mejora_cop", "escala_costo_referencia"
    );

    private final OrquestadorOptimizacion orquestador;
    private final MotorAnalisisSensibilidad motorSensibilidad;
    private final ValidadorContratosEntrada validador;
    private final IPuertoRepositorioEscenarios repositorio;
    private final ObjectMapper objectMapper;
    private final GestorEscenariosSimulacion gestorSimulaciones;
    private final AjustadorHiperparametrosAG ajustadorAg;

    @Autowired
    public ControladorPeticionesHTTP(
            OrquestadorOptimizacion orquestador,
            MotorAnalisisSensibilidad motorSensibilidad,
            ValidadorContratosEntrada validador,
            IPuertoRepositorioEscenarios repositorio,
            ObjectMapper objectMapper,
            GestorEscenariosSimulacion gestorSimulaciones,
            AjustadorHiperparametrosAG ajustadorAg) {
        this.orquestador = orquestador;
        this.motorSensibilidad = motorSensibilidad;
        this.validador = validador;
        this.repositorio = repositorio;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.gestorSimulaciones = gestorSimulaciones;
        this.ajustadorAg = ajustadorAg;
    }

    // -------------------------------------------------------------------------
    // Endpoints Generales de Sesión / Lectura
    // -------------------------------------------------------------------------

    @GetMapping("/escenarios")
    public ResponseEntity<Map<String, Object>> get_listar_escenarios() {
        List<Escenario> escenarios = repositorio.listar_escenarios();
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenarios", escenarios);
        resp.put("escenario_activo_id", (escenarios != null && !escenarios.isEmpty()) ? escenarios.get(0).getId() : "ESC-01");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/escenarios/{esc_id}")
    public ResponseEntity<Map<String, Object>> get_obtener_escenario(@PathVariable("esc_id") String esc_id) {
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Escenario no encontrado: " + esc_id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/escenarios/{esc_id}/simulaciones")
    public ResponseEntity<Map<String, Object>> post_crear_simulacion(
            @PathVariable("esc_id") String esc_id, @RequestBody Map<String, Object> payload) {
        String nombre = payload.get("nombre") instanceof String texto ? texto : null;
        List<Map<String, Object>> variaciones = leerVariaciones(payload.get("variaciones"));
        Escenario creado = gestorSimulaciones.crear(esc_id, nombre, variaciones);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("escenario", creado));
    }

    @PutMapping("/escenarios/{esc_id}/simulaciones/{variante_id}")
    public ResponseEntity<Map<String, Object>> put_actualizar_simulacion(
            @PathVariable("esc_id") String esc_id, @PathVariable("variante_id") String variante_id,
            @RequestBody Map<String, Object> payload) {
        String nombre = payload.get("nombre") instanceof String texto ? texto : null;
        List<Map<String, Object>> variaciones = leerVariaciones(payload.get("variaciones"));
        Escenario actualizado = gestorSimulaciones.actualizar(esc_id, variante_id, nombre, variaciones);
        return ResponseEntity.ok(Map.of("escenario", actualizado));
    }

    @PostMapping("/escenarios/{esc_id}/simulaciones/previsualizar")
    public ResponseEntity<Map<String, Object>> post_previsualizar_simulacion(
            @PathVariable("esc_id") String esc_id, @RequestBody Map<String, Object> payload) {
        Escenario referencia = repositorio.obtener_por_id(esc_id);
        if (referencia == null) return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Escenario de referencia no encontrado"));
        if (payload.get("variante_id") instanceof String varianteId) {
            Escenario guardado = repositorio.obtener_por_id(varianteId);
            if (guardado == null || !esc_id.equals(guardado.getReferencia_id())
                    || guardado.getReferencia_snapshot() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Variante guardada inválida"));
            }
            referencia = guardado.getReferencia_snapshot();
        }
        List<Map<String, Object>> variaciones = leerVariaciones(payload.get("variaciones"));
        ResultadoOptimizacion base = orquestador.resolverEscenarioExacto(referencia);
        ResultadoOptimizacion variante = orquestador.analizarVariacionesExactas(referencia, variaciones);
        if ("ERROR_EJECUCION".equals(variante.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("error", variante.getCausa_estado()));
        }
        return ResponseEntity.ok(gestorSimulaciones.resumir(base, variante));
    }

    @PostMapping("/escenarios/{esc_id}/simulaciones/{variante_id}/comparar")
    public ResponseEntity<Map<String, Object>> post_comparar_simulacion(
            @PathVariable("esc_id") String esc_id, @PathVariable("variante_id") String variante_id) {
        return ResponseEntity.ok(gestorSimulaciones.comparar(esc_id, variante_id));
    }

    @PostMapping("/escenarios/{esc_id}/simulaciones/{variante_id}/comparar-metodos")
    public ResponseEntity<Map<String, Object>> post_comparar_metodos_simulacion(
            @PathVariable("esc_id") String esc_id, @PathVariable("variante_id") String variante_id,
            @RequestBody(required = false) Map<String, Object> payload) {
        Escenario variante = repositorio.obtener_por_id(variante_id);
        if (variante == null || !esc_id.equals(variante.getReferencia_id())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Variante no encontrada para la referencia indicada"));
        }
        ConfiguracionAG configAg = extraerConfigAg(payload == null ? null : payload.get("config_ag"));
        List<String> errores = validarConfigAg(configAg, variante);
        if (!errores.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Hiperparámetros AG inválidos", "errores", errores));
        return ResponseEntity.ok(gestorSimulaciones.compararMetodos(esc_id, variante_id, configAg));
    }

    private List<Map<String, Object>> leerVariaciones(Object valor) {
        if (!(valor instanceof List<?> lista) || lista.isEmpty() || lista.size() > 30) {
            throw new IllegalArgumentException("Indica entre 1 y 30 variaciones");
        }
        List<Map<String, Object>> variaciones = new ArrayList<>();
        for (Object elemento : lista) {
            if (!(elemento instanceof Map<?, ?> mapa)) {
                throw new IllegalArgumentException("Cada variación debe ser un objeto");
            }
            Map<String, Object> variacion = new LinkedHashMap<>();
            mapa.forEach((clave, dato) -> variacion.put(String.valueOf(clave), dato));
            variaciones.add(variacion);
        }
        return variaciones;
    }

    @GetMapping("/ejecuciones/{ejecucion_id}")
    public ResponseEntity<Map<String, Object>> get_obtener_ejecucion(@PathVariable("ejecucion_id") String ejecucion_id) {
        ResultadoOptimizacion res = repositorio.obtener_resultado_por_id(ejecucion_id);
        if (res == null) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Ejecución no encontrada: " + ejecucion_id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("resultado", res);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-01: Guardar Empresa
    // -------------------------------------------------------------------------

    @PostMapping("/escenarios/{esc_id}/empresas")
    public ResponseEntity<Map<String, Object>> post_guardar_empresa(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }

        List<String> errores = validador.validar_datos_empresa(payload, escenario);
        if (!errores.isEmpty()) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Datos de empresa inválidos");
            err.put("errores", errores);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        escenario = orquestador.guardar_empresa_y_rutas(esc_id, payload);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        resp.put("rutas_actualizadas", escenario.getRutas());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // -------------------------------------------------------------------------
    // HU-02: Guardar Planta
    // -------------------------------------------------------------------------

    @PostMapping("/escenarios/{esc_id}/plantas")
    public ResponseEntity<Map<String, Object>> post_guardar_planta(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }

        List<String> errores = validador.validar_datos_planta(payload, escenario);
        if (!errores.isEmpty()) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Datos de planta inválidos");
            err.put("errores", errores);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        escenario = orquestador.guardar_planta_y_rutas(esc_id, payload);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        resp.put("rutas_actualizadas", escenario.getRutas());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // -------------------------------------------------------------------------
    // HU-03: Actualizar Oferta de Empresa
    // -------------------------------------------------------------------------

    @PutMapping("/escenarios/{esc_id}/empresas/{emp_id}/oferta")
    public ResponseEntity<Map<String, Object>> put_actualizar_oferta(
            @PathVariable("esc_id") String esc_id,
            @PathVariable("emp_id") String emp_id,
            @RequestBody Map<String, Object> payload) {

        Double nuevaOferta = toDouble(payload.get("oferta_t"));
        if (nuevaOferta == null || nuevaOferta < 0.0) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "La oferta debe ser un número no negativo");
            err.put("errores", List.of("La oferta_t debe ser >= 0.0"));
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Escenario escenario = orquestador.modificar_oferta_empresa(esc_id, emp_id, nuevaOferta);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/escenarios/{esc_id}/ofertas")
    public ResponseEntity<Map<String, Object>> put_actualizar_ofertas_lote(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Object ofertasObj = payload.get("ofertas");
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado"));
        }

        if (ofertasObj instanceof Map<?, ?> mapOfertas) {
            for (Map.Entry<?, ?> entry : mapOfertas.entrySet()) {
                String empId = String.valueOf(entry.getKey());
                Double val = toDouble(entry.getValue());
                if (val != null && val >= 0.0) {
                    escenario = orquestador.modificar_oferta_empresa(esc_id, empId, val);
                }
            }
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-04: Actualizar Capacidad de Planta
    // -------------------------------------------------------------------------

    @PutMapping("/escenarios/{esc_id}/plantas/{pla_id}/capacidad")
    public ResponseEntity<Map<String, Object>> put_actualizar_capacidad(
            @PathVariable("esc_id") String esc_id,
            @PathVariable("pla_id") String pla_id,
            @RequestBody Map<String, Object> payload) {

        Double nuevaCapacidad = toDouble(payload.get("capacidad_maxima_t"));
        if (nuevaCapacidad == null || nuevaCapacidad < 0.0) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "La capacidad máxima debe ser un número no negativo");
            err.put("errores", List.of("La capacidad_maxima_t debe ser >= 0.0"));
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Escenario escenario = orquestador.modificar_capacidad_planta(esc_id, pla_id, nuevaCapacidad);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/escenarios/{esc_id}/capacidades")
    public ResponseEntity<Map<String, Object>> put_actualizar_capacidades_lote(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Object capsObj = payload.get("capacidades");
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado"));
        }

        if (capsObj instanceof Map<?, ?> mapCaps) {
            for (Map.Entry<?, ?> entry : mapCaps.entrySet()) {
                String plaId = String.valueOf(entry.getKey());
                Double val = toDouble(entry.getValue());
                if (val != null && val >= 0.0) {
                    escenario = orquestador.modificar_capacidad_planta(esc_id, plaId, val);
                }
            }
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-05: Consultar Rutas y Reintentar OSRM
    // -------------------------------------------------------------------------

    @GetMapping("/escenarios/{esc_id}/rutas")
    public ResponseEntity<Map<String, Object>> get_consultar_rutas_mapa(
            @PathVariable("esc_id") String esc_id,
            @RequestParam(value = "empresa_id", required = false) String emp_id,
            @RequestParam(value = "planta_id", required = false) String pla_id) {

        Escenario esc = repositorio.obtener_por_id(esc_id);
        if (esc == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }

        List<Ruta> rutas = orquestador.consultar_recorridos_viales_osrm(esc_id, emp_id, pla_id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario_id", esc_id);
        resp.put("rutas", rutas);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/escenarios/{esc_id}/rutas/{ruta_id}/reintentar-osrm")
    public ResponseEntity<Map<String, Object>> post_reintentar_consulta_vial(
            @PathVariable("esc_id") String esc_id,
            @PathVariable("ruta_id") String ruta_id) {

        Ruta ruta = orquestador.reintentar_consulta_vial_osrm(esc_id, ruta_id);
        Escenario esc = repositorio.obtener_por_id(esc_id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ruta", ruta);
        resp.put("escenario", esc);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-06: Actualizar Costos de Transporte
    // -------------------------------------------------------------------------

    @PutMapping("/escenarios/{esc_id}/costos")
    public ResponseEntity<Map<String, Object>> put_actualizar_matriz_costos(
            @PathVariable("esc_id") String esc_id, @RequestBody Map<String, Object> payload) {
        if (payload == null || !(payload.get("costos") instanceof Map<?, ?> entradas) || entradas.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Envía un mapa no vacío de costos por ruta"));
        }
        Map<String, Double> costos = new LinkedHashMap<>();
        for (var entrada : entradas.entrySet()) {
            if (!(entrada.getKey() instanceof String rutaId) || !(entrada.getValue() instanceof Number numero)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cada ruta necesita un costo numérico"));
            }
            double costo = numero.doubleValue();
            if (!Double.isFinite(costo) || costo < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Costo inválido para " + rutaId));
            }
            costos.put(rutaId, costo);
        }
        Escenario escenario = orquestador.modificar_matriz_costos(esc_id, costos);
        return ResponseEntity.ok(Map.of("escenario", escenario, "matriz_costos", escenario.obtener_matriz_costos()));
    }

    @PutMapping("/escenarios/{esc_id}/tarifa")
    public ResponseEntity<Map<String, Object>> put_aplicar_tarifa_global(
            @PathVariable("esc_id") String esc_id, @RequestBody Map<String, Object> payload) {
        if (payload == null || !(payload.get("tarifa_t_km") instanceof Number numero)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Indica una tarifa numérica por tonelada y kilómetro"));
        }
        Escenario escenario = orquestador.aplicar_tarifa_global(esc_id, numero.doubleValue());
        return ResponseEntity.ok(Map.of("escenario", escenario, "matriz_costos", escenario.obtener_matriz_costos()));
    }

    @PutMapping("/escenarios/{esc_id}/rutas/{ruta_id}/costo")
    public ResponseEntity<Map<String, Object>> put_actualizar_costo_transporte(
            @PathVariable("esc_id") String esc_id,
            @PathVariable("ruta_id") String ruta_id,
            @RequestBody Map<String, Object> payload) {

        Double costoUnitario = toDouble(payload.get("costo_unitario_t"));
        Double tarifa = toDouble(payload.get("tarifa_t_km"));

        if (costoUnitario == null && tarifa == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe proporcionar costo_unitario_t o tarifa_t_km"));
        }
        if (costoUnitario != null && costoUnitario < 0.0) {
            return ResponseEntity.badRequest().body(Map.of("error", "costo_unitario_t debe ser >= 0.0"));
        }
        if (tarifa != null && tarifa < 0.0) {
            return ResponseEntity.badRequest().body(Map.of("error", "tarifa_t_km debe ser >= 0.0"));
        }

        Escenario escenario = orquestador.modificar_costo_transporte(esc_id, ruta_id, costoUnitario, tarifa);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        resp.put("matriz_costos", escenario.obtener_matriz_costos());
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-07: Validar Escenario
    // -------------------------------------------------------------------------

    @PostMapping("/escenarios/{esc_id}/validar")
    public ResponseEntity<Map<String, Object>> post_validar_escenario(@PathVariable("esc_id") String esc_id) {
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }

        List<String> inconsistencias = orquestador.verificar_consistencia_escenario(esc_id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);

        if (inconsistencias.isEmpty()) {
            resp.put("valido", true);
            resp.put("inconsistencias", Collections.emptyList());
            return ResponseEntity.ok(resp);
        } else {
            resp.put("valido", false);
            resp.put("inconsistencias", inconsistencias);
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(resp);
        }
    }

    @PostMapping("/escenarios/{esc_id}/simular-inconsistencia")
    public ResponseEntity<Map<String, Object>> post_simular_inconsistencia(@PathVariable("esc_id") String esc_id) {
        repositorio.simular_inconsistencia_demo(esc_id);
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        List<String> inconsistencias = orquestador.verificar_consistencia_escenario(esc_id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        resp.put("valido", inconsistencias.isEmpty());
        resp.put("inconsistencias", inconsistencias);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/escenarios/{esc_id}/corregir-inconsistencias")
    public ResponseEntity<Map<String, Object>> post_corregir_inconsistencias(@PathVariable("esc_id") String esc_id) {
        repositorio.corregir_inconsistencias_demo(esc_id);
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        List<String> inconsistencias = orquestador.verificar_consistencia_escenario(esc_id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("escenario", escenario);
        resp.put("valido", inconsistencias.isEmpty());
        resp.put("inconsistencias", inconsistencias);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-08, HU-09, HU-16, HU-17, HU-18, HU-19: Ejecutar Optimización
    // -------------------------------------------------------------------------

    @PostMapping("/escenarios/{esc_id}/optimizar")
    public ResponseEntity<Map<String, Object>> post_ejecutar_optimizacion(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }

        // Validación previa de integridad (HU-07)
        List<String> inconsistencias = orquestador.verificar_consistencia_escenario(esc_id);
        if (!inconsistencias.isEmpty()) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("valido", false);
            err.put("inconsistencias", inconsistencias);
            err.put("error", "El escenario contiene inconsistencias que impiden su optimización");
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(err);
        }

        String metodo = payload != null && payload.containsKey("metodo")
                ? String.valueOf(payload.get("metodo")).toUpperCase()
                : "EXACTO";

        boolean asincrono = payload != null && Boolean.TRUE.equals(payload.get("asincrono"));
        ConfiguracionAG configAg;
        try {
            configAg = extraerConfigAg(payload != null ? payload.get("config_ag") : null);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }
        if ("AG".equals(metodo) || "COMPARATIVO".equals(metodo)) {
            List<String> erroresAg = validarConfigAg(configAg, escenario);
            if (!erroresAg.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Hiperparámetros AG inválidos", "errores", erroresAg
                ));
            }
        }

        // Si se solicita ejecución asíncrona (HU-18 / HU-19 Polling)
        if (asincrono) {
            ResultadoOptimizacion resultadoInicial = orquestador.iniciar_optimizacion_asincrona(esc_id, metodo, configAg);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("ejecucion_id", resultadoInicial.getId());
            resp.put("estado", resultadoInicial.getEstado());
            resp.put("resultado", resultadoInicial);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(resp);
        }

        // Ejecución síncrona según método
        switch (metodo) {
            case "EXACTO": {
                ResultadoOptimizacion resultado = orquestador.ejecutar_modelo_exacto(esc_id);
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("resultado", resultado);
                resp.put("desglose_asignaciones", resultado.obtener_desglose_asignaciones(escenario));
                resp.put("escenario", escenario);
                return ResponseEntity.ok(resp);
            }
            case "AG": {
                ResultadoOptimizacion resultado = orquestador.ejecutar_algoritmo_genetico(esc_id, configAg);
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("resultado", resultado);
                resp.put("desglose_asignaciones", resultado.obtener_desglose_asignaciones(escenario));
                resp.put("escenario", escenario);
                return ResponseEntity.ok(resp);
            }
            case "COMPARATIVO": {
                ReporteComparativo reporte = orquestador.ejecutar_comparacion_metodos(esc_id, configAg);
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("reporte", reporte);
                return ResponseEntity.ok(resp);
            }
            case "ESCALABILIDAD": {
                List<String> escenariosIds = extraerListaStrings(payload.get("escenarios_ids"));
                List<ReporteComparativo> reportes = orquestador.evaluar_escalabilidad_red(escenariosIds, configAg);
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("reportes", reportes);
                return ResponseEntity.ok(resp);
            }
            default:
                return ResponseEntity.badRequest().body(Map.of("error", "Método desconocido: " + metodo + ". Opciones: EXACTO, AG, COMPARATIVO, ESCALABILIDAD"));
        }
    }

    @PostMapping("/escenarios/{esc_id}/ag/ajustar")
    public ResponseEntity<Map<String, Object>> post_ajustar_hiperparametros_ag(
            @PathVariable("esc_id") String esc_id, @RequestBody Map<String, Object> payload) {
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }
        List<String> inconsistencias = orquestador.verificar_consistencia_escenario(esc_id);
        if (!inconsistencias.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                    "error", "El escenario contiene inconsistencias que impiden el ajuste",
                    "inconsistencias", inconsistencias
            ));
        }
        ConfiguracionAG configuracion;
        try {
            configuracion = extraerConfigAg(payload != null ? payload.get("config_ag") : null);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }
        List<String> errores = validarConfigAg(configuracion, escenario);
        if (!errores.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Hiperparámetros AG inválidos", "errores", errores));
        }
        try {
            return ResponseEntity.ok(ajustadorAg.ajustar(esc_id, configuracion));
        } catch (IllegalStateException | IllegalArgumentException error) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", error.getMessage()));
        }
    }

    private List<String> validarConfigAg(ConfiguracionAG configAg, Escenario escenario) {
        List<String> errores = validador.validar_hiperparametros_ag(configAg);
        int genes = escenario.getEmpresas().size() + escenario.getPlantas().size();
        if ("BLOQUES_ORDEN".equals(configAg.getTipo_cruce())
                && configAg.getPuntos_cruce() != null && configAg.getPuntos_cruce() >= genes) {
            errores.add("Los puntos de cruce deben ser menores que M + N (" + genes + ").");
        }
        return errores;
    }

    // -------------------------------------------------------------------------
    // HU-10, HU-11, HU-12, HU-13: Análisis de Sensibilidad
    // -------------------------------------------------------------------------

    @PostMapping("/escenarios/{esc_id}/sensibilidad-exacta")
    public ResponseEntity<Map<String, Object>> post_analizar_sensibilidad_exacta(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> variacion) {
        Escenario escenario = repositorio.obtener_por_id(esc_id);
        if (escenario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Escenario no encontrado: " + esc_id));
        }
        if (variacion == null || !(variacion.get("tipo") instanceof String)
                || !(variacion.get("porcentaje") instanceof Number)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variación inválida"));
        }
        ResultadoOptimizacion resultado = orquestador.analizarVariacionExacta(escenario, variacion);
        return ResponseEntity.ok(Map.of("resultado", resultado));
    }

    @PostMapping("/escenarios/{esc_id}/sensibilidad")
    public ResponseEntity<Map<String, Object>> post_ejecutar_sensibilidad(
            @PathVariable("esc_id") String esc_id,
            @RequestBody Map<String, Object> payload) {

        Escenario referencia = repositorio.obtener_por_id(esc_id);
        if (referencia == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Escenario de referencia no encontrado: " + esc_id));
        }

        String tipoVariacion = payload != null && payload.containsKey("tipo_variacion")
                ? String.valueOf(payload.get("tipo_variacion")).toUpperCase()
                : "COSTOS";

        List<PerturbacionSensibilidad> perturbaciones = extraerPerturbaciones(payload != null ? payload.get("perturbaciones") : null);
        ConfiguracionAG configAg;
        try {
            configAg = extraerConfigAg(payload != null ? payload.get("config_ag") : null);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }

        Escenario variante;
        switch (tipoVariacion) {
            case "OFERTA":
                variante = motorSensibilidad.generar_variante_oferta(esc_id, perturbaciones);
                break;
            case "CAPACIDAD":
                variante = motorSensibilidad.generar_variante_capacidad(esc_id, perturbaciones);
                break;
            case "COSTOS":
            default:
                variante = motorSensibilidad.generar_variante_costos(esc_id, perturbaciones);
                break;
        }

        Map<String, Object> evaluacion = motorSensibilidad.evaluar_escenario_sensibilidad(esc_id, variante.getId(), configAg);
        evaluacion.put("perturbaciones_aplicadas", perturbaciones);
        return ResponseEntity.ok(evaluacion);
    }

    // -------------------------------------------------------------------------
    // HU-18: Polling de Evolución AG
    // -------------------------------------------------------------------------

    @GetMapping("/optimizacion/evolucion-ag/{ejecucion_id}")
    public ResponseEntity<Map<String, Object>> get_consultar_evolucion_ag(@PathVariable("ejecucion_id") String ejecucion_id) {
        ResultadoOptimizacion resultado = orquestador.consultar_seguimiento_ag(ejecucion_id);
        if (resultado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ejecución no encontrada: " + ejecucion_id));
        }

        int avanceGen = 0;
        if (resultado.getHistorial_generaciones() != null && !resultado.getHistorial_generaciones().isEmpty()) {
            avanceGen = resultado.getHistorial_generaciones().get(resultado.getHistorial_generaciones().size() - 1).getNumero();
        }

        int maxGen = resultado.getParametros_usados() != null && resultado.getParametros_usados().getGeneraciones() != null
                ? resultado.getParametros_usados().getGeneraciones()
                : 200;

        boolean enCurso = "EN_EJECUCION".equalsIgnoreCase(resultado.getEstado());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("resultado", resultado);
        resp.put("avance_generacion", avanceGen);
        resp.put("max_generaciones", maxGen);
        resp.put("en_curso", enCurso);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // HU-14, HU-15, HU-19: Procedimiento Exacto y Análisis Dual
    // -------------------------------------------------------------------------

    @GetMapping("/optimizacion/procedimiento-exacto/{ejecucion_id}")
    public ResponseEntity<Map<String, Object>> get_consultar_procedimiento_exacto(@PathVariable("ejecucion_id") String ejecucion_id) {
        ResultadoOptimizacion resultado = orquestador.consultar_procedimiento_exacto(ejecucion_id);
        if (resultado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ejecución no encontrada: " + ejecucion_id));
        }

        Escenario escenario = repositorio.obtener_por_id(resultado.getEscenario_id());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("resultado", resultado);
        resp.put("precios_sombra", resultado.obtener_precios_sombra());
        resp.put("rangos_sensibilidad", resultado.obtener_rangos_sensibilidad());
        resp.put("desglose_asignaciones", resultado.obtener_desglose_asignaciones(escenario));
        resp.put("escenario", escenario);
        return ResponseEntity.ok(resp);
    }

    // -------------------------------------------------------------------------
    // Métodos Auxiliares de Conversión
    // -------------------------------------------------------------------------

    private Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private ConfiguracionAG extraerConfigAg(Object obj) {
        if (obj == null) {
            return new ConfiguracionAG(100, 200, 0.80, 0.05, "TORNEO", 42);
        }
        if (!(obj instanceof Map<?, ?> datos)) {
            throw new IllegalArgumentException("config_ag debe ser un objeto JSON");
        }
        for (Object clave : datos.keySet()) {
            if (!PARAMETROS_AG.contains(clave)) {
                throw new IllegalArgumentException("Parámetro AG desconocido: " + clave);
            }
        }
        try {
            return objectMapper.convertValue(obj, ConfiguracionAG.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("config_ag debe ser un objeto JSON válido", e);
        }
    }

    private List<String> extraerListaStrings(Object obj) {
        if (obj instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object o : list) {
                if (o != null) result.add(o.toString());
            }
            return result;
        }
        return List.of("ESC-01", "ESC-AMP-20x6", "ESC-AMP-30x8");
    }

    private List<PerturbacionSensibilidad> extraerPerturbaciones(Object obj) {
        if (obj instanceof List<?> list) {
            try {
                return objectMapper.convertValue(list, new TypeReference<List<PerturbacionSensibilidad>>() {});
            } catch (Exception e) {
                return Collections.emptyList();
            }
        }
        return Collections.emptyList();
    }
}
