package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RegistroGeneracionAG {

    @JsonProperty("ejecucion_id")
    private String ejecucion_id;

    @JsonProperty("numero")
    private Integer numero;

    @JsonProperty("mejor_costo_factible")
    private Double mejor_costo_factible;

    @JsonProperty("mejor_costo_acumulado")
    private Double mejor_costo_acumulado;

    @JsonProperty("candidatos_factibles")
    private Integer candidatos_factibles;

    @JsonProperty("mejor_aptitud")
    private Double mejor_aptitud;

    public RegistroGeneracionAG() {
    }

    public RegistroGeneracionAG(String ejecucion_id, Integer numero, Double mejor_costo_factible,
                                Double mejor_costo_acumulado, Integer candidatos_factibles, Double mejor_aptitud) {
        this.ejecucion_id = ejecucion_id;
        this.numero = numero;
        this.mejor_costo_factible = mejor_costo_factible;
        this.mejor_costo_acumulado = mejor_costo_acumulado;
        this.candidatos_factibles = candidatos_factibles;
        this.mejor_aptitud = mejor_aptitud;
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

    public Double getMejor_costo_factible() {
        return mejor_costo_factible;
    }

    public void setMejor_costo_factible(Double mejor_costo_factible) {
        this.mejor_costo_factible = mejor_costo_factible;
    }

    public Double getMejor_costo_acumulado() {
        return mejor_costo_acumulado;
    }

    public void setMejor_costo_acumulado(Double mejor_costo_acumulado) {
        this.mejor_costo_acumulado = mejor_costo_acumulado;
    }

    public Integer getCandidatos_factibles() {
        return candidatos_factibles;
    }

    public void setCandidatos_factibles(Integer candidatos_factibles) {
        this.candidatos_factibles = candidatos_factibles;
    }

    public Double getMejor_aptitud() {
        return mejor_aptitud;
    }

    public void setMejor_aptitud(Double mejor_aptitud) {
        this.mejor_aptitud = mejor_aptitud;
    }
}

