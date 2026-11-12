package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import java.util.List;

public interface IPuertoRepositorioEscenarios {

    Escenario obtener_por_id(String escenario_id);

    void guardar(Escenario escenario);

    void guardar_resultado(ResultadoOptimizacion resultado);

    ResultadoOptimizacion obtener_resultado_por_id(String ejecucion_id);

    List<Escenario> listar_escenarios();

    List<ResultadoOptimizacion> listar_resultados();

    default void simular_inconsistencia_demo(String escenario_id) {}

    default void corregir_inconsistencias_demo(String escenario_id) {}
}
