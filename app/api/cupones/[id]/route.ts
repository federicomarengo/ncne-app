import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
    console.error('Error en API cupones/[id] GET:', error);
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

    // Preparar datos de actualización
    const updateData: any = {};

    if (body.periodo_mes !== undefined) updateData.periodo_mes = parseInt(body.periodo_mes);
    if (body.periodo_anio !== undefined) updateData.periodo_anio = parseInt(body.periodo_anio);
    if (body.fecha_emision !== undefined) updateData.fecha_emision = body.fecha_emision;
    if (body.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = body.fecha_vencimiento;
    if (body.monto_cuota_social !== undefined) updateData.monto_cuota_social = parseFloat(body.monto_cuota_social);
    if (body.monto_amarra !== undefined) updateData.monto_amarra = parseFloat(body.monto_amarra);
    if (body.monto_visitas !== undefined) updateData.monto_visitas = parseFloat(body.monto_visitas);
    if (body.monto_otros_cargos !== undefined) updateData.monto_otros_cargos = parseFloat(body.monto_otros_cargos);
    if (body.monto_intereses !== undefined) updateData.monto_intereses = parseFloat(body.monto_intereses);
    if (body.monto_total !== undefined) updateData.monto_total = parseFloat(body.monto_total);
    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.fecha_pago !== undefined) updateData.fecha_pago = body.fecha_pago || null;
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones || null;

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
      console.error('Error al actualizar cupón:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar cupón' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cupon: cuponActualizado });
  } catch (error: any) {
    console.error('Error en API cupones/[id] PUT:', error);
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

    // Eliminar items del cupón primero
    const { error: errorItems } = await supabase
      .from('items_cupon')
      .delete()
      .eq('cupon_id', cuponId);

    if (errorItems) {
      console.error('Error al eliminar items del cupón:', errorItems);
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
      console.error('Error al eliminar cupón:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar cupón' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API cupones/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar cupón' },
      { status: 500 }
    );
  }
}

