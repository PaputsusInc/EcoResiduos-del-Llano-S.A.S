package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class Planta extends NodoRed {

    @JsonProperty("capacidad_maxima_t")
    private Double capacidad_maxima_t;

    @JsonProperty("residuos_admitidos")
    private List<String> residuos_admitidos = new ArrayList<>();

    public Planta() {
        super();
    }

    public Planta(String id, String nombre, String ubicacion, Double latitud, Double longitud, Double capacidad_maxima_t) {
        super(id, nombre, ubicacion, latitud, longitud);
        this.capacidad_maxima_t = capacidad_maxima_t;
        this.residuos_admitidos = new ArrayList<>();
    }

    public Planta(String id, String nombre, String ubicacion, Double latitud, Double longitud, Double capacidad_maxima_t, List<String> residuos_admitidos) {
        super(id, nombre, ubicacion, latitud, longitud);
        this.capacidad_maxima_t = capacidad_maxima_t;
        this.residuos_admitidos = residuos_admitidos != null ? new ArrayList<>(residuos_admitidos) : new ArrayList<>();
    }

    public void actualizar_capacidad(Double nueva_capacidad_t) {
        this.capacidad_maxima_t = nueva_capacidad_t;
    }

    public Double getCapacidad_maxima_t() {
        return capacidad_maxima_t;
    }

    public void setCapacidad_maxima_t(Double capacidad_maxima_t) {
        this.capacidad_maxima_t = capacidad_maxima_t;
    }

    public List<String> getResiduos_admitidos() {
        return residuos_admitidos;
    }

    public void setResiduos_admitidos(List<String> residuos_admitidos) {
        this.residuos_admitidos = residuos_admitidos != null ? new ArrayList<>(residuos_admitidos) : new ArrayList<>();
    }
}

