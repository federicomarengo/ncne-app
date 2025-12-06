import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/app/utils/logger';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dni, numeroSocio } = body;

    if (!dni || !numeroSocio) {
      return NextResponse.json(
        { error: 'DNI y número de socio son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const dniLimpio = dni.replace(/\D/g, '');

    // Validar credenciales en el servidor
    const { data: socio, error } = await supabase
      .from('socios')
      .select('id, numero_socio, dni, nombre, apellido, email, telefono, estado')
      .eq('dni', dniLimpio)
      .eq('numero_socio', parseInt(numeroSocio))
      .maybeSingle();

    if (error || !socio) {
      return NextResponse.json(
        { error: 'DNI o número de socio incorrecto' },
        { status: 401 }
      );
    }

    // Verificar que el socio esté activo
    if (socio.estado !== 'activo') {
      return NextResponse.json(
        { error: 'Su cuenta no está activa. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // Generar token de sesión seguro
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Guardar sesión en cookies httpOnly
    const cookieStore = await cookies();
    cookieStore.set('portal_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    // Guardar información de la sesión en cookie adicional (sin datos sensibles)
    cookieStore.set('portal_socio_id', socio.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    // Opcional: Guardar sesión en base de datos para invalidación
    // Por ahora usamos solo cookies, pero se puede agregar una tabla de sesiones

    return NextResponse.json({
      success: true,
      socio: {
        id: socio.id,
        numero_socio: socio.numero_socio,
        nombre: socio.nombre,
        apellido: socio.apellido,
      },
    });
  } catch (error: any) {
    logger.error('Error en autenticación del portal:', error);
    return NextResponse.json(
      { error: 'Error al autenticar. Por favor, intente nuevamente.' },
      { status: 500 }
    );
  }
}


