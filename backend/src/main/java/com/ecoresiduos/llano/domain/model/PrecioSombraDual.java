package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PrecioSombraDual {

    @JsonProperty("ejecucion_id")
    private String ejecucion_id;

    @JsonProperty("nodo_id")
    private String nodo_id;

    @JsonProperty("restriccion")
    private String restriccion;

    @JsonProperty("parametro")
    private String parametro;

    @JsonProperty("valor_vigente")
    private Double valor_vigente;

    @JsonProperty("precio_sombra")
    private Double precio_sombra;

    @JsonProperty("holgura")
    private Double holgura;

    @JsonProperty("rango_aumento_permitido")
    private Double rango_aumento_permitido;

    @JsonProperty("rango_reduccion_permitido")
    private Double rango_reduccion_permitido;

    @JsonProperty("limite_inferior")
    private String limite_inferior;

    @JsonProperty("limite_superior")
    private String limite_superior;

    public PrecioSombraDual() {
    }

    public PrecioSombraDual(String ejecucion_id, String nodo_id, String restriccion, String parametro,
                            Double valor_vigente, Double precio_sombra, Double holgura,
                            Double rango_aumento_permitido, Double rango_reduccion_permitido,
                            String limite_inferior, String limite_superior) {
        this.ejecucion_id = ejecucion_id;
        this.nodo_id = nodo_id;
        this.restriccion = restriccion;
        this.parametro = parametro;
        this.valor_vigente = valor_vigente;
        this.precio_sombra = precio_sombra;
        this.holgura = holgura;
        this.rango_aumento_permitido = rango_aumento_permitido;
        this.rango_reduccion_permitido = rango_reduccion_permitido;
        this.limite_inferior = limite_inferior != null ? limite_inferior : "Sin límite";
        this.limite_superior = limite_superior != null ? limite_superior : "Sin límite";
    }

    public String getEjecucion_id() {
        return ejecucion_id;
    }

    public void setEjecucion_id(String ejecucion_id) {
        this.ejecucion_id = ejecucion_id;
    }

    public String getNodo_id() {
        return nodo_id;
    }

    public void setNodo_id(String nodo_id) {
        this.nodo_id = nodo_id;
    }

    public String getRestriccion() {
        return restriccion;
    }

    public void setRestriccion(String restriccion) {
        this.restriccion = restriccion;
    }

    public String getParametro() {
        return parametro;
    }

    public void setParametro(String parametro) {
        this.parametro = parametro;
    }

    public Double getValor_vigente() {
        return valor_vigente;
    }

    public void setValor_vigente(Double valor_vigente) {
        this.valor_vigente = valor_vigente;
    }

    public Double getPrecio_sombra() {
        return precio_sombra;
    }

    public void setPrecio_sombra(Double precio_sombra) {
        this.precio_sombra = precio_sombra;
    }

    public Double getHolgura() {
        return holgura;
    }

    public void setHolgura(Double holgura) {
        this.holgura = holgura;
    }

    public Double getRango_aumento_permitido() {
        return rango_aumento_permitido;
    }

    public void setRango_aumento_permitido(Double rango_aumento_permitido) {
        this.rango_aumento_permitido = rango_aumento_permitido;
    }

    public Double getRango_reduccion_permitido() {
        return rango_reduccion_permitido;
    }

    public void setRango_reduccion_permitido(Double rango_reduccion_permitido) {
        this.rango_reduccion_permitido = rango_reduccion_permitido;
    }

    public String getLimite_inferior() {
        return limite_inferior;
    }

    public void setLimite_inferior(String limite_inferior) {
        this.limite_inferior = limite_inferior;
    }

    public String getLimite_superior() {
        return limite_superior;
    }

    public void setLimite_superior(String limite_superior) {
        this.limite_superior = limite_superior;
    }
}

