import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * DELETE /api/socios/[id]/keywords/[keywordId]
 * Elimina una keyword específica de un socio
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keywordId: string }> | { id: string; keywordId: string } }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await Promise.resolve(params);
    const socioId = parseInt(resolvedParams.id);
    const keywordId = parseInt(resolvedParams.keywordId);

    if (isNaN(socioId) || isNaN(keywordId)) {
      return NextResponse.json(
        { error: 'ID de socio o keyword inválido' },
        { status: 400 }
      );
    }

    // Verificar que la keyword pertenece al socio
    const { data: keyword, error: errorVerificacion } = await supabase
      .from('socios_keywords')
      .select('id, socio_id')
      .eq('id', keywordId)
      .eq('socio_id', socioId)
      .single();

    if (errorVerificacion || !keyword) {
      return NextResponse.json(
        { error: 'Keyword no encontrada o no pertenece a este socio' },
        { status: 404 }
      );
    }

    // Eliminar la keyword
    const { error } = await supabase
      .from('socios_keywords')
      .delete()
      .eq('id', keywordId)
      .eq('socio_id', socioId);

    if (error) {
      console.error('Error al eliminar keyword:', error);
      return NextResponse.json(
        { error: 'Error al eliminar keyword' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Keyword eliminada correctamente'
    });
  } catch (error: any) {
    console.error('Error en DELETE keyword individual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

