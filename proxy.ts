import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { getPortalSession } from '@/utils/portal/session'

// Rutas que requieren autenticación de administrador (Supabase)
const ADMIN_ROUTES = [
  '/socios',
  '/cupones',
  '/pagos',
  '/embarcaciones',
  '/visitas',
  '/conciliacion',
  '/configuracion',
  '/reportes',
];

// Rutas del portal que requieren sesión de socio
const PORTAL_ROUTES = [
  '/portal',
];

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  '/api/portal/auth', // Login del portal
];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

function isPortalRoute(pathname: string): boolean {
  return PORTAL_ROUTES.some(route => pathname.startsWith(route)) && 
         !pathname.startsWith('/api/portal/auth') && 
         !pathname.startsWith('/api/portal/logout');
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
         pathname === '/' ||
         pathname.startsWith('/api/portal/logout');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (isPublicRoute(pathname)) {
    return await updateSession(request);
  }

  // Verificar rutas del portal
  if (isPortalRoute(pathname)) {
    const session = await getPortalSession(request);
    
    if (!session) {
      // Redirigir a login del portal si no hay sesión
      if (pathname !== '/portal') {
        return NextResponse.redirect(new URL('/portal', request.url));
      }
      // Si está en /portal sin sesión, permitir acceso (mostrará login)
      return await updateSession(request);
    }
    
    // Si hay sesión válida, continuar
    return await updateSession(request);
  }

  // Para rutas de admin, usar la autenticación de Supabase existente
  // El updateSession maneja la autenticación de Supabase
  return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes (manejadas por sus propios handlers)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

