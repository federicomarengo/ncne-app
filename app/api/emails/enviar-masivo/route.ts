import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generarEmailCupon, generarAsuntoCupon, validarCuponParaEmail } from '@/app/utils/email/generarEmailCupon';
import { enviarEmail } from '@/app/utils/email/enviarEmail';
import { ConfiguracionEmail } from '@/app/types/email';
import { requireAuth } from '@/app/utils/auth';
import { logger } from '@/app/utils/logger';

/**
 * POST /api/emails/enviar-masivo
 * 
 * Envía un cupón individual (usado por el envío masivo)
 * Esta API es similar a enviar-cupon pero optimizada para llamadas masivas
 * 
 * Body: { cupon_id: number }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const supabase = await createClient();

    // Leer body
    const body = await request.json();
    const { cupon_id } = body;

    if (!cupon_id) {
      return NextResponse.json(
        { success: false, mensaje: 'ID de cupón es obligatorio' },
        { status: 400 }
      );
    }

    // 1. Cargar configuración de email (cacheable)
    const { data: config, error: configError } = await supabase
      .from('configuracion_email')
      .select('*')
      .eq('habilitado', true)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'No hay configuración de email activa'
        },
        { status: 400 }
      );
    }

    // 2. Cargar cupón y socio
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select(`
        *,
        socio:socios!inner(*)
      `)
      .eq('id', cupon_id)
      .single();

    if (cuponError || !cupon) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'Cupón no encontrado'
        },
        { status: 404 }
      );
    }

    // 3. Validar que el cupón puede ser enviado
    const validacion = validarCuponParaEmail(cupon, cupon.socio);
    if (!validacion.valido) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: validacion.error || 'El cupón no puede ser enviado'
        },
        { status: 400 }
      );
    }

    // 4. Generar HTML del email
    const urlPortalBase = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000/portal';
    const resultado = await generarEmailCupon(supabase, cupon_id, urlPortalBase);

    if (!resultado) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'No se pudo generar el email del cupón'
        },
        { status: 500 }
      );
    }

    // 5. Cargar configuración del club para el asunto
    const { data: clubConfig } = await supabase
      .from('configuracion')
      .select('club_nombre')
      .eq('id', 1)
      .maybeSingle();

    const nombreClub = clubConfig?.club_nombre || 'Club Náutico Embalse';
    const asunto = generarAsuntoCupon(
      nombreClub,
      cupon.periodo_mes,
      cupon.periodo_anio,
      cupon.numero_cupon
    );

    // 6. Registrar intento de envío
    const { data: envioRegistro, error: envioRegistroError } = await supabase
      .from('envios_email')
      .insert({
        tipo_envio: 'cupon_mensual',
        socio_id: cupon.socio_id,
        cupon_id: cupon.id,
        email_destino: cupon.socio.email,
        asunto: asunto,
        estado: 'pendiente',
        intentos: 1,
      })
      .select()
      .single();

    // 7. Enviar email
    const resultadoEnvio = await enviarEmail(config as ConfiguracionEmail, {
      destinatario: cupon.socio.email,
      asunto: asunto,
      html: resultado.html,
      emailRealDestinatario: cupon.socio.email, // Email real para mostrar en modo desarrollo
    });

    // 8. Actualizar estado del envío
    if (envioRegistro) {
      await supabase
        .from('envios_email')
        .update({
          estado: resultadoEnvio.success ? 'enviado' : 'error',
          fecha_envio: resultadoEnvio.success ? new Date().toISOString() : null,
          error_mensaje: resultadoEnvio.success ? null : resultadoEnvio.error,
        })
        .eq('id', envioRegistro.id);
    }

    if (!resultadoEnvio.success) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'Error al enviar email',
          error: resultadoEnvio.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje: `Email enviado a ${cupon.socio.email}`,
      envio_id: envioRegistro?.id,
    });

  } catch (error: any) {
    logger.error('Error en API de envío masivo:', error);
    return NextResponse.json(
      { 
        success: false, 
        mensaje: 'Error interno del servidor',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

