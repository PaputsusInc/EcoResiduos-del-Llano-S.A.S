package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Empresa extends NodoRed {

    @JsonProperty("tipo_residuo")
    private String tipo_residuo;

    @JsonProperty("oferta_t")
    private Double oferta_t;

    public Empresa() {
        super();
    }

    public Empresa(String id, String nombre, String ubicacion, Double latitud, Double longitud, String tipo_residuo, Double oferta_t) {
        super(id, nombre, ubicacion, latitud, longitud);
        this.tipo_residuo = tipo_residuo;
        this.oferta_t = oferta_t;
    }

    public void actualizar_oferta(Double nueva_oferta_t) {
        this.oferta_t = nueva_oferta_t;
    }

    public String getTipo_residuo() {
        return tipo_residuo;
    }

    public void setTipo_residuo(String tipo_residuo) {
        this.tipo_residuo = tipo_residuo;
    }

    public Double getOferta_t() {
        return oferta_t;
    }

    public void setOferta_t(Double oferta_t) {
        this.oferta_t = oferta_t;
    }
}

