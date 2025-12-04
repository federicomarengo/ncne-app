import type { Metadata } from 'next'
import './globals.css'
import { SidebarProvider } from './contexts/SidebarContext'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import GlobalLoading from './components/ui/GlobalLoading'

export const metadata: Metadata = {
  title: 'Club Náutico Embalse - Sistema de Gestión',
  description: 'Sistema de gestión para el Club Náutico Embalse',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50" suppressHydrationWarning>
        <GlobalLoading />
        <SidebarProvider>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </SidebarProvider>
      </body>
    </html>
  )
}


