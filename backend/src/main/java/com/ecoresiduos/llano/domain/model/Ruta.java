package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class Ruta {

    @JsonProperty("id")
    private String id;

    @JsonProperty("empresa_id")
    private String empresa_id;

    @JsonProperty("planta_id")
    private String planta_id;

    @JsonProperty("distancia_km")
    private Double distancia_km;

    @JsonProperty("fuente_distancia")
    private String fuente_distancia;

    @JsonProperty("geometria")
    private List<List<Double>> geometria = new ArrayList<>();

    @JsonProperty("estado_consulta")
    private String estado_consulta = "pendiente";

    @JsonProperty("tarifa_t_km")
    private Double tarifa_t_km;

    @JsonProperty("costo_unitario_t")
    private Double costo_unitario_t;

    @JsonProperty("compatible")
    private Boolean compatible = true;

    @JsonProperty("activa")
    private Boolean activa = true;

    public Ruta() {
    }

    public Ruta(String id, String empresa_id, String planta_id, Double distancia_km, String fuente_distancia,
                List<List<Double>> geometria, String estado_consulta, Double tarifa_t_km,
                Double costo_unitario_t, Boolean compatible, Boolean activa) {
        this.id = id;
        this.empresa_id = empresa_id;
        this.planta_id = planta_id;
        this.distancia_km = distancia_km;
        this.fuente_distancia = fuente_distancia;
        this.geometria = geometria != null ? new ArrayList<>(geometria) : new ArrayList<>();
        this.estado_consulta = estado_consulta != null ? estado_consulta : "pendiente";
        this.tarifa_t_km = tarifa_t_km;
        this.costo_unitario_t = costo_unitario_t;
        this.compatible = compatible != null ? compatible : true;
        this.activa = activa != null ? activa : true;
    }

    public void invalidar_recorrido() {
        this.estado_consulta = "pendiente";
        this.distancia_km = null;
        this.geometria = new ArrayList<>();
    }

    public void registrar_recorrido_vial(Double distancia_km, List<List<Double>> geometria, String proveedor, String estado) {
        this.distancia_km = distancia_km;
        this.geometria = geometria != null ? new ArrayList<>(geometria) : new ArrayList<>();
        this.fuente_distancia = proveedor;
        this.estado_consulta = estado;
        if ("calculada".equalsIgnoreCase(estado) && this.distancia_km != null && this.tarifa_t_km != null) {
            calcular_costo_unitario();
        }
    }

    public Double calcular_costo_unitario() {
        if (this.tarifa_t_km != null && this.distancia_km != null) {
            this.costo_unitario_t = this.tarifa_t_km * this.distancia_km;
        }
        return this.costo_unitario_t;
    }

    public Double actualizar_costo_unitario(Double nuevo_costo_t, Double nueva_tarifa_t_km) {
        if (nueva_tarifa_t_km != null) {
            this.tarifa_t_km = nueva_tarifa_t_km;
        }
        if (nuevo_costo_t != null) {
            this.costo_unitario_t = nuevo_costo_t;
        } else if (this.tarifa_t_km != null && this.distancia_km != null) {
            calcular_costo_unitario();
        }
        return this.costo_unitario_t;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmpresa_id() {
        return empresa_id;
    }

    public void setEmpresa_id(String empresa_id) {
        this.empresa_id = empresa_id;
    }

    public String getPlanta_id() {
        return planta_id;
    }

    public void setPlanta_id(String planta_id) {
        this.planta_id = planta_id;
    }

    public Double getDistancia_km() {
        return distancia_km;
    }

    public void setDistancia_km(Double distancia_km) {
        this.distancia_km = distancia_km;
    }

    public String getFuente_distancia() {
        return fuente_distancia;
    }

    public void setFuente_distancia(String fuente_distancia) {
        this.fuente_distancia = fuente_distancia;
    }

    public List<List<Double>> getGeometria() {
        return geometria;
    }

    public void setGeometria(List<List<Double>> geometria) {
        this.geometria = geometria != null ? new ArrayList<>(geometria) : new ArrayList<>();
    }

    public String getEstado_consulta() {
        return estado_consulta;
    }

    public void setEstado_consulta(String estado_consulta) {
        this.estado_consulta = estado_consulta;
    }

    public Double getTarifa_t_km() {
        return tarifa_t_km;
    }

    public void setTarifa_t_km(Double tarifa_t_km) {
        this.tarifa_t_km = tarifa_t_km;
    }

    public Double getCosto_unitario_t() {
        return costo_unitario_t;
    }

    public void setCosto_unitario_t(Double costo_unitario_t) {
        this.costo_unitario_t = costo_unitario_t;
    }

    public Boolean getCompatible() {
        return compatible;
    }

    public void setCompatible(Boolean compatible) {
        this.compatible = compatible != null ? compatible : true;
    }

    public Boolean getActiva() {
        return activa;
    }

    public void setActiva(Boolean activa) {
        this.activa = activa != null ? activa : true;
    }
}

