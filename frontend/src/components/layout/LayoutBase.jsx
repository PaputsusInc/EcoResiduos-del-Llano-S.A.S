import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarNavegacion } from './SidebarNavegacion';
import { HeaderPrincipal } from './HeaderPrincipal';

export function LayoutBase() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {menuAbierto && <button type="button" aria-label="Cerrar menú de navegación" onClick={() => setMenuAbierto(false)} className="fixed inset-0 z-40 bg-slate-950/60 xl:hidden" />}
      <SidebarNavegacion abierto={menuAbierto} alNavegar={() => setMenuAbierto(false)} />

      {/* Contenido Principal */}
      <div className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        <HeaderPrincipal abrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default LayoutBase;
