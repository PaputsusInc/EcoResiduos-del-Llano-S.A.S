package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class ResultadoOptimizacion {

    @JsonProperty("id")
    private String id;

    @JsonProperty("escenario_id")
    private String escenario_id;

    @JsonProperty("metodo_usado")
    private String metodo_usado; // EXACTO, AG

    @JsonProperty("estado")
    private String estado; // EN_EJECUCION, OPTIMO, FACTIBLE_SIN_CERTIFICAR, INFACTIBLE_CERTIFICADO, SIN_CANDIDATO_FACTIBLE_AG, ERROR

    @JsonProperty("causa_estado")
    private String causa_estado;

    @JsonProperty("motivo_finalizacion")
    private String motivo_finalizacion;

    @JsonProperty("costo_total_Z")
    private Double costo_total_Z;

    @JsonProperty("tiempo_ejecucion_s")
    private Double tiempo_ejecucion_s;

    @JsonProperty("matriz_flujos_optimos")
    private Map<String, Double> matriz_flujos_optimos = new LinkedHashMap<>();

    @JsonProperty("sensibilidad_dual")
    private List<PrecioSombraDual> sensibilidad_dual = new ArrayList<>();

    @JsonProperty("analisis_sensibilidad")
    private Map<String, Object> analisis_sensibilidad = new LinkedHashMap<>();

    @JsonProperty("curva_convergencia_fitness")
    private List<Double> curva_convergencia_fitness = new ArrayList<>();

    @JsonProperty("historial_generaciones")
    private List<RegistroGeneracionAG> historial_generaciones = new ArrayList<>();

    @JsonProperty("modelo_formulado")
    private Map<String, Object> modelo_formulado = new LinkedHashMap<>();

    @JsonProperty("pasos_exactos")
    private List<PasoMetodoExacto> pasos_exactos = new ArrayList<>();

    @JsonProperty("parametros_usados")
    private ConfiguracionAG parametros_usados;

    public ResultadoOptimizacion() {
    }

    public ResultadoOptimizacion(String id, String escenario_id, String metodo_usado, String estado) {
        this.id = id;
        this.escenario_id = escenario_id;
        this.metodo_usado = metodo_usado;
        this.estado = estado;
    }

    public ResultadoOptimizacion(String id, String escenario_id, String metodo_usado, String estado,
                                 String causa_estado, String motivo_finalizacion, Double costo_total_Z,
                                 Double tiempo_ejecucion_s, Map<String, Double> matriz_flujos_optimos) {
        this.id = id;
        this.escenario_id = escenario_id;
        this.metodo_usado = metodo_usado;
        this.estado = estado;
        this.causa_estado = causa_estado;
        this.motivo_finalizacion = motivo_finalizacion;
        this.costo_total_Z = costo_total_Z;
        this.tiempo_ejecucion_s = tiempo_ejecucion_s;
        this.matriz_flujos_optimos = matriz_flujos_optimos != null ? new LinkedHashMap<>(matriz_flujos_optimos) : new LinkedHashMap<>();
    }

    public synchronized void anexar_paso_exacto(PasoMetodoExacto paso) {
        if (paso != null) {
            if (this.pasos_exactos == null) {
                this.pasos_exactos = new ArrayList<>();
            }
            this.pasos_exactos.add(paso);
        }
    }

    public synchronized void anexar_generacion_ag(RegistroGeneracionAG registro) {
        if (registro != null) {
            if (this.historial_generaciones == null) {
                this.historial_generaciones = new ArrayList<>();
            }
            this.historial_generaciones.add(registro);
            if (registro.getMejor_aptitud() != null) {
                if (this.curva_convergencia_fitness == null) {
                    this.curva_convergencia_fitness = new ArrayList<>();
                }
                this.curva_convergencia_fitness.add(registro.getMejor_aptitud());
            }
        }
    }

    public Boolean comprobar_factibilidad_flujos(Escenario escenario, Double tolerancia) {
        if (escenario == null || this.matriz_flujos_optimos == null) {
            return false;
        }
        double tol = tolerancia != null ? tolerancia : 1e-6;

        // 1. Verificar no negatividad y bloqueo de rutas inactivas
        for (Map.Entry<String, Double> entry : this.matriz_flujos_optimos.entrySet()) {
            Double flujo = entry.getValue();
            if (flujo == null || flujo < -tol) {
                return false;
            }
            if (flujo > tol && escenario.getRutas() != null && !escenario.getRutas().isEmpty()) {
                Optional<Ruta> rOpt = escenario.getRutas().stream()
                        .filter(r -> Objects.equals(r.getId(), entry.getKey()))
                        .findFirst();
                if (rOpt.isPresent()) {
                    Ruta r = rOpt.get();
                    if (Boolean.FALSE.equals(r.getActiva()) || Boolean.FALSE.equals(r.getCompatible())) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }

        // 2. Verificar que cada empresa cubra exactamente su oferta: sum_j x_ij == oferta_i
        for (Empresa emp : escenario.getEmpresas()) {
            double sumaSalida = 0.0;
            for (Planta pla : escenario.getPlantas()) {
                String conexion = emp.getId() + "->" + pla.getId();
                Double x = this.matriz_flujos_optimos.getOrDefault(conexion, 0.0);
                if (x != null) {
                    sumaSalida += x;
                }
            }
            double ofertaEsperada = emp.getOferta_t() != null ? emp.getOferta_t() : 0.0;
            if (Math.abs(sumaSalida - ofertaEsperada) > tol) {
                return false;
            }
        }

        // 3. Verificar que ninguna planta exceda su capacidad: sum_i x_ij <= capacidad_j
        for (Planta pla : escenario.getPlantas()) {
            double sumaEntrada = 0.0;
            for (Empresa emp : escenario.getEmpresas()) {
                String conexion = emp.getId() + "->" + pla.getId();
                Double x = this.matriz_flujos_optimos.getOrDefault(conexion, 0.0);
                if (x != null) {
                    sumaEntrada += x;
                }
            }
            double capacidadMaxima = pla.getCapacidad_maxima_t() != null ? pla.getCapacidad_maxima_t() : 0.0;
            if (sumaEntrada > capacidadMaxima + tol) {
                return false;
            }
        }

        return true;
    }

    public List<Map<String, Object>> obtener_desglose_asignaciones(Escenario escenario) {
        List<Map<String, Object>> desglose = new ArrayList<>();
        if (this.matriz_flujos_optimos == null || escenario == null) {
            return desglose;
        }

        for (Map.Entry<String, Double> entry : this.matriz_flujos_optimos.entrySet()) {
            Double toneladas = entry.getValue();
            if (toneladas != null && toneladas > 1e-6) {
                String key = entry.getKey();
                String empId = "";
                String plaId = "";
                if (key.contains("->")) {
                    String[] parts = key.split("->");
                    empId = parts[0];
                    plaId = parts[1];
                }

                Double costoUnitario = 0.0;
                if (escenario.getRutas() != null) {
                    for (Ruta r : escenario.getRutas()) {
                        if (Objects.equals(r.getId(), key)) {
                            costoUnitario = r.getCosto_unitario_t() != null ? r.getCosto_unitario_t() : 0.0;
                            break;
                        }
                    }
                }

                Double costoTransporte = costoUnitario * toneladas;

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("conexion_id", key);
                item.put("empresa_id", empId);
                item.put("planta_id", plaId);
                item.put("toneladas", toneladas);
                item.put("costo_unitario_t", costoUnitario);
                item.put("costo_transporte", costoTransporte);
                desglose.add(item);
            }
        }
        return desglose;
    }

    public List<PrecioSombraDual> obtener_precios_sombra() {
        return this.sensibilidad_dual != null ? new ArrayList<>(this.sensibilidad_dual) : new ArrayList<>();
    }

    public List<PrecioSombraDual> obtener_rangos_sensibilidad() {
        List<PrecioSombraDual> rangos = new ArrayList<>();
        if (this.sensibilidad_dual != null) {
            for (PrecioSombraDual ps : this.sensibilidad_dual) {
                if (ps.getLimite_inferior() != null || ps.getLimite_superior() != null) {
                    rangos.add(ps);
                }
            }
        }
        return rangos;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEscenario_id() {
        return escenario_id;
    }

    public void setEscenario_id(String escenario_id) {
        this.escenario_id = escenario_id;
    }

    public String getMetodo_usado() {
        return metodo_usado;
    }

    public void setMetodo_usado(String metodo_usado) {
        this.metodo_usado = metodo_usado;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getCausa_estado() {
        return causa_estado;
    }

    public void setCausa_estado(String causa_estado) {
        this.causa_estado = causa_estado;
    }

    public String getMotivo_finalizacion() {
        return motivo_finalizacion;
    }

    public void setMotivo_finalizacion(String motivo_finalizacion) {
        this.motivo_finalizacion = motivo_finalizacion;
    }

    public Double getCosto_total_Z() {
        return costo_total_Z;
    }

    public void setCosto_total_Z(Double costo_total_Z) {
        this.costo_total_Z = costo_total_Z;
    }

    public Double getTiempo_ejecucion_s() {
        return tiempo_ejecucion_s;
    }

    public void setTiempo_ejecucion_s(Double tiempo_ejecucion_s) {
        this.tiempo_ejecucion_s = tiempo_ejecucion_s;
    }

    public Map<String, Double> getMatriz_flujos_optimos() {
        return matriz_flujos_optimos;
    }

    public void setMatriz_flujos_optimos(Map<String, Double> matriz_flujos_optimos) {
        this.matriz_flujos_optimos = matriz_flujos_optimos != null ? new LinkedHashMap<>(matriz_flujos_optimos) : new LinkedHashMap<>();
    }

    public List<PrecioSombraDual> getSensibilidad_dual() {
        return sensibilidad_dual;
    }

    public void setSensibilidad_dual(List<PrecioSombraDual> sensibilidad_dual) {
        this.sensibilidad_dual = sensibilidad_dual != null ? new ArrayList<>(sensibilidad_dual) : new ArrayList<>();
    }

    public Map<String, Object> getAnalisis_sensibilidad() {
        return analisis_sensibilidad;
    }

    public void setAnalisis_sensibilidad(Map<String, Object> analisis_sensibilidad) {
        this.analisis_sensibilidad = analisis_sensibilidad != null
                ? new LinkedHashMap<>(analisis_sensibilidad) : new LinkedHashMap<>();
    }

    public List<Double> getCurva_convergencia_fitness() {
        return curva_convergencia_fitness;
    }

    public void setCurva_convergencia_fitness(List<Double> curva_convergencia_fitness) {
        this.curva_convergencia_fitness = curva_convergencia_fitness != null ? new ArrayList<>(curva_convergencia_fitness) : new ArrayList<>();
    }

    public List<RegistroGeneracionAG> getHistorial_generaciones() {
        return historial_generaciones;
    }

    public void setHistorial_generaciones(List<RegistroGeneracionAG> historial_generaciones) {
        this.historial_generaciones = historial_generaciones != null ? new ArrayList<>(historial_generaciones) : new ArrayList<>();
    }

    public Map<String, Object> getModelo_formulado() {
        return modelo_formulado;
    }

    public void setModelo_formulado(Map<String, Object> modelo_formulado) {
        this.modelo_formulado = modelo_formulado != null ? new LinkedHashMap<>(modelo_formulado) : new LinkedHashMap<>();
    }

    public List<PasoMetodoExacto> getPasos_exactos() {
        return pasos_exactos;
    }

    public void setPasos_exactos(List<PasoMetodoExacto> pasos_exactos) {
        this.pasos_exactos = pasos_exactos != null ? new ArrayList<>(pasos_exactos) : new ArrayList<>();
    }

    public ConfiguracionAG getParametros_usados() {
        return parametros_usados;
    }

    public void setParametros_usados(ConfiguracionAG parametros_usados) {
        this.parametros_usados = parametros_usados;
    }
}
