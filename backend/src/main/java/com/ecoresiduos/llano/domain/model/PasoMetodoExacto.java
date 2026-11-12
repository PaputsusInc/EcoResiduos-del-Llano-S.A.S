package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.Map;

public class PasoMetodoExacto {

    @JsonProperty("ejecucion_id")
    private String ejecucion_id;

    @JsonProperty("numero")
    private Integer numero;

    @JsonProperty("etapa")
    private String etapa; // PREPARACION, FORMULACION, RESOLUCION, VALIDACION

    @JsonProperty("operacion")
    private String operacion;

    @JsonProperty("datos")
    private Map<String, Object> datos = new LinkedHashMap<>();

    public PasoMetodoExacto() {
    }

    public PasoMetodoExacto(String ejecucion_id, Integer numero, String etapa, String operacion, Map<String, Object> datos) {
        this.ejecucion_id = ejecucion_id;
        this.numero = numero;
        this.etapa = etapa;
        this.operacion = operacion;
        this.datos = datos != null ? new LinkedHashMap<>(datos) : new LinkedHashMap<>();
    }

    public String getEjecucion_id() {
        return ejecucion_id;
    }

    public void setEjecucion_id(String ejecucion_id) {
        this.ejecucion_id = ejecucion_id;
    }

    public Integer getNumero() {
        return numero;
    }

    public void setNumero(Integer numero) {
        this.numero = numero;
    }

    public String getEtapa() {
        return etapa;
    }

    public void setEtapa(String etapa) {
        this.etapa = etapa;
    }

    public String getOperacion() {
        return operacion;
    }

    public void setOperacion(String operacion) {
        this.operacion = operacion;
    }

    public Map<String, Object> getDatos() {
        return datos;
    }

    public void setDatos(Map<String, Object> datos) {
        this.datos = datos != null ? new LinkedHashMap<>(datos) : new LinkedHashMap<>();
    }
}

