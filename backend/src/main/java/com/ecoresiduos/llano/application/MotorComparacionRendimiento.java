package com.ecoresiduos.llano.application;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ReporteComparativo;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MotorComparacionRendimiento {

    public Double calcular_gap_optimalidad(Double costo_exacto, String estado_exacto, Double costo_ag, String estado_ag) {
        if (costo_exacto == null || costo_exacto <= 0.0 || estado_exacto == null || !"OPTIMO".equalsIgnoreCase(estado_exacto)) {
            return null;
        }

        if (costo_ag == null || estado_ag == null ||
            (!"FACTIBLE_SIN_CERTIFICAR".equalsIgnoreCase(estado_ag) && !"OPTIMO".equalsIgnoreCase(estado_ag))) {
            return null;
        }

        return 100.0 * (costo_ag - costo_exacto) / costo_exacto;
    }

    public ReporteComparativo consolidar_reporte_comparativo(
            Escenario escenario,
            ConfiguracionAG config_ag,
            ResultadoOptimizacion res_exacto,
            ResultadoOptimizacion res_ag) {

        String escId = escenario != null ? escenario.getId() : "";
        String exactoId = res_exacto != null ? res_exacto.getId() : "";
        String agId = res_ag != null ? res_ag.getId() : "";

        int cantEmp = escenario != null && escenario.getEmpresas() != null ? escenario.getEmpresas().size() : 0;
        int cantPla = escenario != null && escenario.getPlantas() != null ? escenario.getPlantas().size() : 0;

        Double costoExacto = res_exacto != null ? res_exacto.getCosto_total_Z() : null;
        String estadoExacto = res_exacto != null ? res_exacto.getEstado() : null;

        Double costoAg = res_ag != null ? res_ag.getCosto_total_Z() : null;
        String estadoAg = res_ag != null ? res_ag.getEstado() : null;

        Double gap = calcular_gap_optimalidad(costoExacto, estadoExacto, costoAg, estadoAg);

        Double difCosto = (costoExacto != null && costoAg != null) ? (costoAg - costoExacto) : null;

        Double tiempoExacto = res_exacto != null ? res_exacto.getTiempo_ejecucion_s() : null;
        Double tiempoAg = res_ag != null ? res_ag.getTiempo_ejecucion_s() : null;
        Double difTiempo = (tiempoExacto != null && tiempoAg != null) ? (tiempoAg - tiempoExacto) : null;

        return new ReporteComparativo(
                escId, exactoId, agId, cantEmp, cantPla, config_ag,
                res_exacto, res_ag, gap, difCosto, difTiempo
        );
    }

    public List<ReporteComparativo> comparar_escalabilidad_redes(List<ReporteComparativo> reportes) {
        if (reportes == null) return new ArrayList<>();
        List<ReporteComparativo> ordenados = new ArrayList<>(reportes);
        ordenados.sort((r1, r2) -> {
            int n1 = (r1.getCantidad_empresas() != null ? r1.getCantidad_empresas() : 0) * (r1.getCantidad_plantas() != null ? r1.getCantidad_plantas() : 0);
            int n2 = (r2.getCantidad_empresas() != null ? r2.getCantidad_empresas() : 0) * (r2.getCantidad_plantas() != null ? r2.getCantidad_plantas() : 0);
            return Integer.compare(n1, n2);
        });
        return ordenados;
    }
}

