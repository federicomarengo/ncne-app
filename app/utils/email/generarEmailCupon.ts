import { SupabaseClient } from '@supabase/supabase-js';
import { DatosEmailCupon } from '@/app/types/email';
import { EmailCuponTemplate } from '@/app/components/emails/EmailCuponTemplate';
import { logger } from '@/app/utils/logger';

/**
 * Genera el HTML del email para un cupón específico
 * 
 * Carga todos los datos necesarios del cupón, socio, embarcaciones, etc.
 * y los pasa al template para generar el HTML final
 */
export async function generarEmailCupon(
  supabase: SupabaseClient,
  cuponId: number,
  urlPortalBase: string = 'https://portal.clubnautico.com' // TODO: Reemplazar con URL real
): Promise<{ html: string; datos: DatosEmailCupon } | null> {
  try {
    // 1. Cargar datos del cupón con joins
    const { data: cupon, error: cuponError } = await supabase
      .from('cupones')
      .select(`
        *,
        socio:socios!inner(
          id,
          numero_socio,
          nombre,
          apellido,
          email
        )
      `)
      .eq('id', cuponId)
      .single();

    if (cuponError || !cupon) {
      logger.error('Error al cargar cupón:', cuponError);
      return null;
    }

    // Normalizar el socio (puede venir como array o objeto desde Supabase)
    const socioData = Array.isArray(cupon.socio) && cupon.socio.length > 0
      ? cupon.socio[0]
      : cupon.socio;

    if (!socioData || !socioData.id) {
      logger.error('Error: No se pudo obtener datos del socio');
      return null;
    }

    // 2. Cargar items del cupón
    const { data: items, error: itemsError } = await supabase
      .from('items_cupon')
      .select('*')
      .eq('cupon_id', cuponId)
      .order('id', { ascending: true });

    if (itemsError) {
      logger.error('Error al cargar items:', itemsError);
      // Continuar con items vacíos en lugar de fallar
    }

    // 3. Cargar embarcaciones del socio
    const { data: embarcaciones, error: embarcacionesError } = await supabase
      .from('embarcaciones')
      .select('nombre, tipo, eslora_pies')
      .eq('socio_id', socioData.id)
      .eq('estado', 'activa')
      .order('nombre', { ascending: true });

    if (embarcacionesError) {
      logger.error('Error al cargar embarcaciones:', embarcacionesError);
    }

    // 4. Cargar configuración del club
    const { data: config, error: configError } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError) {
      logger.error('Error al cargar configuración:', configError);
    }

    // 5. Obtener montos del cupón (ya están almacenados en la tabla)
    // Si no están disponibles, calcular desde items como respaldo
    const itemsArray = items || [];
    const monto_cuota_social = cupon.monto_cuota_social ?? 
      itemsArray
        .filter(i => i.descripcion?.toLowerCase().includes('cuota social'))
        .reduce((sum, i) => sum + (parseFloat(i.subtotal?.toString() || '0') || 0), 0);

    const monto_amarra = cupon.monto_amarra ?? 
      itemsArray
        .filter(i => i.descripcion?.toLowerCase().includes('amarra'))
        .reduce((sum, i) => sum + (parseFloat(i.subtotal?.toString() || '0') || 0), 0);

    const monto_visitas = cupon.monto_visitas ?? 
      itemsArray
        .filter(i => i.descripcion?.toLowerCase().includes('visita'))
        .reduce((sum, i) => sum + (parseFloat(i.subtotal?.toString() || '0') || 0), 0);

    const monto_intereses = cupon.monto_intereses ?? 
      itemsArray
        .filter(i => {
          const desc = i.descripcion?.toLowerCase() || '';
          return desc.includes('interés') || desc.includes('interes') || desc.includes('mora');
        })
        .reduce((sum, i) => sum + (parseFloat(i.subtotal?.toString() || '0') || 0), 0);

    const monto_otros_cargos = cupon.monto_otros_cargos ?? 
      itemsArray
        .filter(i => {
          const desc = i.descripcion?.toLowerCase() || '';
          return !desc.includes('cuota social') && 
                 !desc.includes('amarra') && 
                 !desc.includes('visita') && 
                 !desc.includes('interés') && 
                 !desc.includes('interes') &&
                 !desc.includes('mora');
        })
        .reduce((sum, i) => sum + (parseFloat(i.subtotal?.toString() || '0') || 0), 0);

    // 6. Construir objeto de datos
    const datos: DatosEmailCupon = {
      socio: {
        id: socioData.id,
        numero_socio: socioData.numero_socio,
        nombre: socioData.nombre,
        apellido: socioData.apellido,
        email: socioData.email,
      },
      cupon: {
        id: cupon.id,
        numero_cupon: cupon.numero_cupon,
        periodo_mes: cupon.periodo_mes,
        periodo_anio: cupon.periodo_anio,
        fecha_vencimiento: cupon.fecha_vencimiento,
        monto_total: cupon.monto_total,
        monto_cuota_social,
        monto_amarra,
        monto_visitas,
        monto_otros_cargos,
        monto_intereses,
      },
      items: itemsArray.map(item => ({
        descripcion: item.descripcion || '',
        cantidad: item.cantidad || 1,
        precio_unitario: parseFloat(item.precio_unitario?.toString() || '0') || 0,
        subtotal: parseFloat(item.subtotal?.toString() || '0') || 0,
      })),
      embarcaciones: (embarcaciones || []).map(emb => ({
        nombre: emb.nombre,
        tipo: emb.tipo,
        eslora_pies: emb.eslora_pies,
      })),
      club: {
        nombre: config?.club_nombre || 'Club Náutico Embalse',
        direccion: config?.club_direccion || null,
        telefono: config?.club_telefono1 || null,
        email: config?.club_email1 || null,
        web: config?.club_web || null,
      },
      banco: {
        nombre: config?.banco_nombre || null,
        cbu: config?.banco_cbu || null,
        alias: config?.banco_alias || null,
        titular: config?.banco_titular || null,
        tipo_cuenta: config?.banco_tipo_cuenta || null,
      },
      urlPortal: urlPortalBase,
    };

    // 7. Generar HTML con el template
    const html = EmailCuponTemplate(datos);

    return { html, datos };

  } catch (error) {
    logger.error('Error al generar email de cupón:', error);
    return null;
  }
}

/**
 * Genera el asunto del email para un cupón
 */
export function generarAsuntoCupon(
  nombreClub: string,
  mes: number,
  anio: number,
  numeroCupon: string
): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const nombreMes = meses[mes - 1] || '';
  
  return `Cupón ${nombreMes} ${anio} - ${nombreClub} (${numeroCupon})`;
}

/**
 * Valida que un cupón puede ser enviado por email
 */
export function validarCuponParaEmail(cupon: any, socio: any): { valido: boolean; error?: string } {
  if (!cupon) {
    return { valido: false, error: 'El cupón no existe' };
  }

  if (!socio || !socio.email) {
    return { valido: false, error: 'El socio no tiene email configurado' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(socio.email)) {
    return { valido: false, error: 'El email del socio no es válido' };
  }

  return { valido: true };
}

