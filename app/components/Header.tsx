'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '../contexts/SidebarContext';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/socios': 'Gestión de Socios',
  '/visitas': 'Visitas',
  '/embarcaciones': 'Embarcaciones',
  '/pagos': 'Pagos',
  '/reportes': 'Reportes',
};

interface User {
  id: string;
  email: string;
  metadata?: any;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || 'Dashboard';
  const { sidebarWidth } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar información del usuario
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Limpiar estado del usuario
        setUser(null);
        // Redirigir a login
        router.push('/login');
        router.refresh();
      } else {
        console.error('Error al cerrar sesión');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
      setShowUserMenu(false);
    }
  };

  return (
    <>
      {/* Header para desktop con sidebar */}
      <header 
        className="hidden lg:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-6 fixed top-0 right-0 z-30 transition-all duration-300"
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
          <div className="relative flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.metadata?.nombre || user?.metadata?.name || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500">{user?.email || 'admin@clubnautico.com'}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="text-white font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </button>
              
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-200 sm:hidden">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.metadata?.nombre || user?.metadata?.name || 'Administrador'}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email || 'admin@clubnautico.com'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Header para mobile sin sidebar */}
      <header 
        className="lg:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-30"
      >
        <div className="flex items-center flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-red-400 ring-1 ring-white"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-white font-medium text-xs">A</span>
            </button>
            
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.metadata?.nombre || user?.metadata?.name || 'Administrador'}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email || 'admin@clubnautico.com'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

