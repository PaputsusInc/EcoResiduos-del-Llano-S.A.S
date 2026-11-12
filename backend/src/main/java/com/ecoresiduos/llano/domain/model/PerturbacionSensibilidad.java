package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PerturbacionSensibilidad {

    @JsonProperty("id")
    private String id;

    @JsonProperty("referencia_id")
    private String referencia_id;

    @JsonProperty("variante_id")
    private String variante_id;

    @JsonProperty("nombre_variacion")
    private String nombre_variacion;

    @JsonProperty("parametro_objetivo")
    private String parametro_objetivo;

    @JsonProperty("entidad_afectada_id")
    private String entidad_afectada_id;

    @JsonProperty("valor_referencia")
    private Double valor_referencia;

    @JsonProperty("porcentaje_variacion")
    private Double porcentaje_variacion;

    @JsonProperty("valor_variante")
    private Double valor_variante;

    public PerturbacionSensibilidad() {
    }

    public PerturbacionSensibilidad(String id, String referencia_id, String variante_id, String nombre_variacion,
                                    String parametro_objetivo, String entidad_afectada_id, Double valor_referencia,
                                    Double porcentaje_variacion, Double valor_variante) {
        this.id = id;
        this.referencia_id = referencia_id;
        this.variante_id = variante_id;
        this.nombre_variacion = nombre_variacion;
        this.parametro_objetivo = parametro_objetivo;
        this.entidad_afectada_id = entidad_afectada_id;
        this.valor_referencia = valor_referencia;
        this.porcentaje_variacion = porcentaje_variacion;
        this.valor_variante = valor_variante;
    }

    public Escenario aplicar_a_escenario(Escenario base) {
        String nuevoId = this.variante_id != null ? this.variante_id : base.getId() + "-VAR";
        String nuevoNombre = this.nombre_variacion != null ? this.nombre_variacion : base.getNombre() + " (Variante)";
        Escenario variante = base.clonar_profundo(nuevoId, nuevoNombre);

        if (this.parametro_objetivo != null) {
            String param = this.parametro_objetivo.toUpperCase();
            if (param.contains("OFERTA")) {
                variante.actualizar_oferta_empresa(this.entidad_afectada_id, this.valor_variante);
            } else if (param.contains("CAPACIDAD")) {
                variante.actualizar_capacidad_planta(this.entidad_afectada_id, this.valor_variante);
            } else if (param.contains("COSTO")) {
                variante.actualizar_costo_ruta(this.entidad_afectada_id, this.valor_variante, null);
            }
        }

        variante.calcular_totales_red();
        variante.validar_balance_red();
        return variante;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReferencia_id() {
        return referencia_id;
    }

    public void setReferencia_id(String referencia_id) {
        this.referencia_id = referencia_id;
    }

    public String getVariante_id() {
        return variante_id;
    }

    public void setVariante_id(String variante_id) {
        this.variante_id = variante_id;
    }

    public String getNombre_variacion() {
        return nombre_variacion;
    }

    public void setNombre_variacion(String nombre_variacion) {
        this.nombre_variacion = nombre_variacion;
    }

    public String getParametro_objetivo() {
        return parametro_objetivo;
    }

    public void setParametro_objetivo(String parametro_objetivo) {
        this.parametro_objetivo = parametro_objetivo;
    }

    public String getEntidad_afectada_id() {
        return entidad_afectada_id;
    }

    public void setEntidad_afectada_id(String entidad_afectada_id) {
        this.entidad_afectada_id = entidad_afectada_id;
    }

    public Double getValor_referencia() {
        return valor_referencia;
    }

    public void setValor_referencia(Double valor_referencia) {
        this.valor_referencia = valor_referencia;
    }

    public Double getPorcentaje_variacion() {
        return porcentaje_variacion;
    }

    public void setPorcentaje_variacion(Double porcentaje_variacion) {
        this.porcentaje_variacion = porcentaje_variacion;
    }

    public Double getValor_variante() {
        return valor_variante;
    }

    public void setValor_variante(Double valor_variante) {
        this.valor_variante = valor_variante;
    }
}

