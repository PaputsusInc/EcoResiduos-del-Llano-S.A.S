import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import LayoutBase from './components/layout/LayoutBase';

// Pages
import HubPrincipalPage from './pages/HubPrincipalPage';
import Hu01EmpresasGeneradorasPage from './pages/hu01_parametrizacion/Hu01EmpresasGeneradorasPage';
import Hu02PlantasProcesadorasPage from './pages/hu01_parametrizacion/Hu02PlantasProcesadorasPage';
import Hu03OfertaEmpresasPage from './pages/hu01_parametrizacion/Hu03OfertaEmpresasPage';
import Hu04CapacidadPlantasPage from './pages/hu01_parametrizacion/Hu04CapacidadPlantasPage';
import Hu05DistanciasVialesPage from './pages/hu01_parametrizacion/Hu05DistanciasVialesPage';
import Hu06CostosTransportePage from './pages/hu01_parametrizacion/Hu06CostosTransportePage';
import Hu07ValidacionEscenarioPage from './pages/hu01_parametrizacion/Hu07ValidacionEscenarioPage';

import Hu08ResolucionExactaEstadosPage from './pages/hu02_optimizacion/Hu08ResolucionExactaEstadosPage';
import Hu09AsignacionFlujosCostosPage from './pages/hu02_optimizacion/Hu09AsignacionFlujosCostosPage';
import Hu16ComparacionExactoVsAgPage from './pages/hu02_optimizacion/Hu16ComparacionExactoVsAgPage';
import Hu19ProcedimientoMetodoExactoPage from './pages/hu02_optimizacion/Hu19ProcedimientoMetodoExactoPage';

import LaboratorioSimulacionPage from './pages/hu03_simulacion/LaboratorioSimulacionPage';
import ComparacionSensibilidadPage from './pages/hu03_simulacion/ComparacionSensibilidadPage';
import Hu17EscalabilidadRedPage from './pages/hu04_dual/Hu17EscalabilidadRedPage';

import Hu18SeguimientoGeneracionesAgPage from './pages/hu05_trazabilidad/Hu18SeguimientoGeneracionesAgPage';
import AjusteParametrosAgPage from './pages/hu05_trazabilidad/AjusteParametrosAgPage';

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LayoutBase />}>
            {/* Redirección raíz hacia /panel */}
            <Route index element={<Navigate to="/panel" replace />} />
            <Route path="panel" element={<HubPrincipalPage />} />

            {/* 1. Red y Parámetros */}
            <Route path="empresas" element={<Hu01EmpresasGeneradorasPage />} />
            <Route path="plantas" element={<Hu02PlantasProcesadorasPage />} />
            <Route path="oferta-semanal" element={<Hu03OfertaEmpresasPage />} />
            <Route path="capacidad-plantas" element={<Hu04CapacidadPlantasPage />} />
            <Route path="rutas-viales" element={<Hu05DistanciasVialesPage />} />
            <Route path="costos-transporte" element={<Hu06CostosTransportePage />} />
            <Route path="validacion" element={<Hu07ValidacionEscenarioPage />} />

            {/* 2. Optimización Exacta y Procedimiento */}
            <Route path="resolucion-exacta" element={<Hu08ResolucionExactaEstadosPage />} />
            <Route path="asignacion-costos" element={<Hu09AsignacionFlujosCostosPage />} />
            <Route path="procedimiento-exacto" element={<Hu19ProcedimientoMetodoExactoPage />} />

            {/* 3. Algoritmo Genético y Comparación */}
            <Route path="comparacion-metodos" element={<Hu16ComparacionExactoVsAgPage />} />
            <Route path="escalabilidad" element={<Hu17EscalabilidadRedPage />} />
            <Route path="ajuste-ag" element={<AjusteParametrosAgPage />} />
            <Route path="evolucion-ag" element={<Hu18SeguimientoGeneracionesAgPage />} />

            {/* 4. Simulación y Sensibilidad */}
            <Route path="simulacion" element={<LaboratorioSimulacionPage />} />
            <Route path="comparacion-sensibilidad" element={<ComparacionSensibilidadPage />} />
            <Route path="sensibilidad-costos" element={<Navigate to="/simulacion" replace />} />
            <Route path="sensibilidad-ofertas" element={<Navigate to="/simulacion" replace />} />
            <Route path="sensibilidad-capacidades" element={<Navigate to="/simulacion" replace />} />
            <Route path="precios-sombra" element={<Navigate to="/simulacion" replace />} />
            <Route path="rangos-optimalidad" element={<Navigate to="/simulacion" replace />} />
            <Route path="evaluacion-sensibilidad" element={<Navigate to="/comparacion-sensibilidad" replace />} />

            {/* Redirecciones de compatibilidad hacia rutas semánticas */}
            <Route path="hu-01" element={<Navigate to="/empresas" replace />} />
            <Route path="hu-02" element={<Navigate to="/plantas" replace />} />
            <Route path="hu-03" element={<Navigate to="/oferta-semanal" replace />} />
            <Route path="hu-04" element={<Navigate to="/capacidad-plantas" replace />} />
            <Route path="hu-05" element={<Navigate to="/rutas-viales" replace />} />
            <Route path="hu-06" element={<Navigate to="/costos-transporte" replace />} />
            <Route path="hu-07" element={<Navigate to="/validacion" replace />} />
            <Route path="hu-08" element={<Navigate to="/resolucion-exacta" replace />} />
            <Route path="hu-09" element={<Navigate to="/asignacion-costos" replace />} />
            <Route path="hu-10" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-11" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-12" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-13" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-14" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-15" element={<Navigate to="/simulacion" replace />} />
            <Route path="hu-16" element={<Navigate to="/comparacion-metodos" replace />} />
            <Route path="hu-17" element={<Navigate to="/escalabilidad" replace />} />
            <Route path="hu-18" element={<Navigate to="/evolucion-ag" replace />} />
            <Route path="hu-19" element={<Navigate to="/procedimiento-exacto" replace />} />

            {/* Fallback general */}
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
