package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ConfiguracionAG {

    @JsonProperty("tamano_poblacion")
    private Integer tamano_poblacion = 100;

    @JsonProperty("generaciones")
    private Integer generaciones = 200;

    @JsonProperty("tasa_cruce")
    private Double tasa_cruce = 0.80;

    @JsonProperty("tasa_mutacion")
    private Double tasa_mutacion = 0.05;

    @JsonProperty("metodo_seleccion")
    private String metodo_seleccion = "TORNEO";

    @JsonProperty("factor_penalizacion")
    private Double factor_penalizacion = 1000.0;

    @JsonProperty("semilla")
    private Integer semilla = 42;

    public ConfiguracionAG() {
    }

    public ConfiguracionAG(Integer tamano_poblacion, Integer generaciones, Double tasa_cruce, Double tasa_mutacion,
                           String metodo_seleccion, Double factor_penalizacion) {
        this.tamano_poblacion = tamano_poblacion;
        this.generaciones = generaciones;
        this.tasa_cruce = tasa_cruce;
        this.tasa_mutacion = tasa_mutacion;
        this.metodo_seleccion = metodo_seleccion != null ? metodo_seleccion : "TORNEO";
        this.factor_penalizacion = factor_penalizacion != null ? factor_penalizacion : 1000.0;
        this.semilla = 42;
    }

    public ConfiguracionAG(Integer tamano_poblacion, Integer generaciones, Double tasa_cruce, Double tasa_mutacion,
                           String metodo_seleccion, Double factor_penalizacion, Integer semilla) {
        this.tamano_poblacion = tamano_poblacion;
        this.generaciones = generaciones;
        this.tasa_cruce = tasa_cruce;
        this.tasa_mutacion = tasa_mutacion;
        this.metodo_seleccion = metodo_seleccion != null ? metodo_seleccion : "TORNEO";
        this.factor_penalizacion = factor_penalizacion != null ? factor_penalizacion : 1000.0;
        this.semilla = semilla != null ? semilla : 42;
    }

    public Integer getTamano_poblacion() {
        return tamano_poblacion;
    }

    public void setTamano_poblacion(Integer tamano_poblacion) {
        this.tamano_poblacion = tamano_poblacion;
    }

    public Integer getGeneraciones() {
        return generaciones;
    }

    public void setGeneraciones(Integer generaciones) {
        this.generaciones = generaciones;
    }

    public Double getTasa_cruce() {
        return tasa_cruce;
    }

    public void setTasa_cruce(Double tasa_cruce) {
        this.tasa_cruce = tasa_cruce;
    }

    public Double getTasa_mutacion() {
        return tasa_mutacion;
    }

    public void setTasa_mutacion(Double tasa_mutacion) {
        this.tasa_mutacion = tasa_mutacion;
    }

    public String getMetodo_seleccion() {
        return metodo_seleccion;
    }

    public void setMetodo_seleccion(String metodo_seleccion) {
        this.metodo_seleccion = metodo_seleccion;
    }

    public Double getFactor_penalizacion() {
        return factor_penalizacion;
    }

    public void setFactor_penalizacion(Double factor_penalizacion) {
        this.factor_penalizacion = factor_penalizacion;
    }

    public Integer getSemilla() {
        return semilla;
    }

    public void setSemilla(Integer semilla) {
        this.semilla = semilla;
    }
}

