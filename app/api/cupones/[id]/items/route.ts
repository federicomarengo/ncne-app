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

    // Verificar que el cupón existe
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select('id')
      .eq('id', cuponId)
      .single();

    if (cuponError || !cupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Obtener items del cupón
    const { data: items, error } = await supabase
      .from('items_cupon')
      .select('*')
      .eq('cupon_id', cuponId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al obtener items del cupón:', error);
      return NextResponse.json(
        { error: 'Error al obtener items del cupón' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: items || [] });
  } catch (error: any) {
    console.error('Error en API cupones/[id]/items GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener items del cupón' },
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
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select('id')
      .eq('id', cuponId)
      .single();

    if (cuponError || !cupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Validar datos del item
    if (!body.descripcion || body.descripcion.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es obligatoria' },
        { status: 400 }
      );
    }

    const cantidad = body.cantidad ? parseInt(body.cantidad) : 1;
    const precioUnitario = body.precio_unitario ? parseFloat(body.precio_unitario) : null;
    const subtotal = body.subtotal ? parseFloat(body.subtotal) : (precioUnitario ? precioUnitario * cantidad : 0);

    // Crear el item
    const { data: nuevoItem, error: insertError } = await supabase
      .from('items_cupon')
      .insert({
        cupon_id: cuponId,
        descripcion: body.descripcion.trim(),
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotal,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al crear item:', insertError);
      return NextResponse.json(
        { error: 'Error al crear item' },
        { status: 500 }
      );
    }

    // Recalcular total del cupón
    await recalcularTotalCupon(supabase, cuponId);

    return NextResponse.json({ item: nuevoItem }, { status: 201 });
  } catch (error: any) {
    console.error('Error en API cupones/[id]/items POST:', error);
    return NextResponse.json(
      { error: 'Error al crear item' },
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

    if (!body.item_id) {
      return NextResponse.json(
        { error: 'ID de item es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que el item pertenece al cupón
    const { data: itemExistente, error: itemError } = await supabase
      .from('items_cupon')
      .select('id, cupon_id, cantidad, precio_unitario')
      .eq('id', body.item_id)
      .eq('cupon_id', cuponId)
      .single();

    if (itemError || !itemExistente) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (body.descripcion !== undefined) {
      if (body.descripcion.trim().length === 0) {
        return NextResponse.json(
          { error: 'La descripción no puede estar vacía' },
          { status: 400 }
        );
      }
      updateData.descripcion = body.descripcion.trim();
    }
    if (body.cantidad !== undefined) updateData.cantidad = parseInt(body.cantidad);
    if (body.precio_unitario !== undefined) {
      updateData.precio_unitario = body.precio_unitario ? parseFloat(body.precio_unitario) : null;
    }
    if (body.subtotal !== undefined) {
      updateData.subtotal = parseFloat(body.subtotal);
    } else if (updateData.cantidad !== undefined || updateData.precio_unitario !== undefined) {
      // Recalcular subtotal si cambió cantidad o precio
      const cantidad = updateData.cantidad !== undefined ? updateData.cantidad : itemExistente.cantidad;
      const precioUnitario = updateData.precio_unitario !== undefined ? updateData.precio_unitario : itemExistente.precio_unitario;
      updateData.subtotal = precioUnitario ? precioUnitario * cantidad : 0;
    }

    // Actualizar el item
    const { data: itemActualizado, error: updateError } = await supabase
      .from('items_cupon')
      .update(updateData)
      .eq('id', body.item_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar item:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar item' },
        { status: 500 }
      );
    }

    // Recalcular total del cupón
    await recalcularTotalCupon(supabase, cuponId);

    return NextResponse.json({ item: itemActualizado });
  } catch (error: any) {
    console.error('Error en API cupones/[id]/items PUT:', error);
    return NextResponse.json(
      { error: 'Error al actualizar item' },
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

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'ID de item es obligatorio' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que el item pertenece al cupón
    const { data: itemExistente, error: itemError } = await supabase
      .from('items_cupon')
      .select('id, cupon_id, cantidad, precio_unitario')
      .eq('id', parseInt(itemId))
      .eq('cupon_id', cuponId)
      .single();

    if (itemError || !itemExistente) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el item
    const { error: deleteError } = await supabase
      .from('items_cupon')
      .delete()
      .eq('id', parseInt(itemId));

    if (deleteError) {
      console.error('Error al eliminar item:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar item' },
        { status: 500 }
      );
    }

    // Recalcular total del cupón
    await recalcularTotalCupon(supabase, cuponId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API cupones/[id]/items DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar item' },
      { status: 500 }
    );
  }
}

// Función helper para recalcular el total del cupón
async function recalcularTotalCupon(supabase: any, cuponId: number) {
  // Obtener todos los items del cupón
  const { data: items, error: itemsError } = await supabase
    .from('items_cupon')
    .select('subtotal')
    .eq('cupon_id', cuponId);

  if (itemsError) {
    console.error('Error al obtener items para recalcular:', itemsError);
    return;
  }

  // Calcular total
  const total = items?.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal.toString()), 0) || 0;

  // Actualizar el cupón
  await supabase
    .from('cupones')
    .update({ monto_total: total })
    .eq('id', cuponId);
}

