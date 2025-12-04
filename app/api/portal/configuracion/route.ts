import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';

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

    // Obtener configuración (solo CBU para mostrar al socio)
    const { data: config, error } = await supabase
      .from('configuracion')
      .select('banco_cbu')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error al obtener configuración:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({ configuracion: config || null });
  } catch (error: any) {
    console.error('Error en API portal/configuracion:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

