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

    // Obtener embarcaciones del socio (solo del socio autenticado)
    const { data: embarcaciones, error } = await supabase
      .from('embarcaciones')
      .select('id, nombre, tipo, matricula')
      .eq('socio_id', socioId) // CRÍTICO: Verificar que sea el socio autenticado
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener embarcaciones:', error);
      return NextResponse.json(
        { error: 'Error al obtener embarcaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ embarcaciones: embarcaciones || [] });
  } catch (error: any) {
    console.error('Error en API portal/embarcaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener embarcaciones' },
      { status: 500 }
    );
  }
}

