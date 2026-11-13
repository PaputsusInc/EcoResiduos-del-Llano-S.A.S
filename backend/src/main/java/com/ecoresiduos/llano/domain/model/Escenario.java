package com.ecoresiduos.llano.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Escenario {

    @JsonProperty("id")
    private String id;

    @JsonProperty("nombre")
    private String nombre;

    @JsonProperty("periodo")
    private String periodo = "Una semana simulada";

    @JsonProperty("moneda")
    private String moneda = "COP";

    @JsonProperty("procedencia_datos")
    private String procedencia_datos;

    @JsonProperty("referencia_id")
    private String referencia_id;

    @JsonProperty("variaciones")
    private List<Map<String, Object>> variaciones = new ArrayList<>();

    @JsonProperty("referencia_snapshot")
    private Escenario referencia_snapshot;

    @JsonProperty("empresas")
    private List<Empresa> empresas = new ArrayList<>();

    @JsonProperty("plantas")
    private List<Planta> plantas = new ArrayList<>();

    @JsonProperty("nodos_paso")
    private List<NodoPaso> nodos_paso = new ArrayList<>();

    @JsonProperty("rutas")
    private List<Ruta> rutas = new ArrayList<>();

    @JsonProperty("oferta_total_t")
    private Double oferta_total_t = 0.0;

    @JsonProperty("capacidad_total_t")
    private Double capacidad_total_t = 0.0;

    @JsonProperty("aviso_capacidad")
    private String aviso_capacidad = "";

    public Escenario() {
    }

    public Escenario(String id, String nombre, String periodo, String moneda, String procedencia_datos) {
        this.id = id;
        this.nombre = nombre;
        this.periodo = periodo != null ? periodo : "Una semana simulada";
        this.moneda = moneda != null ? moneda : "COP";
        this.procedencia_datos = procedencia_datos;
    }

    public List<Ruta> guardar_empresa(Empresa empresa) {
        List<Ruta> rutasAfectadas = new ArrayList<>();
        Optional<Empresa> existenteOpt = this.empresas.stream()
                .filter(e -> Objects.equals(e.getId(), empresa.getId()))
                .findFirst();

        boolean cambioCoordenadas = false;
        if (existenteOpt.isPresent()) {
            Empresa existente = existenteOpt.get();
            if (!Objects.equals(existente.getLatitud(), empresa.getLatitud()) ||
                !Objects.equals(existente.getLongitud(), empresa.getLongitud())) {
                cambioCoordenadas = true;
            }
            int index = this.empresas.indexOf(existente);
            this.empresas.set(index, empresa);
        } else {
            this.empresas.add(empresa);
            cambioCoordenadas = true;
        }

        if (cambioCoordenadas) {
            rutasAfectadas.addAll(invalidar_rutas_por_nodo(empresa.getId()));
        }

        // Asegurar que existan rutas para todas las plantas
        for (Planta planta : this.plantas) {
            String rutaId = empresa.getId() + "->" + planta.getId();
            boolean rutaExiste = this.rutas.stream().anyMatch(r -> Objects.equals(r.getId(), rutaId));
            if (!rutaExiste) {
                Ruta nuevaRuta = new Ruta(rutaId, empresa.getId(), planta.getId(), null, "OSRM (provisional)",
                        new ArrayList<>(), "pendiente", 300.0, null, true, true);
                this.rutas.add(nuevaRuta);
                rutasAfectadas.add(nuevaRuta);
            }
        }

        calcular_totales_red();
        validar_balance_red();
        return rutasAfectadas;
    }

    public List<Ruta> guardar_planta(Planta planta) {
        List<Ruta> rutasAfectadas = new ArrayList<>();
        Optional<Planta> existenteOpt = this.plantas.stream()
                .filter(p -> Objects.equals(p.getId(), planta.getId()))
                .findFirst();

        boolean cambioCoordenadas = false;
        if (existenteOpt.isPresent()) {
            Planta existente = existenteOpt.get();
            if (!Objects.equals(existente.getLatitud(), planta.getLatitud()) ||
                !Objects.equals(existente.getLongitud(), planta.getLongitud())) {
                cambioCoordenadas = true;
            }
            int index = this.plantas.indexOf(existente);
            this.plantas.set(index, planta);
        } else {
            this.plantas.add(planta);
            cambioCoordenadas = true;
        }

        if (cambioCoordenadas) {
            rutasAfectadas.addAll(invalidar_rutas_por_nodo(planta.getId()));
        }

        // Asegurar que existan rutas desde todas las empresas
        for (Empresa empresa : this.empresas) {
            String rutaId = empresa.getId() + "->" + planta.getId();
            boolean rutaExiste = this.rutas.stream().anyMatch(r -> Objects.equals(r.getId(), rutaId));
            if (!rutaExiste) {
                Ruta nuevaRuta = new Ruta(rutaId, empresa.getId(), planta.getId(), null, "OSRM (provisional)",
                        new ArrayList<>(), "pendiente", 300.0, null, true, true);
                this.rutas.add(nuevaRuta);
                rutasAfectadas.add(nuevaRuta);
            }
        }

        calcular_totales_red();
        validar_balance_red();
        return rutasAfectadas;
    }

    public List<Ruta> invalidar_rutas_por_nodo(String nodo_id) {
        List<Ruta> afectadas = new ArrayList<>();
        for (Ruta ruta : this.rutas) {
            if (Objects.equals(ruta.getEmpresa_id(), nodo_id) || Objects.equals(ruta.getPlanta_id(), nodo_id)) {
                ruta.invalidar_recorrido();
                afectadas.add(ruta);
            }
        }
        return afectadas;
    }

    public void actualizar_oferta_empresa(String empresa_id, Double nueva_oferta_t) {
        this.empresas.stream()
                .filter(e -> Objects.equals(e.getId(), empresa_id))
                .findFirst()
                .ifPresent(e -> e.actualizar_oferta(nueva_oferta_t));
        calcular_totales_red();
        validar_balance_red();
    }

    public void actualizar_capacidad_planta(String planta_id, Double nueva_capacidad_t) {
        this.plantas.stream()
                .filter(p -> Objects.equals(p.getId(), planta_id))
                .findFirst()
                .ifPresent(p -> p.actualizar_capacidad(nueva_capacidad_t));
        calcular_totales_red();
        validar_balance_red();
    }

    public List<Ruta> filtrar_conexiones(String empresa_id, String planta_id) {
        List<Ruta> filtradas = new ArrayList<>();
        boolean sinFiltroEmpresa = empresa_id == null || empresa_id.isBlank() || "TODOS".equalsIgnoreCase(empresa_id);
        boolean sinFiltroPlanta = planta_id == null || planta_id.isBlank() || "TODOS".equalsIgnoreCase(planta_id) || "TODAS".equalsIgnoreCase(planta_id);

        for (Ruta r : this.rutas) {
            boolean coincideEmpresa = sinFiltroEmpresa || Objects.equals(r.getEmpresa_id(), empresa_id);
            boolean coincidePlanta = sinFiltroPlanta || Objects.equals(r.getPlanta_id(), planta_id);
            if (coincideEmpresa && coincidePlanta) {
                filtradas.add(r);
            }
        }
        return filtradas;
    }

    public void actualizar_costo_ruta(String ruta_id, Double nuevo_costo_t, Double nueva_tarifa_t_km) {
        for (Ruta r : this.rutas) {
            if (Objects.equals(r.getId(), ruta_id)) {
                r.actualizar_costo_unitario(nuevo_costo_t, nueva_tarifa_t_km);
                break;
            }
        }
    }

    public void calcular_totales_red() {
        this.oferta_total_t = this.empresas.stream()
                .mapToDouble(e -> e.getOferta_t() != null ? e.getOferta_t() : 0.0)
                .sum();
        this.capacidad_total_t = this.plantas.stream()
                .mapToDouble(p -> p.getCapacidad_maxima_t() != null ? p.getCapacidad_maxima_t() : 0.0)
                .sum();
    }

    public Map<String, Double> obtener_matriz_costos() {
        Map<String, Double> matriz = new LinkedHashMap<>();
        for (Ruta r : this.rutas) {
            if (Boolean.TRUE.equals(r.getActiva()) && Boolean.TRUE.equals(r.getCompatible()) && r.getCosto_unitario_t() != null) {
                matriz.put(r.getId(), r.getCosto_unitario_t());
            }
        }
        return matriz;
    }

    public Boolean validar_balance_red() {
        calcular_totales_red();
        if (this.oferta_total_t > this.capacidad_total_t) {
            this.aviso_capacidad = "Capacidad superada por la oferta";
            return false;
        } else {
            this.aviso_capacidad = "";
            return true;
        }
    }

    public Escenario clonar_profundo(String nuevo_id, String nuevo_nombre) {
        Escenario clon = CopiadorEscenarios.INSTANCE.copiarDatosOperativos(this);
        clon.setId(nuevo_id);
        clon.setNombre(nuevo_nombre);
        clon.validar_balance_red();
        return clon;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getPeriodo() {
        return periodo;
    }

    public void setPeriodo(String periodo) {
        this.periodo = periodo;
    }

    public String getMoneda() {
        return moneda;
    }

    public void setMoneda(String moneda) {
        this.moneda = moneda;
    }

    public String getProcedencia_datos() {
        return procedencia_datos;
    }

    public void setProcedencia_datos(String procedencia_datos) {
        this.procedencia_datos = procedencia_datos;
    }

    public String getReferencia_id() {
        return referencia_id;
    }

    public void setReferencia_id(String referencia_id) {
        this.referencia_id = referencia_id;
    }

    public List<Map<String, Object>> getVariaciones() {
        return variaciones;
    }

    public void setVariaciones(List<Map<String, Object>> variaciones) {
        this.variaciones = variaciones != null ? variaciones : new ArrayList<>();
    }

    public Escenario getReferencia_snapshot() {
        return referencia_snapshot;
    }

    public void setReferencia_snapshot(Escenario referencia_snapshot) {
        this.referencia_snapshot = referencia_snapshot;
    }

    public List<Empresa> getEmpresas() {
        return empresas;
    }

    public void setEmpresas(List<Empresa> empresas) {
        this.empresas = empresas != null ? empresas : new ArrayList<>();
    }

    public List<Planta> getPlantas() {
        return plantas;
    }

    public void setPlantas(List<Planta> plantas) {
        this.plantas = plantas != null ? plantas : new ArrayList<>();
    }

    public List<NodoPaso> getNodos_paso() {
        return nodos_paso;
    }

    public void setNodos_paso(List<NodoPaso> nodos_paso) {
        this.nodos_paso = nodos_paso != null ? nodos_paso : new ArrayList<>();
    }

    public List<Ruta> getRutas() {
        return rutas;
    }

    public void setRutas(List<Ruta> rutas) {
        this.rutas = rutas != null ? rutas : new ArrayList<>();
    }

    public Double getOferta_total_t() {
        return oferta_total_t;
    }

    public void setOferta_total_t(Double oferta_total_t) {
        this.oferta_total_t = oferta_total_t;
    }

    public Double getCapacidad_total_t() {
        return capacidad_total_t;
    }

    public void setCapacidad_total_t(Double capacidad_total_t) {
        this.capacidad_total_t = capacidad_total_t;
    }

    public String getAviso_capacidad() {
        return aviso_capacidad;
    }

    public void setAviso_capacidad(String aviso_capacidad) {
        this.aviso_capacidad = aviso_capacidad;
    }
}
