'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from './contexts/SidebarContext';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // No mostrar Sidebar ni MainContent en /portal o /login
  // El portal tiene su propio layout
  // El proxy ya maneja la redirección a /login si no está autenticado
  if (pathname?.startsWith('/portal') || pathname === '/login') {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    );
  }

  // Si llegamos aquí, el proxy ya verificó la autenticación
  // No necesitamos verificar de nuevo en el cliente
  return (
    <ErrorBoundary>
      <SidebarProvider>
        <Sidebar />
        <MainContent>{children}</MainContent>
      </SidebarProvider>
    </ErrorBoundary>
  );
}

