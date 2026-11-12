import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { CATALOGO_ESCENARIOS_SEMILLA, ESCENARIO_01 } from '../data/escenariosSemilla';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [escenarioActivoId, setEscenarioActivoId] = useState("ESC-01");
  const [escenarioActivo, setEscenarioActivo] = useState(ESCENARIO_01);
  const [listaEscenarios, setListaEscenarios] = useState(CATALOGO_ESCENARIOS_SEMILLA);
  const [ejecucionActivaId, setEjecucionActivaId] = useState(null);
  const [ejecucionActiva, setEjecucionActiva] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cambiarEscenario = useCallback(async (id) => {
    if (!id) return;
    setEscenarioActivoId(id);

    // 1. Sincrónicamente establecer el escenario local para respuesta reactiva instantánea (0 ms)
    const local = listaEscenarios.find(e => e.id === id) || CATALOGO_ESCENARIOS_SEMILLA.find(e => e.id === id);
    if (local) {
      setEscenarioActivo({ ...local });
    }

    // 2. Traer del backend si está conectado para obtener el estado más reciente
    setCargando(true);
    setError(null);
    try {
      const data = await api.obtenerEscenario(id);
      if (data?.escenario) {
        setEscenarioActivo(data.escenario);
      }
    } catch (err) {
      console.warn(`Operando con escenario local ${id}:`, err.message);
    } finally {
      setCargando(false);
    }
  }, [listaEscenarios]);

  const cargarEscenarios = useCallback(async () => {
    try {
      const data = await api.listarEscenarios();
      if (data?.escenarios && Array.isArray(data.escenarios) && data.escenarios.length > 0) {
        setListaEscenarios(data.escenarios);
        const match = data.escenarios.find(e => e.id === escenarioActivoId);
        if (match) {
          setEscenarioActivo(match);
        }
      }
    } catch (err) {
      console.warn("Backend no disponible. Usando catálogo semilla local:", err.message);
    }
  }, [escenarioActivoId]);

  useEffect(() => {
    cargarEscenarios();
  }, [cargarEscenarios]);

  const actualizarEscenarioLocal = (escenarioActualizado) => {
    if (!escenarioActualizado || !escenarioActualizado.id) return;
    setEscenarioActivo(escenarioActualizado);
    setListaEscenarios(prev => {
      const idx = prev.findIndex(e => e.id === escenarioActualizado.id);
      if (idx !== -1) {
        const clon = [...prev];
        clon[idx] = escenarioActualizado;
        return clon;
      }
      return [...prev, escenarioActualizado];
    });
  };

  const value = {
    escenarioActivoId,
    setEscenarioActivoId: cambiarEscenario,
    cambiarEscenario,
    seleccionarEscenario: cambiarEscenario,
    cambiarEscenarioActivo: cambiarEscenario,
    escenarioActivo,
    setEscenarioActivo: actualizarEscenarioLocal,
    listaEscenarios,
    cargarEscenarios,
    recargarEscenarioActivo: cambiarEscenario,
    ejecucionActivaId,
    setEjecucionActivaId,
    ejecucionActiva,
    setEjecucionActiva,
    cargando,
    error
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe utilizarse dentro de un SessionProvider');
  }
  return context;
}
