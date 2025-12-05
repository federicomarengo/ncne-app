import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const pagoId = parseInt(resolvedParams.id);
    
    if (isNaN(pagoId)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: pago, error } = await supabase
      .from('pagos')
      .select(`
        *,
        socio:socios (
          id,
          numero_socio,
          apellido,
          nombre,
          dni,
          cuit_cuil,
          email,
          telefono
        ),
        movimiento_bancario:movimientos_bancarios!fk_pagos_movimiento (
          id,
          fecha_movimiento,
          referencia_bancaria,
          concepto_completo,
          monto,
          apellido_transferente,
          nombre_transferente,
          cuit_cuil,
          dni,
          estado
        )
      `)
      .eq('id', pagoId)
      .single();

    if (error || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Cargar cupones asociados
    const { data: cuponesAsociados } = await supabase
      .from('pagos_cupones')
      .select(`
        *,
        cupon:cupones (
          id,
          numero_cupon,
          monto_total,
          estado,
          fecha_vencimiento,
          fecha_pago,
          concepto
        )
      `)
      .eq('pago_id', pagoId);

    return NextResponse.json({
      ...pago,
      cupones: cuponesAsociados || [],
    });
  } catch (error: any) {
    console.error('Error en API pagos/[id] GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener pago' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const pagoId = parseInt(resolvedParams.id);
    
    if (isNaN(pagoId)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const supabase = await createClient();

    // Verificar que el pago existe
    const { data: pagoExistente, error: errorExistente } = await supabase
      .from('pagos')
      .select('id')
      .eq('id', pagoId)
      .single();

    if (errorExistente || !pagoExistente) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (body.socio_id !== undefined) updateData.socio_id = parseInt(body.socio_id);
    if (body.fecha_pago !== undefined) updateData.fecha_pago = body.fecha_pago;
    if (body.monto !== undefined) updateData.monto = parseFloat(body.monto);
    if (body.metodo_pago !== undefined) updateData.metodo_pago = body.metodo_pago;
    if (body.numero_comprobante !== undefined) updateData.numero_comprobante = body.numero_comprobante || null;
    if (body.referencia_bancaria !== undefined) updateData.referencia_bancaria = body.referencia_bancaria || null;
    if (body.estado_conciliacion !== undefined) updateData.estado_conciliacion = body.estado_conciliacion;
    if (body.fecha_conciliacion !== undefined) updateData.fecha_conciliacion = body.fecha_conciliacion || null;
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones || null;

    const { data: pagoActualizado, error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pagoId)
      .select(`
        *,
        socio:socios (
          id,
          numero_socio,
          apellido,
          nombre,
          dni,
          cuit_cuil,
          email,
          telefono
        ),
        movimiento_bancario:movimientos_bancarios!fk_pagos_movimiento (
          id,
          fecha_movimiento,
          referencia_bancaria,
          concepto_completo,
          monto,
          apellido_transferente,
          nombre_transferente,
          cuit_cuil,
          dni,
          estado
        )
      `)
      .single();

    if (updateError) {
      console.error('Error al actualizar pago:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar pago' },
        { status: 500 }
      );
    }

    // Cargar cupones asociados
    const { data: cuponesAsociados } = await supabase
      .from('pagos_cupones')
      .select(`
        *,
        cupon:cupones (
          id,
          numero_cupon,
          monto_total,
          estado,
          fecha_vencimiento,
          fecha_pago,
          concepto
        )
      `)
      .eq('pago_id', pagoId);

    return NextResponse.json({
      ...pagoActualizado,
      cupones: cuponesAsociados || [],
    });
  } catch (error: any) {
    console.error('Error en API pagos/[id] PUT:', error);
    return NextResponse.json(
      { error: 'Error al actualizar pago' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const pagoId = parseInt(resolvedParams.id);
    
    if (isNaN(pagoId)) {
      return NextResponse.json(
        { error: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que el pago existe
    const { data: pagoExistente, error: errorExistente } = await supabase
      .from('pagos')
      .select('id')
      .eq('id', pagoId)
      .single();

    if (errorExistente || !pagoExistente) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar asociaciones con cupones primero
    const { error: errorCupones } = await supabase
      .from('pagos_cupones')
      .delete()
      .eq('pago_id', pagoId);

    if (errorCupones) {
      console.error('Error al eliminar asociaciones con cupones:', errorCupones);
      return NextResponse.json(
        { error: 'Error al eliminar asociaciones con cupones' },
        { status: 500 }
      );
    }

    // Eliminar el pago
    const { error: deleteError } = await supabase
      .from('pagos')
      .delete()
      .eq('id', pagoId);

    if (deleteError) {
      console.error('Error al eliminar pago:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API pagos/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar pago' },
      { status: 500 }
    );
  }
}

