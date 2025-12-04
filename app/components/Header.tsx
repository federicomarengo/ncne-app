'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../contexts/SidebarContext';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/socios': 'Gestión de Socios',
  '/visitas': 'Visitas',
  '/embarcaciones': 'Embarcaciones',
  '/pagos': 'Pagos',
  '/reportes': 'Reportes',
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';
  const { sidebarWidth } = useSidebar();

  return (
    <header 
      className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 right-0 z-30 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
        </button>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">Administrador</p>
            <p className="text-xs text-gray-500">admin@clubnautico.com</p>
          </div>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">A</span>
          </div>
        </div>
      </div>
    </header>
  );
}

