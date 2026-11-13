package com.ecoresiduos.llano.infrastructure.optimizer;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.port.IPuertoAjustadorHiperparametrosAG;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdaptadorAjustadorHiperparametrosAG implements IPuertoAjustadorHiperparametrosAG {
    private final PythonProcessRunner runner;

    @Value("${ecoresiduos.python.genetic-tuner-path:../python-engines/genetic_solver/ajustar_hiperparametros.py}")
    private String rutaScript = "../python-engines/genetic_solver/ajustar_hiperparametros.py";

    public AdaptadorAjustadorHiperparametrosAG(PythonProcessRunner runner) {
        this.runner = runner;
    }

    @Override
    public Map<String, Object> ajustar(Escenario escenario, ConfiguracionAG configuracion) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("escenario", escenario);
        payload.put("config_ag", configuracion);
        payload.put("tolerancia_numerica", 1e-6);
        payload.put("escala_costo_referencia", configuracion.getEscala_costo_referencia());
        return runner.ejecutarJson(rutaScript, payload, 120);
    }
}
