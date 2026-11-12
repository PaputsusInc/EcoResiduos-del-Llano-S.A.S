package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public abstract class NodoRed {

    @JsonProperty("id")
    protected String id;

    @JsonProperty("nombre")
    protected String nombre;

    @JsonProperty("ubicacion")
    protected String ubicacion;

    @JsonProperty("latitud")
    protected Double latitud;

    @JsonProperty("longitud")
    protected Double longitud;

    public NodoRed() {
    }

    public NodoRed(String id, String nombre, String ubicacion, Double latitud, Double longitud) {
        this.id = id;
        this.nombre = nombre;
        this.ubicacion = ubicacion;
        this.latitud = latitud;
        this.longitud = longitud;
    }

    public void actualizar_coordenadas(Double nueva_latitud, Double nueva_longitud) {
        this.latitud = nueva_latitud;
        this.longitud = nueva_longitud;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public Double getLatitud() {
        return latitud;
    }

    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }

    public Double getLongitud() {
        return longitud;
    }

    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }
}

