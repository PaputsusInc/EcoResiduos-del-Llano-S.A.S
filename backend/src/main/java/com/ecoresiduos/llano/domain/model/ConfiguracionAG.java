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

    @JsonProperty("semilla")
    private Integer semilla = 42;

    @JsonProperty("tamano_torneo")
    private Integer tamano_torneo = 3;

    @JsonProperty("tipo_cruce")
    private String tipo_cruce = "OX";

    @JsonProperty("puntos_cruce")
    private Integer puntos_cruce = 2;

    @JsonProperty("elitismo")
    private Integer elitismo = 1;

    @JsonProperty("reemplazos")
    private Integer reemplazos;

    @JsonProperty("limite_sin_mejora")
    private Integer limite_sin_mejora;

    @JsonProperty("umbral_mejora_cop")
    private Double umbral_mejora_cop = 0.0;

    @JsonProperty("escala_costo_referencia")
    private Double escala_costo_referencia = 1000000.0;

    public ConfiguracionAG() {
    }

    public ConfiguracionAG(Integer tamano_poblacion, Integer generaciones, Double tasa_cruce, Double tasa_mutacion,
                           String metodo_seleccion) {
        this.tamano_poblacion = tamano_poblacion;
        this.generaciones = generaciones;
        this.tasa_cruce = tasa_cruce;
        this.tasa_mutacion = tasa_mutacion;
        this.metodo_seleccion = metodo_seleccion != null ? metodo_seleccion : "TORNEO";
        this.semilla = 42;
    }

    public ConfiguracionAG(Integer tamano_poblacion, Integer generaciones, Double tasa_cruce, Double tasa_mutacion,
                           String metodo_seleccion, Integer semilla) {
        this.tamano_poblacion = tamano_poblacion;
        this.generaciones = generaciones;
        this.tasa_cruce = tasa_cruce;
        this.tasa_mutacion = tasa_mutacion;
        this.metodo_seleccion = metodo_seleccion != null ? metodo_seleccion : "TORNEO";
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

    public Integer getSemilla() {
        return semilla;
    }

    public void setSemilla(Integer semilla) {
        this.semilla = semilla;
    }

    public Integer getTamano_torneo() { return tamano_torneo; }
    public void setTamano_torneo(Integer valor) { this.tamano_torneo = valor; }

    public String getTipo_cruce() { return tipo_cruce; }
    public void setTipo_cruce(String valor) { this.tipo_cruce = valor; }

    public Integer getPuntos_cruce() { return puntos_cruce; }
    public void setPuntos_cruce(Integer valor) { this.puntos_cruce = valor; }

    public Integer getElitismo() { return elitismo; }
    public void setElitismo(Integer valor) { this.elitismo = valor; }

    public Integer getReemplazos() { return reemplazos; }
    public void setReemplazos(Integer valor) { this.reemplazos = valor; }

    public Integer getLimite_sin_mejora() { return limite_sin_mejora; }
    public void setLimite_sin_mejora(Integer valor) { this.limite_sin_mejora = valor; }

    public Double getUmbral_mejora_cop() { return umbral_mejora_cop; }
    public void setUmbral_mejora_cop(Double valor) { this.umbral_mejora_cop = valor; }

    public Double getEscala_costo_referencia() { return escala_costo_referencia; }
    public void setEscala_costo_referencia(Double valor) { this.escala_costo_referencia = valor; }
}
