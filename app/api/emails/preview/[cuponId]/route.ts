import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generarEmailCupon } from '@/app/utils/email/generarEmailCupon';
import { requireAuth } from '@/app/utils/auth';
import { logger } from '@/app/utils/logger';

/**
 * GET /api/emails/preview/[cuponId]
 * 
 * Genera una vista previa del email de un cupón sin enviarlo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cuponId: string }> | { cuponId: string } }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const resolvedParams = await Promise.resolve(params);
    const supabase = await createClient();

    const cuponId = parseInt(resolvedParams.cuponId);
    if (isNaN(cuponId)) {
      return NextResponse.json(
        { success: false, error: 'ID de cupón inválido' },
        { status: 400 }
      );
    }

    // Generar email
    const urlPortalBase = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000/portal';
    const resultado = await generarEmailCupon(supabase, cuponId, urlPortalBase);

    if (!resultado) {
      return NextResponse.json(
        { success: false, error: 'No se pudo generar el email del cupón' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      html: resultado.html,
      datos: resultado.datos,
    });

  } catch (error: any) {
    logger.error('Error en API de preview de email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}

