package com.ecoresiduos.llano.exposition;

import com.ecoresiduos.llano.domain.model.ConfiguracionAG;
import com.ecoresiduos.llano.domain.model.Empresa;
import com.ecoresiduos.llano.domain.model.Escenario;
import com.ecoresiduos.llano.domain.model.PerturbacionSensibilidad;
import com.ecoresiduos.llano.domain.model.Planta;
import com.ecoresiduos.llano.domain.model.Ruta;
import com.ecoresiduos.llano.domain.port.IPuertoValidadorEscenario;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class ValidadorContratosEntrada implements IPuertoValidadorEscenario {

    public List<String> validar_coordenadas_geograficas(Double latitud, Double longitud) {
        List<String> errores = new ArrayList<>();
        if (latitud == null || !Double.isFinite(latitud) || latitud < -90.0 || latitud > 90.0) {
            errores.add("Campo 'latitud' inválido: debe ser un número finito entre -90.0 y 90.0 grados decimales.");
        }
        if (longitud == null || !Double.isFinite(longitud) || longitud < -180.0 || longitud > 180.0) {
            errores.add("Campo 'longitud' inválido: debe ser un número finito entre -180.0 y 180.0 grados decimales.");
        }
        return errores;
    }

    public List<String> validar_datos_empresa(Map<String, Object> payload, Escenario escenario) {
        List<String> errores = new ArrayList<>();
        if (payload == null) {
            errores.add("Payload de empresa no puede ser nulo.");
            return errores;
        }

        String id = (String) payload.get("id");
        if (id == null || id.trim().isEmpty()) {
            errores.add("Campo 'id' de empresa es obligatorio.");
        }

        String nombre = (String) payload.get("nombre");
        if (nombre == null || nombre.trim().isEmpty()) {
            errores.add("Campo 'nombre' de empresa no puede ser vacío.");
        }

        String ubicacion = (String) payload.get("ubicacion");
        if (ubicacion == null || ubicacion.trim().isEmpty()) {
            errores.add("Campo 'ubicacion' de empresa no puede ser vacío.");
        }

        String tipoResiduo = (String) payload.get("tipo_residuo");
        if (tipoResiduo == null || tipoResiduo.trim().isEmpty()) {
            errores.add("Campo 'tipo_residuo' es obligatorio: debe registrar un único tipo de residuo por empresa.");
        }

        Double lat = toDouble(payload.get("latitud"));
        Double lon = toDouble(payload.get("longitud"));
        errores.addAll(validar_coordenadas_geograficas(lat, lon));

        Double oferta = toDouble(payload.get("oferta_t"));
        errores.addAll(validar_oferta_semanal(oferta));
        Double precio = payload.get("precio_tonelada") == null ? 0.0 : toDouble(payload.get("precio_tonelada"));
        if (precio == null || !Double.isFinite(precio) || precio < 0.0) {
            errores.add("El precio por tonelada debe ser finito y no negativo (COP/t).");
        }

        return errores;
    }

    public List<String> validar_datos_planta(Map<String, Object> payload, Escenario escenario) {
        List<String> errores = new ArrayList<>();
        if (payload == null) {
            errores.add("Payload de planta no puede ser nulo.");
            return errores;
        }

        String id = (String) payload.get("id");
        if (id == null || id.trim().isEmpty()) {
            errores.add("Campo 'id' de planta es obligatorio.");
        }

        String nombre = (String) payload.get("nombre");
        if (nombre == null || nombre.trim().isEmpty()) {
            errores.add("Campo 'nombre' de planta no puede ser vacío.");
        }

        String ubicacion = (String) payload.get("ubicacion");
        if (ubicacion == null || ubicacion.trim().isEmpty()) {
            errores.add("Campo 'ubicacion' de planta no puede ser vacío.");
        }

        Double lat = toDouble(payload.get("latitud"));
        Double lon = toDouble(payload.get("longitud"));
        errores.addAll(validar_coordenadas_geograficas(lat, lon));

        Double cap = toDouble(payload.get("capacidad_maxima_t"));
        errores.addAll(validar_capacidad_maxima(cap));
        Double operacion = payload.get("costo_operacion_t") == null ? 0.0 : toDouble(payload.get("costo_operacion_t"));
        if (operacion == null || !Double.isFinite(operacion) || operacion < 0.0) {
            errores.add("El costo de operación debe ser finito y no negativo (COP/t).");
        }

        return errores;
    }

    public List<String> validar_oferta_semanal(Double oferta_t) {
        List<String> errores = new ArrayList<>();
        if (oferta_t == null || !Double.isFinite(oferta_t) || oferta_t < 0.0) {
            errores.add("Campo 'oferta_t' inválido: la oferta semanal debe ser un número finito y no negativo (t/semana).");
        }
        return errores;
    }

    public List<String> validar_capacidad_maxima(Double capacidad_maxima_t) {
        List<String> errores = new ArrayList<>();
        if (capacidad_maxima_t == null || !Double.isFinite(capacidad_maxima_t) || capacidad_maxima_t < 0.0) {
            errores.add("Campo 'capacidad_maxima_t' inválido: la capacidad máxima debe ser un número finito y no negativo (t/semana).");
        }
        return errores;
    }

    public List<String> validar_costo_conexion(Double costo_unitario_t, Double tarifa_t_km, Double distancia_km) {
        List<String> errores = new ArrayList<>();
        if (costo_unitario_t != null) {
            if (!Double.isFinite(costo_unitario_t) || costo_unitario_t < 0.0) {
                errores.add("Campo 'costo_unitario_t' inválido: el costo de transporte por tonelada debe ser no negativo (COP/t).");
            }
        } else if (tarifa_t_km != null) {
            if (!Double.isFinite(tarifa_t_km) || tarifa_t_km < 0.0) {
                errores.add("Campo 'tarifa_t_km' inválido: la tarifa debe ser no negativa (COP/(t·km)).");
            }
            if (distancia_km == null || !Double.isFinite(distancia_km) || distancia_km < 0.0) {
                errores.add("Cálculo de costo fallido: no se puede calcular el costo unitario sin una distancia vial válida.");
            }
        } else {
            errores.add("Debe proporcionar un 'costo_unitario_t' o una 'tarifa_t_km' con distancia calculada.");
        }
        return errores;
    }

    public List<String> validar_integridad_escenario(Escenario escenario) {
        List<String> errores = new ArrayList<>();
        if (escenario == null) {
            errores.add("El escenario no existe o es nulo.");
            return errores;
        }

        if (escenario.getEmpresas() == null || escenario.getEmpresas().isEmpty()) {
            errores.add("El escenario no cuenta con empresas generadoras registradas.");
        } else {
            for (Empresa emp : escenario.getEmpresas()) {
                errores.addAll(validar_coordenadas_geograficas(emp.getLatitud(), emp.getLongitud()));
                errores.addAll(validar_oferta_semanal(emp.getOferta_t()));
                if (emp.getPrecio_tonelada() != null && (!Double.isFinite(emp.getPrecio_tonelada()) || emp.getPrecio_tonelada() < 0)) {
                    errores.add("Empresa " + emp.getId() + ": precio por tonelada inválido.");
                }
            }
        }

        if (escenario.getPlantas() == null || escenario.getPlantas().isEmpty()) {
            errores.add("El escenario no cuenta con plantas procesadoras registradas.");
        } else {
            for (Planta pla : escenario.getPlantas()) {
                errores.addAll(validar_coordenadas_geograficas(pla.getLatitud(), pla.getLongitud()));
                errores.addAll(validar_capacidad_maxima(pla.getCapacidad_maxima_t()));
                if (pla.getCosto_operacion_t() != null && (!Double.isFinite(pla.getCosto_operacion_t()) || pla.getCosto_operacion_t() < 0)) {
                    errores.add("Planta " + pla.getId() + ": costo de operación inválido.");
                }
            }
        }

        if (escenario.getRutas() != null) {
            java.util.Set<String> empIds = escenario.getEmpresas() != null ?
                    escenario.getEmpresas().stream().map(Empresa::getId).collect(java.util.stream.Collectors.toSet()) : java.util.Collections.emptySet();
            java.util.Set<String> plaIds = escenario.getPlantas() != null ?
                    escenario.getPlantas().stream().map(Planta::getId).collect(java.util.stream.Collectors.toSet()) : java.util.Collections.emptySet();

            for (Ruta r : escenario.getRutas()) {
                if (r.getEmpresa_id() != null && !empIds.contains(r.getEmpresa_id())) {
                    errores.add("Conexión ruta " + r.getId() + ": Referencia a origen no registrado (" + r.getEmpresa_id() + ").");
                }
                if (r.getPlanta_id() != null && !plaIds.contains(r.getPlanta_id())) {
                    errores.add("Conexión ruta " + r.getId() + ": Referencia a destino no registrado (" + r.getPlanta_id() + ").");
                }
                if (Boolean.TRUE.equals(r.getActiva())) {
                    if (r.getCosto_unitario_t() != null && r.getCosto_unitario_t() < 0.0) {
                        errores.add("Ruta " + r.getId() + ": Valor negativo detectado en costo unitario (" + r.getCosto_unitario_t() + " COP/t).");
                    }
                    if (r.getTarifa_t_km() != null && r.getTarifa_t_km() < 0.0) {
                        errores.add("Ruta " + r.getId() + ": Valor negativo detectado en tarifa (" + r.getTarifa_t_km() + " COP/(t·km)).");
                    }
                    if (Boolean.TRUE.equals(r.getCompatible()) && r.getCosto_unitario_t() == null && r.getTarifa_t_km() == null) {
                        errores.add("Ruta activa " + r.getId() + " carece de costo unitario o tarifa asignada.");
                    }
                }
            }
        }

        return errores;
    }

    public List<String> validar_hiperparametros_ag(ConfiguracionAG config_ag) {
        List<String> errores = new ArrayList<>();
        if (config_ag == null) {
            errores.add("La configuración del Algoritmo Genético no puede ser nula.");
            return errores;
        }

        if (config_ag.getTamano_poblacion() == null || config_ag.getTamano_poblacion() < 2) {
            errores.add("El tamaño de población del AG debe ser un entero de al menos 2 candidatos.");
        }

        if (config_ag.getGeneraciones() == null || config_ag.getGeneraciones() < 1) {
            errores.add("El número de generaciones debe ser un entero positivo.");
        }

        // Validación y normalización de tasa_cruce (acepta [0.0, 1.0] o [0.0, 100.0])
        if (config_ag.getTasa_cruce() == null || !Double.isFinite(config_ag.getTasa_cruce()) || config_ag.getTasa_cruce() < 0.0 || config_ag.getTasa_cruce() > 100.0) {
            errores.add("La tasa de cruce debe ser un valor entre 0 y 1 (o entre 0% y 100%).");
        } else if (config_ag.getTasa_cruce() > 1.0) {
            config_ag.setTasa_cruce(config_ag.getTasa_cruce() / 100.0);
        }

        // Validación y normalización de tasa_mutacion (acepta [0.0, 1.0] o [0.0, 100.0])
        if (config_ag.getTasa_mutacion() == null || !Double.isFinite(config_ag.getTasa_mutacion()) || config_ag.getTasa_mutacion() < 0.0 || config_ag.getTasa_mutacion() > 100.0) {
            errores.add("La tasa de mutación debe ser un valor entre 0 y 1 (o entre 0% y 100%).");
        } else if (config_ag.getTasa_mutacion() > 1.0) {
            config_ag.setTasa_mutacion(config_ag.getTasa_mutacion() / 100.0);
        }

        if (!"TORNEO".equals(config_ag.getMetodo_seleccion())) {
            errores.add("El único método de selección disponible es TORNEO.");
        }
        Integer poblacion = config_ag.getTamano_poblacion();
        Integer torneo = config_ag.getTamano_torneo();
        if (torneo == null || torneo < 1 || (poblacion != null && torneo > poblacion)) {
            errores.add("El tamaño del torneo debe estar entre 1 y el tamaño de la población.");
        }
        String tipoCruce = config_ag.getTipo_cruce();
        Integer puntos = config_ag.getPuntos_cruce();
        if (!"OX".equals(tipoCruce) && !"BLOQUES_ORDEN".equals(tipoCruce)) {
            errores.add("El tipo de cruce debe ser OX o BLOQUES_ORDEN.");
        } else if (puntos == null || puntos < 1
                || ("OX".equals(tipoCruce) && puntos != 2)) {
            errores.add("OX requiere dos puntos; BLOQUES_ORDEN requiere al menos uno.");
        }
        Integer elitismo = config_ag.getElitismo();
        if (elitismo == null || elitismo < 0 || (poblacion != null && elitismo >= poblacion)) {
            errores.add("El elitismo debe estar entre 0 y el tamaño de la población menos uno.");
        }
        Integer reemplazos = config_ag.getReemplazos();
        if (reemplazos != null && (reemplazos < 1
                || (poblacion != null && elitismo != null
                && reemplazos > poblacion - elitismo))) {
            errores.add("Los reemplazos deben caber en los lugares no protegidos por elitismo.");
        }
        Integer limite = config_ag.getLimite_sin_mejora();
        if (limite != null && limite < 1) {
            errores.add("El límite sin mejora debe ser positivo o nulo.");
        }
        Double umbral = config_ag.getUmbral_mejora_cop();
        if (umbral == null || !Double.isFinite(umbral) || umbral < 0.0) {
            errores.add("El umbral de mejora debe ser finito y no negativo.");
        }
        Double escala = config_ag.getEscala_costo_referencia();
        if (escala != null && (!Double.isFinite(escala) || escala <= 0.0)) {
            errores.add("La escala de costo debe ser positiva o nula para cálculo automático.");
        }
        if (config_ag.getSemilla() != null && config_ag.getSemilla() < 0) {
            errores.add("La semilla debe ser un entero no negativo o nulo.");
        }

        return errores;
    }

    public List<String> validar_perturbacion(PerturbacionSensibilidad perturbacion, Escenario escenario) {
        List<String> errores = new ArrayList<>();
        if (perturbacion == null) {
            errores.add("La perturbación no puede ser nula.");
            return errores;
        }

        if (escenario == null) {
            errores.add("El escenario de referencia no existe.");
            return errores;
        }

        if (perturbacion.getEntidad_afectada_id() == null || perturbacion.getEntidad_afectada_id().trim().isEmpty()) {
            errores.add("La perturbación debe especificar la entidad afectada.");
        }

        if (perturbacion.getValor_variante() == null || !Double.isFinite(perturbacion.getValor_variante()) || perturbacion.getValor_variante() < 0.0) {
            errores.add("El valor resultante de la perturbación debe ser un número finito y no negativo.");
        }

        return errores;
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
