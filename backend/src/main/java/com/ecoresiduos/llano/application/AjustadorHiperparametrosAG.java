package com.ecoresiduos.llano.application;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.port.IPuertoAjustadorHiperparametrosAG;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AjustadorHiperparametrosAG {
    private final IPuertoRepositorioEscenarios escenarios;
    private final IPuertoAjustadorHiperparametrosAG ajustador;

    public AjustadorHiperparametrosAG(IPuertoRepositorioEscenarios escenarios,
                                     IPuertoAjustadorHiperparametrosAG ajustador) {
        this.escenarios = escenarios;
        this.ajustador = ajustador;
    }

    public Map<String, Object> ajustar(String escenarioId, ConfiguracionAG configuracion) {
        Escenario escenario = escenarios.obtener_por_id(escenarioId);
        if (escenario == null) {
            throw new IllegalArgumentException("Escenario no encontrado: " + escenarioId);
        }
        return ajustador.ajustar(escenario, configuracion);
    }
}
