import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix para iconos de Leaflet en empaquetadores como Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icono personalizado para Empresas (Ámbar/Naranja)
const empresaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono personalizado para Plantas (Verde Esmeralda)
const plantaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono personalizado para Marcador de Edición Arrastrable (Azul Destacado)
const edicionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [28, 45],
  iconAnchor: [14, 45],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function EventosMapa({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function MapaLeafletOSRM({
  center = [4.15, -73.61],
  zoom = 9,
  empresas = [],
  plantas = [],
  marcadorEdicion = null, // { latitud, longitud, rotulo, onDragEnd }
  onMapClick = null,
  polilineas = [], // [{ ruta_id, coordenadas: [[lat, lon], ...], color, tooltip }]
  height = "420px"
}) {

  const markerHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null && marcadorEdicion?.onDragEnd) {
          const latlng = marker.getLatLng();
          marcadorEdicion.onDragEnd(latlng.lat, latlng.lng);
        }
      },
    }),
    [marcadorEdicion]
  );

  return (
    <div style={{ height, width: '100%' }} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} />
        <MapResizer />

        {onMapClick && <EventosMapa onMapClick={onMapClick} />}

        {/* Empresas */}
        {empresas.map((emp) => {
          if (emp.latitud == null || emp.longitud == null) return null;
          return (
            <Marker
              key={emp.id}
              position={[emp.latitud, emp.longitud]}
              icon={empresaIcon}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-amber-800">{emp.id} · {emp.nombre}</strong>
                  <p className="text-slate-600 my-0.5">{emp.ubicacion}</p>
                  <p className="font-semibold text-slate-900">Oferta: {emp.oferta_t} t/semana</p>
                  <p className="text-[10px] text-slate-500">Residuo: {emp.tipo_residuo}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Plantas */}
        {plantas.map((pla) => {
          if (pla.latitud == null || pla.longitud == null) return null;
          return (
            <Marker
              key={pla.id}
              position={[pla.latitud, pla.longitud]}
              icon={plantaIcon}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-emerald-800">{pla.id} · {pla.nombre}</strong>
                  <p className="text-slate-600 my-0.5">{pla.ubicacion}</p>
                  <p className="font-semibold text-slate-900">Capacidad: {pla.capacidad_maxima_t} t/semana</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcador arrastrable de edición */}
        {marcadorEdicion && marcadorEdicion.latitud != null && marcadorEdicion.longitud != null && (
          <Marker
            position={[marcadorEdicion.latitud, marcadorEdicion.longitud]}
            icon={edicionIcon}
            draggable={true}
            eventHandlers={markerHandlers}
          >
            <Popup>
              <div className="text-xs font-semibold text-blue-900">
                {marcadorEdicion.rotulo || "Ubicación en edición"}
                <p className="text-[10px] text-slate-500 font-normal">Arrastra o haz clic en el mapa</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Polilíneas de rutas viales OSRM */}
        {polilineas.map((linea, index) => (
          <Polyline
            key={linea.ruta_id || index}
            positions={linea.coordenadas}
            pathOptions={{
              color: linea.color || '#059669',
              weight: linea.destacado ? 5 : 3,
              opacity: linea.destacado ? 0.9 : 0.65
            }}
          >
            {linea.tooltip && <Popup><span className="text-xs">{linea.tooltip}</span></Popup>}
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
}

