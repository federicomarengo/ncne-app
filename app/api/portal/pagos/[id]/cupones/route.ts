import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';
import { logger } from '@/app/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const socioId = await getPortalSocioId();

    if (!socioId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const pagoId = parseInt(resolvedParams.id);
    if (isNaN(pagoId)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que el pago pertenece al socio autenticado
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('id, socio_id')
      .eq('id', pagoId)
      .eq('socio_id', socioId)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Obtener cupones asociados al pago
    const { data: pagosCupones, error } = await supabase
      .from('pagos_cupones')
      .select(`
        *,
        cupon:cupones (
          id,
          numero_cupon,
          monto_total,
          estado,
          fecha_vencimiento,
          fecha_pago
        )
      `)
      .eq('pago_id', pagoId);

    if (error) {
      logger.error('Error al obtener cupones del pago:', error);
      return NextResponse.json(
        { error: 'Error al obtener cupones del pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cupones: pagosCupones || [] });
  } catch (error: any) {
    logger.error('Error en API portal/pagos/[id]/cupones:', error);
    return NextResponse.json(
      { error: 'Error al obtener cupones del pago' },
      { status: 500 }
    );
  }
}

