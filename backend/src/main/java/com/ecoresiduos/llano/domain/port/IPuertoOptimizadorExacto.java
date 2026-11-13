package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import java.util.List;
import java.util.Map;

public interface IPuertoOptimizadorExacto extends IPuertoOptimizador {
    ResultadoOptimizacion analizarVariacion(Escenario escenario, Map<String, Object> variacion);
    ResultadoOptimizacion analizarVariaciones(Escenario escenario, List<Map<String, Object>> variaciones);
}
