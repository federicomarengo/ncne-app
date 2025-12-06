import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/app/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Eliminar cookies de sesión
    cookieStore.delete('portal_session');
    cookieStore.delete('portal_socio_id');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error en logout del portal:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}


