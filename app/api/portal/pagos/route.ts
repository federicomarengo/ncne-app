import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';

export async function GET(request: NextRequest) {
  try {
    const socioId = await getPortalSocioId();

    if (!socioId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Obtener pagos del socio (solo del socio autenticado)
    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('id, fecha_pago, monto, metodo_pago, numero_comprobante, estado_conciliacion, referencia_bancaria, observaciones')
      .eq('socio_id', socioId) // CRÍTICO: Verificar que sea el socio autenticado
      .order('fecha_pago', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al obtener pagos:', error);
      return NextResponse.json(
        { error: 'Error al obtener pagos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pagos: pagos || [] });
  } catch (error: any) {
    console.error('Error en API portal/pagos:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

