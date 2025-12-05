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

    // Verificar que el pago existe
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('id')
      .eq('id', pagoId)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
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
          fecha_pago,
          concepto
        )
      `)
      .eq('pago_id', pagoId);

    if (error) {
      console.error('Error al obtener cupones del pago:', error);
      return NextResponse.json(
        { error: 'Error al obtener cupones del pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cupones: pagosCupones || [] });
  } catch (error: any) {
    console.error('Error en API pagos/[id]/cupones GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener cupones del pago' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('id, monto, socio_id')
      .eq('id', pagoId)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Validar datos
    if (!body.cupon_id) {
      return NextResponse.json(
        { error: 'ID de cupón es obligatorio' },
        { status: 400 }
      );
    }

    const montoAplicado = body.monto_aplicado ? parseFloat(body.monto_aplicado) : 0;

    if (montoAplicado <= 0) {
      return NextResponse.json(
        { error: 'El monto aplicado debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que el cupón existe y pertenece al mismo socio
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select('id, socio_id, monto_total, estado')
      .eq('id', body.cupon_id)
      .single();

    if (cuponError || !cupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    if (cupon.socio_id !== pago.socio_id) {
      return NextResponse.json(
        { error: 'El cupón no pertenece al mismo socio del pago' },
        { status: 400 }
      );
    }

    // Verificar que no se exceda el monto del pago
    const { data: cuponesExistentes } = await supabase
      .from('pagos_cupones')
      .select('monto_aplicado')
      .eq('pago_id', pagoId);

    const totalAplicado = (cuponesExistentes || []).reduce(
      (sum, pc) => sum + parseFloat(pc.monto_aplicado.toString()),
      0
    );

    if (totalAplicado + montoAplicado > parseFloat(pago.monto.toString())) {
      return NextResponse.json(
        { error: 'El monto total aplicado excede el monto del pago' },
        { status: 400 }
      );
    }

    // Crear asociación
    const { data: nuevoPagoCupon, error: insertError } = await supabase
      .from('pagos_cupones')
      .insert({
        pago_id: pagoId,
        cupon_id: body.cupon_id,
        monto_aplicado: montoAplicado,
      })
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
      .single();

    if (insertError) {
      console.error('Error al crear asociación:', insertError);
      return NextResponse.json(
        { error: 'Error al crear asociación con cupón' },
        { status: 500 }
      );
    }

    // Actualizar estado del cupón si el monto aplicado cubre el total
    if (montoAplicado >= parseFloat(cupon.monto_total.toString())) {
      await supabase
        .from('cupones')
        .update({ estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] })
        .eq('id', body.cupon_id);
    }

    return NextResponse.json({ pagoCupon: nuevoPagoCupon }, { status: 201 });
  } catch (error: any) {
    console.error('Error en API pagos/[id]/cupones POST:', error);
    return NextResponse.json(
      { error: 'Error al crear asociación con cupón' },
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

    if (!body.pago_cupon_id) {
      return NextResponse.json(
        { error: 'ID de asociación es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que la asociación existe y pertenece al pago
    const { data: pagoCuponExistente, error: pagoCuponError } = await supabase
      .from('pagos_cupones')
      .select('id, pago_id, cupon_id')
      .eq('id', body.pago_cupon_id)
      .eq('pago_id', pagoId)
      .single();

    if (pagoCuponError || !pagoCuponExistente) {
      return NextResponse.json(
        { error: 'Asociación no encontrada' },
        { status: 404 }
      );
    }

    const montoAplicado = body.monto_aplicado ? parseFloat(body.monto_aplicado) : 0;

    if (montoAplicado <= 0) {
      return NextResponse.json(
        { error: 'El monto aplicado debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que no se exceda el monto del pago
    const { data: pago } = await supabase
      .from('pagos')
      .select('monto')
      .eq('id', pagoId)
      .single();

    const { data: cuponesExistentes } = await supabase
      .from('pagos_cupones')
      .select('monto_aplicado')
      .eq('pago_id', pagoId)
      .neq('id', body.pago_cupon_id);

    const totalAplicado = (cuponesExistentes || []).reduce(
      (sum, pc) => sum + parseFloat(pc.monto_aplicado.toString()),
      0
    );

    if (totalAplicado + montoAplicado > parseFloat(pago?.monto.toString() || '0')) {
      return NextResponse.json(
        { error: 'El monto total aplicado excede el monto del pago' },
        { status: 400 }
      );
    }

    // Actualizar asociación
    const { data: pagoCuponActualizado, error: updateError } = await supabase
      .from('pagos_cupones')
      .update({ monto_aplicado: montoAplicado })
      .eq('id', body.pago_cupon_id)
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
      .single();

    if (updateError) {
      console.error('Error al actualizar asociación:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar asociación' },
        { status: 500 }
      );
    }

    // Actualizar estado del cupón
    const { data: cupon } = await supabase
      .from('cupones')
      .select('monto_total')
      .eq('id', pagoCuponExistente.cupon_id)
      .single();

    if (montoAplicado >= parseFloat(cupon?.monto_total.toString() || '0')) {
      await supabase
        .from('cupones')
        .update({ estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] })
        .eq('id', pagoCuponExistente.cupon_id);
    } else {
      await supabase
        .from('cupones')
        .update({ estado: 'pendiente', fecha_pago: null })
        .eq('id', pagoCuponExistente.cupon_id);
    }

    return NextResponse.json({ pagoCupon: pagoCuponActualizado });
  } catch (error: any) {
    console.error('Error en API pagos/[id]/cupones PUT:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asociación' },
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

    const { searchParams } = new URL(request.url);
    const pagoCuponId = searchParams.get('pago_cupon_id');

    if (!pagoCuponId) {
      return NextResponse.json(
        { error: 'ID de asociación es obligatorio' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que la asociación existe y pertenece al pago
    const { data: pagoCuponExistente, error: pagoCuponError } = await supabase
      .from('pagos_cupones')
      .select('id, pago_id, cupon_id')
      .eq('id', parseInt(pagoCuponId))
      .eq('pago_id', pagoId)
      .single();

    if (pagoCuponError || !pagoCuponExistente) {
      return NextResponse.json(
        { error: 'Asociación no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar asociación
    const { error: deleteError } = await supabase
      .from('pagos_cupones')
      .delete()
      .eq('id', parseInt(pagoCuponId));

    if (deleteError) {
      console.error('Error al eliminar asociación:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar asociación' },
        { status: 500 }
      );
    }

    // Actualizar estado del cupón a pendiente
    await supabase
      .from('cupones')
      .update({ estado: 'pendiente', fecha_pago: null })
      .eq('id', pagoCuponExistente.cupon_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API pagos/[id]/cupones DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asociación' },
      { status: 500 }
    );
  }
}

