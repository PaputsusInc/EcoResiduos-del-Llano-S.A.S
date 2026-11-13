package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import java.util.Map;

public interface IPuertoAjustadorHiperparametrosAG {
    Map<String, Object> ajustar(Escenario escenario, ConfiguracionAG configuracion);
}
