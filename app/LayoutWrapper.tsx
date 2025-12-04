'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from './contexts/SidebarContext';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // No mostrar Sidebar ni MainContent en /portal
  // El portal tiene su propio layout
  if (pathname?.startsWith('/portal')) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <MainContent>{children}</MainContent>
    </SidebarProvider>
  );
}

