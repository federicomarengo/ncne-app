import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { getPortalSession } from '@/utils/portal/session'
import { createServerClient } from '@supabase/ssr'

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
  '/login',
  '/api/portal/auth', // Login del portal
  '/api/auth/login', // API de login de admin
  '/api/auth/user', // API para obtener usuario
];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route)) ||
         pathname === '/'; // La ruta raíz también requiere autenticación de admin
}

function isPortalRoute(pathname: string): boolean {
  return PORTAL_ROUTES.some(route => pathname.startsWith(route)) && 
         !pathname.startsWith('/api/portal/auth') && 
         !pathname.startsWith('/api/portal/logout');
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
         pathname.startsWith('/api/portal/logout') ||
         pathname.startsWith('/api/auth/logout'); // Permitir logout sin autenticación
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

  // Para rutas de admin, verificar autenticación de Supabase
  if (isAdminRoute(pathname)) {
    // Actualizar sesión primero
    const response = await updateSession(request);
    
    // Crear cliente de Supabase para verificar autenticación
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Si no hay usuario autenticado, redirigir a login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    return response
  }

  // Para cualquier otra ruta, solo actualizar sesión
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

