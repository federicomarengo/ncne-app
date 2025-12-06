import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/app/utils/auth';
import { cuponUpdateSchema, validateAndParse } from '@/app/utils/validations';
import { logger } from '@/app/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const resolvedParams = await Promise.resolve(params);
    const cuponId = parseInt(resolvedParams.id);
    
    if (isNaN(cuponId)) {
      return NextResponse.json(
        { error: 'ID de cupón inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: cupon, error } = await supabase
      .from('cupones')
      .select(`
        *,
        socio:socios (
          id,
          numero_socio,
          apellido,
          nombre
        )
      `)
      .eq('id', cuponId)
      .single();

    if (error || !cupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cupon });
  } catch (error: any) {
    logger.error('Error en API cupones/[id] GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener cupón' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const resolvedParams = await Promise.resolve(params);
    const cuponId = parseInt(resolvedParams.id);
    
    if (isNaN(cuponId)) {
      return NextResponse.json(
        { error: 'ID de cupón inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validar datos de entrada
    const validation = validateAndParse(cuponUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();

    // Verificar que el cupón existe
    const { data: cuponExistente, error: errorExistente } = await supabase
      .from('cupones')
      .select('id, estado')
      .eq('id', cuponId)
      .single();

    if (errorExistente || !cuponExistente) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el cupón no esté pagado (o permitir edición con confirmación)
    // Por ahora permitimos editar cupones pagados también

    // Preparar datos de actualización (ya validados)
    const updateData: any = {};
    const validatedBody = validation.data;

    if (validatedBody.periodo_mes !== undefined) updateData.periodo_mes = validatedBody.periodo_mes;
    if (validatedBody.periodo_anio !== undefined) updateData.periodo_anio = validatedBody.periodo_anio;
    if (validatedBody.fecha_emision !== undefined) updateData.fecha_emision = validatedBody.fecha_emision;
    if (validatedBody.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = validatedBody.fecha_vencimiento;
    if (validatedBody.monto_cuota_social !== undefined) updateData.monto_cuota_social = validatedBody.monto_cuota_social;
    if (validatedBody.monto_amarra !== undefined) updateData.monto_amarra = validatedBody.monto_amarra;
    if (validatedBody.monto_visitas !== undefined) updateData.monto_visitas = validatedBody.monto_visitas;
    if (validatedBody.monto_otros_cargos !== undefined) updateData.monto_otros_cargos = validatedBody.monto_otros_cargos;
    if (validatedBody.monto_intereses !== undefined) updateData.monto_intereses = validatedBody.monto_intereses;
    if (validatedBody.monto_total !== undefined) updateData.monto_total = validatedBody.monto_total;
    if (validatedBody.estado !== undefined) updateData.estado = validatedBody.estado;
    if (validatedBody.fecha_pago !== undefined) updateData.fecha_pago = validatedBody.fecha_pago;
    if (validatedBody.observaciones !== undefined) updateData.observaciones = validatedBody.observaciones;

    const { data: cuponActualizado, error: updateError } = await supabase
      .from('cupones')
      .update(updateData)
      .eq('id', cuponId)
      .select(`
        *,
        socio:socios (
          id,
          numero_socio,
          apellido,
          nombre
        )
      `)
      .single();

    if (updateError) {
      logger.error('Error al actualizar cupón:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar cupón' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cupon: cuponActualizado });
  } catch (error: any) {
    logger.error('Error en API cupones/[id] PUT:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cupón' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const resolvedParams = await Promise.resolve(params);
    const cuponId = parseInt(resolvedParams.id);
    
    if (isNaN(cuponId)) {
      return NextResponse.json(
        { error: 'ID de cupón inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que el cupón existe
    const { data: cuponExistente, error: errorExistente } = await supabase
      .from('cupones')
      .select('id, estado')
      .eq('id', cuponId)
      .single();

    if (errorExistente || !cuponExistente) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar relaciones en pagos_cupones primero
    const { error: errorPagosCupones } = await supabase
      .from('pagos_cupones')
      .delete()
      .eq('cupon_id', cuponId);

    if (errorPagosCupones) {
      logger.error('Error al eliminar relaciones con pagos:', errorPagosCupones);
      return NextResponse.json(
        { error: 'Error al eliminar relaciones con pagos' },
        { status: 500 }
      );
    }

    // Eliminar items del cupón
    const { error: errorItems } = await supabase
      .from('items_cupon')
      .delete()
      .eq('cupon_id', cuponId);

    if (errorItems) {
      logger.error('Error al eliminar items del cupón:', errorItems);
      return NextResponse.json(
        { error: 'Error al eliminar items del cupón' },
        { status: 500 }
      );
    }

    // Eliminar el cupón
    const { error: deleteError } = await supabase
      .from('cupones')
      .delete()
      .eq('id', cuponId);

    if (deleteError) {
      logger.error('Error al eliminar cupón:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar cupón' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error en API cupones/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar cupón' },
      { status: 500 }
    );
  }
}

