import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';

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
    const cuponId = parseInt(resolvedParams.id);
    if (isNaN(cuponId)) {
      return NextResponse.json(
        { error: 'ID de cupón inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que el cupón pertenece al socio autenticado
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select('id, socio_id')
      .eq('id', cuponId)
      .eq('socio_id', socioId)
      .single();

    if (cuponError || !cupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado o no autorizado' },
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
    console.error('Error en API portal/cupones/[id]/items:', error);
    return NextResponse.json(
      { error: 'Error al obtener items del cupón' },
      { status: 500 }
    );
  }
}

