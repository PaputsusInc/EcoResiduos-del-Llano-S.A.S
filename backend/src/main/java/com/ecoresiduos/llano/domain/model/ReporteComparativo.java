package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public class ReporteComparativo {

    @JsonProperty("escenario_id")
    private String escenario_id;

    @JsonProperty("ejecucion_exacta_id")
    private String ejecucion_exacta_id;

    @JsonProperty("ejecucion_ag_id")
    private String ejecucion_ag_id;

    @JsonProperty("cantidad_empresas")
    private Integer cantidad_empresas;

    @JsonProperty("cantidad_plantas")
    private Integer cantidad_plantas;

    @JsonProperty("config_ag_evaluada")
    private ConfiguracionAG config_ag_evaluada;

    @JsonProperty("resultado_exacto")
    private ResultadoOptimizacion resultado_exacto;

    @JsonProperty("resultado_genetico")
    private ResultadoOptimizacion resultado_genetico;

    @JsonProperty("porcentaje_gap")
    private Double porcentaje_gap;

    @JsonProperty("diferencia_costo")
    private Double diferencia_costo;

    @JsonProperty("diferencia_tiempo_s")
    private Double diferencia_tiempo_s;

    public ReporteComparativo() {
    }

    public ReporteComparativo(String escenario_id, String ejecucion_exacta_id, String ejecucion_ag_id,
                              Integer cantidad_empresas, Integer cantidad_plantas, ConfiguracionAG config_ag_evaluada,
                              ResultadoOptimizacion resultado_exacto, ResultadoOptimizacion resultado_genetico,
                              Double porcentaje_gap, Double diferencia_costo, Double diferencia_tiempo_s) {
        this.escenario_id = escenario_id;
        this.ejecucion_exacta_id = ejecucion_exacta_id;
        this.ejecucion_ag_id = ejecucion_ag_id;
        this.cantidad_empresas = cantidad_empresas;
        this.cantidad_plantas = cantidad_plantas;
        this.config_ag_evaluada = config_ag_evaluada;
        this.resultado_exacto = resultado_exacto;
        this.resultado_genetico = resultado_genetico;
        this.porcentaje_gap = porcentaje_gap;
        this.diferencia_costo = diferencia_costo;
        this.diferencia_tiempo_s = diferencia_tiempo_s;
    }

    public Map<String, Object> obtener_resumen_comparativo() {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("escenario_id", this.escenario_id);
        resumen.put("ejecucion_exacta_id", this.ejecucion_exacta_id);
        resumen.put("ejecucion_ag_id", this.ejecucion_ag_id);
        resumen.put("cantidad_empresas", this.cantidad_empresas);
        resumen.put("cantidad_plantas", this.cantidad_plantas);
        resumen.put("costo_exacto", this.resultado_exacto != null ? this.resultado_exacto.getCosto_total_Z() : null);
        resumen.put("costo_ag", this.resultado_genetico != null ? this.resultado_genetico.getCosto_total_Z() : null);
        resumen.put("porcentaje_gap", this.porcentaje_gap);
        resumen.put("gap_etiqueta", this.porcentaje_gap != null ?
                String.format(Locale.US, "%.2f %%", this.porcentaje_gap) : "No disponible");
        resumen.put("diferencia_costo", this.diferencia_costo);
        resumen.put("tiempo_exacto_s", this.resultado_exacto != null ? this.resultado_exacto.getTiempo_ejecucion_s() : null);
        resumen.put("tiempo_ag_s", this.resultado_genetico != null ? this.resultado_genetico.getTiempo_ejecucion_s() : null);
        resumen.put("diferencia_tiempo_s", this.diferencia_tiempo_s);
        resumen.put("estado_exacto", this.resultado_exacto != null ? this.resultado_exacto.getEstado() : null);
        resumen.put("estado_ag", this.resultado_genetico != null ? this.resultado_genetico.getEstado() : null);
        return resumen;
    }

    public String getEscenario_id() {
        return escenario_id;
    }

    public void setEscenario_id(String escenario_id) {
        this.escenario_id = escenario_id;
    }

    public String getEjecucion_exacta_id() {
        return ejecucion_exacta_id;
    }

    public void setEjecucion_exacta_id(String ejecucion_exacta_id) {
        this.ejecucion_exacta_id = ejecucion_exacta_id;
    }

    public String getEjecucion_ag_id() {
        return ejecucion_ag_id;
    }

    public void setEjecucion_ag_id(String ejecucion_ag_id) {
        this.ejecucion_ag_id = ejecucion_ag_id;
    }

    public Integer getCantidad_empresas() {
        return cantidad_empresas;
    }

    public void setCantidad_empresas(Integer cantidad_empresas) {
        this.cantidad_empresas = cantidad_empresas;
    }

    public Integer getCantidad_plantas() {
        return cantidad_plantas;
    }

    public void setCantidad_plantas(Integer cantidad_plantas) {
        this.cantidad_plantas = cantidad_plantas;
    }

    public ConfiguracionAG getConfig_ag_evaluada() {
        return config_ag_evaluada;
    }

    public void setConfig_ag_evaluada(ConfiguracionAG config_ag_evaluada) {
        this.config_ag_evaluada = config_ag_evaluada;
    }

    public ResultadoOptimizacion getResultado_exacto() {
        return resultado_exacto;
    }

    public void setResultado_exacto(ResultadoOptimizacion resultado_exacto) {
        this.resultado_exacto = resultado_exacto;
    }

    public ResultadoOptimizacion getResultado_genetico() {
        return resultado_genetico;
    }

    public void setResultado_genetico(ResultadoOptimizacion resultado_genetico) {
        this.resultado_genetico = resultado_genetico;
    }

    public Double getPorcentaje_gap() {
        return porcentaje_gap;
    }

    public void setPorcentaje_gap(Double porcentaje_gap) {
        this.porcentaje_gap = porcentaje_gap;
    }

    public Double getDiferencia_costo() {
        return diferencia_costo;
    }

    public void setDiferencia_costo(Double diferencia_costo) {
        this.diferencia_costo = diferencia_costo;
    }

    public Double getDiferencia_tiempo_s() {
        return diferencia_tiempo_s;
    }

    public void setDiferencia_tiempo_s(Double diferencia_tiempo_s) {
        this.diferencia_tiempo_s = diferencia_tiempo_s;
    }
}

