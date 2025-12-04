import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Cerrar sesión en Supabase
    await supabase.auth.signOut();
    
    return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error: any) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}

