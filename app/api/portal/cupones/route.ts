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

    // Obtener cupones del socio (solo del socio autenticado)
    const { data: cupones, error } = await supabase
      .from('cupones')
      .select('id, numero_cupon, periodo_mes, periodo_anio, fecha_emision, fecha_vencimiento, monto_total, estado, fecha_pago, observaciones')
      .eq('socio_id', socioId) // CRÍTICO: Verificar que sea el socio autenticado
      .order('fecha_vencimiento', { ascending: true });

    if (error) {
      logger.error('Error al obtener cupones:', error);
      return NextResponse.json(
        { error: 'Error al obtener cupones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cupones: cupones || [] });
  } catch (error: any) {
    logger.error('Error en API portal/cupones:', error);
    return NextResponse.json(
      { error: 'Error al obtener cupones' },
      { status: 500 }
    );
  }
}

