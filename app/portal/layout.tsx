import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Portal de Socios - Club Náutico Embalse',
  description: 'Acceso a información personal del socio',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}

