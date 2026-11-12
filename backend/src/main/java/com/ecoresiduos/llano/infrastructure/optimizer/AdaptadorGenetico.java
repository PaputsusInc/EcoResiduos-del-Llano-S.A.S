package com.ecoresiduos.llano.infrastructure.optimizer;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.ResultadoOptimizacion;
import com.ecoresiduos.llano.domain.port.IPuertoOptimizador;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component("adaptadorGenetico")
public class AdaptadorGenetico implements IPuertoOptimizador {

    private Double escala_costo_referencia = 1000000.0;
    private Double tolerancia_numerica = 1e-6;
    private final IPuertoRepositorioEscenarios repositorio_escenarios;
    private final PythonProcessRunner runner;

    @Value("${ecoresiduos.python.genetic-solver-path:../python-engines/genetic_solver/solver_genetico.py}")
    private String rutaScriptGenetico = "../python-engines/genetic_solver/solver_genetico.py";

    @Autowired
    public AdaptadorGenetico(IPuertoRepositorioEscenarios repositorio_escenarios, PythonProcessRunner runner) {
        this.repositorio_escenarios = repositorio_escenarios;
        this.runner = runner != null ? runner : new PythonProcessRunner();
    }

    public Double getEscala_costo_referencia() {
        return escala_costo_referencia;
    }

    public void setEscala_costo_referencia(Double escala_costo_referencia) {
        this.escala_costo_referencia = escala_costo_referencia;
    }

    public Double getTolerancia_numerica() {
        return tolerancia_numerica;
    }

    public void setTolerancia_numerica(Double tolerancia_numerica) {
        this.tolerancia_numerica = tolerancia_numerica;
    }

    public String getRutaScriptGenetico() {
        return rutaScriptGenetico;
    }

    public void setRutaScriptGenetico(String rutaScriptGenetico) {
        this.rutaScriptGenetico = rutaScriptGenetico;
    }

    public IPuertoRepositorioEscenarios getRepositorio_escenarios() {
        return repositorio_escenarios;
    }

    @Override
    public ResultadoOptimizacion resolver(Escenario escenario, ConfiguracionAG config_ag) {
        return resolver(escenario, config_ag, null);
    }

    public ResultadoOptimizacion resolver(Escenario escenario, ConfiguracionAG config_ag, String ejecucionIdEspecifico) {
        String ejecucionId = ejecucionIdEspecifico != null && !ejecucionIdEspecifico.isBlank()
                ? ejecucionIdEspecifico
                : "EJE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        ResultadoOptimizacion resultado = null;
        if (repositorio_escenarios != null) {
            resultado = repositorio_escenarios.obtener_resultado_por_id(ejecucionId);
        }
        if (resultado == null) {
            resultado = new ResultadoOptimizacion(
                    ejecucionId,
                    escenario != null ? escenario.getId() : "ESC-01",
                    "AG",
                    "EN_EJECUCION"
            );
            resultado.setParametros_usados(config_ag);
            if (repositorio_escenarios != null) {
                repositorio_escenarios.guardar_resultado(resultado);
            }
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ejecucion_id", ejecucionId);
        payload.put("metodo", "AG");
        payload.put("tolerancia_numerica", tolerancia_numerica);
        payload.put("escala_costo_referencia", escala_costo_referencia);
        payload.put("escenario", escenario);
        payload.put("config_ag", config_ag);

        return runner.ejecutarProceso(
                rutaScriptGenetico,
                payload,
                resultado,
                escenario,
                tolerancia_numerica,
                repositorio_escenarios
        );
    }
}
