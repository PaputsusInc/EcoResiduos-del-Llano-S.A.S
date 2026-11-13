/**
 * Capa 1 — Clase Lógica de Presentación: VistaParametrizacionDinamica
 * Gobierna las vistas de parametrización interactiva (HU-01 a HU-07)
 */
export class VistaParametrizacionDinamica {
  constructor(escenario_activo_id = "ESC-01") {
    this.escenario_activo_id = escenario_activo_id;
    this.estado_vista = "INICIAL"; // INICIAL, EDITANDO_PUNTO, GUARDANDO, ERROR
    this.latitud_edicion = 4.15;
    this.longitud_edicion = -73.61;
    this.posicion_respaldo = null;
  }

  seleccionar_punto_mapa_osm(latitud, longitud) {
    if (latitud >= -90.0 && latitud <= 90.0 && longitud >= -180.0 && longitud <= 180.0) {
      if (!this.posicion_respaldo) {
        this.posicion_respaldo = { lat: this.latitud_edicion, lon: this.longitud_edicion };
      }
      this.latitud_edicion = latitud;
      this.longitud_edicion = longitud;
      this.estado_vista = "EDITANDO_PUNTO";
      return { latitud, longitud, valido: true };
    }
    return { latitud, longitud, valido: false, error: "Coordenadas fuera de rango" };
  }

  arrastrar_marcador_edicion(latitud, longitud) {
    return this.seleccionar_punto_mapa_osm(latitud, longitud);
  }

  cancelar_edicion_ubicacion() {
    if (this.posicion_respaldo) {
      this.latitud_edicion = this.posicion_respaldo.lat;
      this.longitud_edicion = this.posicion_respaldo.lon;
      this.posicion_respaldo = null;
    }
    this.estado_vista = "INICIAL";
    return { latitud: this.latitud_edicion, longitud: this.longitud_edicion };
  }

  capturar_datos_empresa(datos) {
    return {
      id: datos?.id?.trim(),
      nombre: datos?.nombre?.trim(),
      ubicacion: datos?.ubicacion?.trim(),
      latitud: Number(datos?.latitud),
      longitud: Number(datos?.longitud),
      tipo_residuo: datos?.tipo_residuo?.trim(),
      oferta_t: Number(datos?.oferta_t),
      precio_tonelada: Number(datos?.precio_tonelada ?? 0),
      plantas_compatibles: Array.isArray(datos?.plantas_compatibles) ? datos.plantas_compatibles : []
    };
  }

  capturar_datos_planta(datos) {
    return {
      id: datos?.id?.trim(),
      nombre: datos?.nombre?.trim(),
      ubicacion: datos?.ubicacion?.trim(),
      latitud: Number(datos?.latitud),
      longitud: Number(datos?.longitud),
      capacidad_maxima_t: Number(datos?.capacidad_maxima_t),
      costo_operacion_t: Number(datos?.costo_operacion_t ?? 0),
      residuos_admitidos: Array.isArray(datos?.residuos_admitidos) ? datos.residuos_admitidos : [],
      empresas_compatibles: Array.isArray(datos?.empresas_compatibles) ? datos.empresas_compatibles : []
    };
  }

  capturar_actualizacion_oferta(empresa_id, oferta_t) {
    return {
      empresa_id,
      oferta_t: Number(oferta_t)
    };
  }

  capturar_actualizacion_capacidad(planta_id, capacidad_maxima_t) {
    return {
      planta_id,
      capacidad_maxima_t: Number(capacidad_maxima_t)
    };
  }

  filtrar_conexiones_mapa(empresa_id, planta_id) {
    return {
      empresa_id: empresa_id === "TODOS" ? null : empresa_id,
      planta_id: planta_id === "TODAS" ? null : planta_id
    };
  }

  destacar_recorrido_mapa(ruta_id, geometria) {
    return {
      ruta_id,
      geometria: Array.isArray(geometria) ? geometria : [],
      destacado: true
    };
  }

  mostrar_conexiones_distancias(rutas) {
    return Array.isArray(rutas) ? rutas : [];
  }

  capturar_actualizacion_costo(ruta_id, costo_unitario_t, tarifa_t_km) {
    return {
      ruta_id,
      costo_unitario_t: costo_unitario_t != null ? Number(costo_unitario_t) : null,
      tarifa_t_km: tarifa_t_km != null ? Number(tarifa_t_km) : null
    };
  }

  mostrar_errores_validacion(errores) {
    return Array.isArray(errores) ? errores : [String(errores)];
  }

  mostrar_confirmacion_escenario(escenario) {
    return {
      id: escenario?.id,
      nombre: escenario?.nombre,
      oferta_total_t: escenario?.oferta_total_t,
      capacidad_total_t: escenario?.capacidad_total_t,
      aviso_capacidad: escenario?.aviso_capacidad || ""
    };
  }
}

