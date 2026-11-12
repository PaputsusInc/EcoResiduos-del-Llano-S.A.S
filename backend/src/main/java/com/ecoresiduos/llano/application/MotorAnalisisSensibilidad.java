package com.ecoresiduos.llano.application;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PerturbacionSensibilidad;
import com.ecoresiduos.llano.domain.model.ReporteComparativo;
import com.ecoresiduos.llano.domain.port.IPuertoRepositorioEscenarios;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MotorAnalisisSensibilidad {

    private final IPuertoRepositorioEscenarios repositorio_escenarios;
    private final OrquestadorOptimizacion orquestador;
    private final MotorComparacionRendimiento motor_comparacion;

    @Autowired
    public MotorAnalisisSensibilidad(
            IPuertoRepositorioEscenarios repositorio_escenarios,
            OrquestadorOptimizacion orquestador,
            MotorComparacionRendimiento motor_comparacion) {
        this.repositorio_escenarios = repositorio_escenarios;
        this.orquestador = orquestador;
        this.motor_comparacion = motor_comparacion;
    }

    public Escenario generar_variante_costos(String referencia_id, List<PerturbacionSensibilidad> perturbaciones) {
        Escenario ref = repositorio_escenarios.obtener_por_id(referencia_id);
        if (ref == null) {
            throw new IllegalArgumentException("Escenario de referencia no encontrado: " + referencia_id);
        }

        String nuevoId = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getVariante_id() != null)
                ? perturbaciones.get(0).getVariante_id() : ref.getId() + "-VAR-COSTOS";
        String nuevoNombre = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getNombre_variacion() != null)
                ? perturbaciones.get(0).getNombre_variacion() : ref.getNombre() + " (Variante de Costos)";

        Escenario variante = ref.clonar_profundo(nuevoId, nuevoNombre);

        if (perturbaciones != null) {
            for (PerturbacionSensibilidad p : perturbaciones) {
                variante.actualizar_costo_ruta(p.getEntidad_afectada_id(), p.getValor_variante(), null);
            }
        }

        repositorio_escenarios.guardar(variante);
        return variante;
    }

    public Escenario generar_variante_oferta(String referencia_id, List<PerturbacionSensibilidad> perturbaciones) {
        Escenario ref = repositorio_escenarios.obtener_por_id(referencia_id);
        if (ref == null) {
            throw new IllegalArgumentException("Escenario de referencia no encontrado: " + referencia_id);
        }

        String nuevoId = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getVariante_id() != null)
                ? perturbaciones.get(0).getVariante_id() : ref.getId() + "-VAR-OFERTA";
        String nuevoNombre = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getNombre_variacion() != null)
                ? perturbaciones.get(0).getNombre_variacion() : ref.getNombre() + " (Variante de Oferta)";

        Escenario variante = ref.clonar_profundo(nuevoId, nuevoNombre);

        if (perturbaciones != null) {
            for (PerturbacionSensibilidad p : perturbaciones) {
                variante.actualizar_oferta_empresa(p.getEntidad_afectada_id(), p.getValor_variante());
            }
        }

        repositorio_escenarios.guardar(variante);
        return variante;
    }

    public Escenario generar_variante_capacidad(String referencia_id, List<PerturbacionSensibilidad> perturbaciones) {
        Escenario ref = repositorio_escenarios.obtener_por_id(referencia_id);
        if (ref == null) {
            throw new IllegalArgumentException("Escenario de referencia no encontrado: " + referencia_id);
        }

        String nuevoId = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getVariante_id() != null)
                ? perturbaciones.get(0).getVariante_id() : ref.getId() + "-VAR-CAPACIDAD";
        String nuevoNombre = (perturbaciones != null && !perturbaciones.isEmpty() && perturbaciones.get(0).getNombre_variacion() != null)
                ? perturbaciones.get(0).getNombre_variacion() : ref.getNombre() + " (Variante de Capacidad)";

        Escenario variante = ref.clonar_profundo(nuevoId, nuevoNombre);

        if (perturbaciones != null) {
            for (PerturbacionSensibilidad p : perturbaciones) {
                variante.actualizar_capacidad_planta(p.getEntidad_afectada_id(), p.getValor_variante());
            }
        }

        repositorio_escenarios.guardar(variante);
        return variante;
    }

    public Map<String, Object> evaluar_escenario_sensibilidad(String referencia_id, String variante_id, ConfiguracionAG config_ag) {
        Escenario ref = repositorio_escenarios.obtener_por_id(referencia_id);
        Escenario var = repositorio_escenarios.obtener_por_id(variante_id);

        if (ref == null || var == null) {
            throw new IllegalArgumentException("Escenario de referencia o variante no encontrado.");
        }

        ReporteComparativo reporteRef = orquestador.ejecutar_comparacion_metodos(referencia_id, config_ag);
        ReporteComparativo reporteVar = orquestador.ejecutar_comparacion_metodos(variante_id, config_ag);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("referencia", ref);
        resultado.put("variante", var);
        resultado.put("reporte_referencia", reporteRef);
        resultado.put("reporte_variante", reporteVar);

        return resultado;
    }
}

