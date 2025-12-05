import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Verifica si el usuario está autenticado
 * Retorna el usuario si está autenticado, null si no
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return null;
  }
}

/**
 * Middleware helper para proteger rutas API
 * Retorna el usuario si está autenticado, o una respuesta 401 si no
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      ),
      user: null,
    };
  }
  
  return { error: null, user };
}

