import { useState, useEffect, useRef } from 'react';
import { api } from './client';

/**
 * Hook de Polling HTTP interactivo para HU-18 (AG) y HU-19 (Exacto)
 * Consulta el endpoint de seguimiento cada intervaloMs mientras estado === "EN_EJECUCION"
 */
export function usePollingEjecucion(ejecucionId, metodo = "EXACTO", intervaloMs = 350) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ejecucionId) {
      setData(null);
      setError(null);
      setErrorStatus(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    const checkStatus = async () => {
      try {
        let resp;
        if (metodo === "AG") {
          resp = await api.consultarEvolucionAg(ejecucionId);
        } else {
          resp = await api.consultarProcedimientoExacto(ejecucionId);
        }

        if (!isMounted) return;
        setData(resp);
        setErrorStatus(null);

        const estado = resp?.resultado?.estado;
        const terminales = [
          "OPTIMO",
          "FACTIBLE_SIN_CERTIFICAR",
          "INFACTIBLE_CERTIFICADO",
          "SIN_CANDIDATO_FACTIBLE_AG",
          "ERROR",
          "ERROR_EJECUCION"
        ];

        if (terminales.includes(estado)) {
          setLoading(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Error en consulta de seguimiento');
        setErrorStatus(err.status || null);
        setLoading(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    // Primera llamada inmediata
    checkStatus();

    // Iniciar intervalo de polling
    timerRef.current = setInterval(checkStatus, intervaloMs);

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ejecucionId, metodo, intervaloMs]);

  return { data, loading, error, errorStatus };
}
