package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.Escenario;
import java.util.List;
import java.util.Map;

public interface IPuertoConstructorEscenarios {
    Escenario materializar(Escenario referencia, List<Map<String, Object>> variaciones);
}
