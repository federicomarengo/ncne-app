import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';
import { logger } from '@/app/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const socioId = await getPortalSocioId();

    if (!socioId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Obtener datos del socio (solo el autenticado)
    const { data: socio, error } = await supabase
      .from('socios')
      .select('id, numero_socio, dni, nombre, apellido, email, telefono, direccion, localidad, fecha_ingreso, estado')
      .eq('id', socioId)
      .single();

    if (error || !socio) {
      return NextResponse.json(
        { error: 'Error al obtener datos del socio' },
        { status: 500 }
      );
    }

    // No devolver información sensible como DNI completo
    return NextResponse.json({
      socio: {
        ...socio,
        dni: socio.dni ? `****${socio.dni.slice(-4)}` : null, // Solo últimos 4 dígitos
      },
    });
  } catch (error: any) {
    logger.error('Error en API portal/socio:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos' },
      { status: 500 }
    );
  }
}

