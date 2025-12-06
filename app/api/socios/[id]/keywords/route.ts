import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/app/utils/auth';
import { keywordDeleteSchema, validateAndParse } from '@/app/utils/validations';
import { logger } from '@/app/utils/logger';

/**
 * GET /api/socios/[id]/keywords
 * Obtiene todas las keywords relacionadas con un socio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const supabase = await createClient();
    const resolvedParams = await Promise.resolve(params);
    const socioId = parseInt(resolvedParams.id);

    if (isNaN(socioId)) {
      return NextResponse.json(
        { error: 'ID de socio inválido' },
        { status: 400 }
      );
    }

    const { data: keywords, error } = await supabase
      .from('socios_keywords')
      .select('*')
      .eq('socio_id', socioId)
      .order('tipo', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error al obtener keywords:', error);
      return NextResponse.json(
        { error: 'Error al obtener keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({ keywords: keywords || [] });
  } catch (error: any) {
    logger.error('Error en GET keywords:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/socios/[id]/keywords
 * Elimina todas las keywords de un socio (o por tipo si se especifica)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const supabase = await createClient();
    const resolvedParams = await Promise.resolve(params);
    const socioId = parseInt(resolvedParams.id);

    if (isNaN(socioId)) {
      return NextResponse.json(
        { error: 'ID de socio inválido' },
        { status: 400 }
      );
    }

    // Obtener y validar parámetro opcional tipo de la query string
    const { searchParams } = new URL(request.url);
    const tipoParam = searchParams.get('tipo');
    
    const validation = validateAndParse(keywordDeleteSchema, { tipo: tipoParam || undefined });
    const tipo = validation.success ? validation.data.tipo : undefined;

    // Construir query base
    let query = supabase
      .from('socios_keywords')
      .delete()
      .eq('socio_id', socioId);

    // Si se especifica tipo, filtrar por tipo (solo 'cuit' ahora)
    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { error } = await query;

    if (error) {
      logger.error('Error al eliminar keywords:', error);
      return NextResponse.json(
        { error: 'Error al eliminar keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: tipo 
        ? `Keywords de tipo ${tipo} eliminadas correctamente`
        : 'Todas las keywords eliminadas correctamente'
    });
  } catch (error: any) {
    logger.error('Error en DELETE keywords:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

