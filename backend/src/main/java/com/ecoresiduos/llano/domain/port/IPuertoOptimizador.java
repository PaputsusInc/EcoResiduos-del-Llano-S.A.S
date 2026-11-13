package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;

public interface IPuertoOptimizador {
    ResultadoOptimizacion resolver(Escenario escenario, ConfiguracionAG config_ag);

    default ResultadoOptimizacion resolver(Escenario escenario, ConfiguracionAG config_ag, String ejecucionId) {
        return resolver(escenario, config_ag);
    }
}
