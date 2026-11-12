import React, { useState } from 'react';
import { X, MapPin, Check, Undo2 } from 'lucide-react';
import { MapaLeafletOSRM } from './MapaLeafletOSRM';

export function ModalEdicionCoordenadas({
  abierto = false,
  titulo = "Seleccionar Ubicación en Mapa",
  latInicial = 4.15,
  lonInicial = -73.61,
  onGuardar,
  onCancelar
}) {
  const [lat, setLat] = useState(latInicial);
  const [lon, setLon] = useState(lonInicial);
  const [errorCoords, setErrorCoords] = useState("");

  if (!abierto) return null;

  const handleMapClick = (newLat, newLon) => {
    setLat(Number(newLat.toFixed(6)));
    setLon(Number(newLon.toFixed(6)));
    setErrorCoords("");
  };

  const handleLatChange = (e) => {
    const val = parseFloat(e.target.value);
    setLat(val);
    if (isNaN(val) || val < -90.0 || val > 90.0) {
      setErrorCoords("La latitud debe estar en el rango [-90.0, 90.0]");
    } else {
      setErrorCoords("");
    }
  };

  const handleLonChange = (e) => {
    const val = parseFloat(e.target.value);
    setLon(val);
    if (isNaN(val) || val < -180.0 || val > 180.0) {
      setErrorCoords("La longitud debe estar en el rango [-180.0, 180.0]");
    } else {
      setErrorCoords("");
    }
  };

  const handleConfirmar = () => {
    if (lat >= -90.0 && lat <= 90.0 && lon >= -180.0 && lon <= 180.0) {
      onGuardar(lat, lon);
    } else {
      setErrorCoords("Coordenadas inválidas. Verifique latitud [-90, 90] y longitud [-180, 180].");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base">{titulo}</h3>
          </div>
          <button
            onClick={onCancelar}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Haz clic en el mapa OpenStreetMap o arrastra el marcador para fijar las coordenadas geográficas exactas.
          </p>

          <MapaLeafletOSRM
            center={[!isNaN(lat) ? lat : 4.15, !isNaN(lon) ? lon : -73.61]}
            zoom={10}
            marcadorEdicion={{
              latitud: lat,
              longitud: lon,
              rotulo: "Punto Seleccionado",
              onDragEnd: (nLat, nLon) => handleMapClick(nLat, nLon)
            }}
            onMapClick={handleMapClick}
            height="340px"
          />

          {/* Sincronización bidireccional de campos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Latitud ([-90.0, 90.0]):
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={lat}
                onChange={handleLatChange}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Longitud ([-180.0, 180.0]):
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={lon}
                onChange={handleLonChange}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {errorCoords && (
            <p className="text-xs font-semibold text-rose-600">{errorCoords}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            Guardar Ubicación
          </button>
        </div>
      </div>
    </div>
  );
}

