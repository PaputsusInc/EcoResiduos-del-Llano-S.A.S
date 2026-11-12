import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarNavegacion } from './SidebarNavegacion';
import { HeaderPrincipal } from './HeaderPrincipal';

export function LayoutBase() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Barra Lateral con 19 HUs */}
      <SidebarNavegacion />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <HeaderPrincipal />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default LayoutBase;

