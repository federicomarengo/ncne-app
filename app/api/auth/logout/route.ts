import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Cerrar sesión en Supabase
    await supabase.auth.signOut();
    
    // Limpiar cookies de sesión
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    
    return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error: any) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}

