import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { enviarEmail, verificarConfiguracionSMTP } from '@/app/utils/email/enviarEmail';
import { ConfiguracionEmail, EmailPruebaRequest } from '@/app/types/email';
import { requireAuth } from '@/app/utils/auth';
import { emailTestSchema, validateAndParse } from '@/app/utils/validations';
import { logger } from '@/app/utils/logger';

/**
 * POST /api/emails/test
 * 
 * Envía un email de prueba para verificar la configuración SMTP
 * 
 * Body: { email_destino: string, asunto?: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  
  try {
    const supabase = await createClient();

    // Leer y validar body
    const body = await request.json();
    const validation = validateAndParse(emailTestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, mensaje: validation.error },
        { status: 400 }
      );
    }
    
    const { email_destino, asunto } = validation.data;

    // Cargar configuración de email
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

    // Verificar configuración SMTP primero
    const verificacion = await verificarConfiguracionSMTP(config as ConfiguracionEmail);
    if (!verificacion.success) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'Error en la configuración SMTP',
          error: verificacion.error,
          detalles: verificacion.detalles
        },
        { status: 400 }
      );
    }

    // Cargar datos del club para el email
    const { data: configuracionClub } = await supabase
      .from('configuracion')
      .select('club_nombre, club_telefono1, club_email1')
      .eq('id', 1)
      .maybeSingle();

    const nombreClub = configuracionClub?.club_nombre || 'Club Náutico Embalse';
    const telefonoClub = configuracionClub?.club_telefono1 || '';
    const emailClub = configuracionClub?.club_email1 || '';

    // Generar HTML del email de prueba
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background: #0066cc; color: white; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${nombreClub}</h1>
      </td>
    </tr>
    
    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">Email de Prueba</h2>
        
        <p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">
          Este es un email de prueba del sistema de envío de cupones.
        </p>
        
        <p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">
          Si estás recibiendo este mensaje, significa que la configuración SMTP está funcionando correctamente.
        </p>
        
        <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #004085; font-weight: bold;">✓ Configuración SMTP verificada exitosamente</p>
        </div>
        
        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
          Fecha de envío: ${new Date().toLocaleString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background: #343a40; color: white; padding: 20px; text-align: center; font-size: 13px;">
        <p style="margin: 0 0 5px 0;">${nombreClub}</p>
        ${telefonoClub ? `<p style="margin: 5px 0;">Tel: ${telefonoClub}</p>` : ''}
        ${emailClub ? `<p style="margin: 5px 0;">Email: ${emailClub}</p>` : ''}
        <p style="margin: 15px 0 0 0; font-size: 11px; color: #adb5bd;">
          Este es un email de prueba del sistema
        </p>
      </td>
    </tr>
    
  </table>
</body>
</html>
    `;

    // Enviar email de prueba
    const resultado = await enviarEmail(config as ConfiguracionEmail, {
      destinatario: email_destino,
      asunto: asunto || `Email de Prueba - ${nombreClub}`,
      html: htmlEmail,
    });

    if (!resultado.success) {
      return NextResponse.json(
        { 
          success: false, 
          mensaje: 'Error al enviar email de prueba',
          error: resultado.error,
          detalles: resultado.detalles
        },
        { status: 500 }
      );
    }

    // Registrar envío en la base de datos
    await supabase.from('envios_email').insert({
      tipo_envio: 'test',
      socio_id: null,
      cupon_id: null,
      email_destino,
      asunto: asunto || `Email de Prueba - ${nombreClub}`,
      estado: 'enviado',
      fecha_envio: new Date().toISOString(),
      intentos: 1,
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Email de prueba enviado exitosamente',
      detalles: resultado.detalles,
    });

  } catch (error: any) {
    logger.error('Error en API de email de prueba:', error);
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

