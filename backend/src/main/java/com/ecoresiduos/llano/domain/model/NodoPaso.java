package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class NodoPaso extends NodoRed {

    @JsonProperty("capacidad_transbordo")
    private Double capacidad_transbordo;

    public NodoPaso() {
        super();
    }

    public NodoPaso(String id, String nombre, String ubicacion, Double latitud, Double longitud, Double capacidad_transbordo) {
        super(id, nombre, ubicacion, latitud, longitud);
        this.capacidad_transbordo = capacidad_transbordo;
    }

    public Double getCapacidad_transbordo() {
        return capacidad_transbordo;
    }

    public void setCapacidad_transbordo(Double capacidad_transbordo) {
        this.capacidad_transbordo = capacidad_transbordo;
    }
}

