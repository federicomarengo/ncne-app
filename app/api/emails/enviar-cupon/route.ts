import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generarEmailCupon, generarAsuntoCupon, validarCuponParaEmail } from '@/app/utils/email/generarEmailCupon';
import { enviarEmail } from '@/app/utils/email/enviarEmail';
import { ConfiguracionEmail } from '@/app/types/email';
import { requireAuth } from '@/app/utils/auth';
import { emailEnviarCuponSchema, validateAndParse } from '@/app/utils/validations';
import { logger } from '@/app/utils/logger';

/**
 * POST /api/emails/enviar-cupon
 * 
 * Envía un cupón individual por email
 * 
 * Body: { cupon_id: number, email_destino?: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const supabase = await createClient();

    // Leer y validar body
    const body = await request.json();
    const validation = validateAndParse(emailEnviarCuponSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, mensaje: validation.error },
        { status: 400 }
      );
    }
    
    const { cupon_id, email_destino } = validation.data;

    // 1. Cargar configuración de email
    const { data: config, error: configError } = await supabase
      .from('configuracion_email')
      .select('*')
      .eq('habilitado', true)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'No hay configuración de email activa',
          error: 'Debe configurar el servidor SMTP primero'
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
          mensaje: 'Cupón no encontrado',
          error: cuponError?.message
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
          mensaje: 'El cupón no puede ser enviado',
          error: validacion.error
        },
        { status: 400 }
      );
    }

    // Determinar email destino (override o del socio)
    const emailDestino = email_destino || cupon.socio.email;

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
        tipo_envio: cupon.numero_cupon.startsWith('ING-') ? 'cupon_ingreso' : 'cupon_individual',
        socio_id: cupon.socio_id,
        cupon_id: cupon.id,
        email_destino: emailDestino,
        asunto: asunto,
        estado: 'pendiente',
        intentos: 1,
      })
      .select()
      .single();

    if (envioRegistroError) {
      logger.error('Error al registrar envío:', envioRegistroError);
    }

    // 7. Enviar email
    const resultadoEnvio = await enviarEmail(config as ConfiguracionEmail, {
      destinatario: emailDestino,
      asunto: asunto,
      html: resultado.html,
      emailRealDestinatario: emailDestino, // Email real para mostrar en modo desarrollo
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
          error: resultadoEnvio.error,
          detalles: resultadoEnvio.detalles
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje: `Email enviado exitosamente a ${emailDestino}`,
      envio_id: envioRegistro?.id,
      detalles: resultadoEnvio.detalles,
    });

  } catch (error: any) {
    logger.error('Error en API de envío de cupón:', error);
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

