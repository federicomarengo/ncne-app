import { createClient } from '@/utils/supabase/client';
import { VistaPreviaCupon, ItemPrevia } from '@/app/types/cupones';
import { Socio } from '@/app/types/socios';
import { Embarcacion } from '@/app/types/embarcaciones';
import { Visita } from '@/app/types/visitas';
import { logger } from '@/app/utils/logger';

export interface Configuracion {
  cuota_social_base: number;
  amarra_valor_por_pie: number;
  costo_visita: number;
  tasa_interes_mora: number;
  dia_vencimiento: number;
  dias_gracia: number;
}

interface CuponVencido {
  id: number;
  numero_cupon: string;
  socio_id: number;
  fecha_vencimiento: string;
  monto_total: number;
}

export interface CalcularVistaPreviaParams {
  mes: number;
  anio: number;
  fechaVencimiento: string;
  configuracion: Configuracion;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Función helper para calcular costo de amarra según tipo
export const calcularCostoAmarra = (embarcacion: Embarcacion, config: Configuracion): number => {
  const tipo = embarcacion.tipo?.toLowerCase();
  const eslora = parseFloat(embarcacion.eslora_pies?.toString() || '0');

  // Cruceros y veleros: por pie
  if (tipo === 'crucero' || tipo === 'velero') {
    return eslora * config.amarra_valor_por_pie;
  }

  // Guardería vela ligera, optimist, moto de agua, cuatriciclo: $42,000
  if (tipo === 'vela_ligera' || tipo === 'optimist' || tipo === 'moto_agua' || tipo === 'cuatriciclo') {
    return 42000;
  }

  // Guardería windsurf, kayak, canoa: $14,000
  if (tipo === 'windsurf' || tipo === 'kayak' || tipo === 'canoa') {
    return 14000;
  }

  // Guardería lancha/moto hasta 5.5m: $56,000
  if (tipo === 'lancha') {
    // Verificar si es hasta 5.5m (aproximadamente 18 pies)
    if (eslora <= 18) {
      return 56000;
    }
  }

  // Por defecto: calcular por pie (cruceros/veleros)
  return eslora * config.amarra_valor_por_pie;
};

// Función helper para obtener descripción de amarra según tipo
export const obtenerDescripcionAmarra = (embarcacion: Embarcacion, config: Configuracion): string => {
  const tipo = embarcacion.tipo?.toLowerCase();
  const eslora = parseFloat(embarcacion.eslora_pies?.toString() || '0');
  const nombreEmbarcacion = embarcacion.nombre || '';

  if (tipo === 'crucero' || tipo === 'velero') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} ` : '';
    return `Amarra embarcación ${nombreParte}${eslora} pies × ${formatCurrency(config.amarra_valor_por_pie)}`;
  }

  if (tipo === 'vela_ligera') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
    return `${nombreParte}Guardería vela ligera`;
  }

  if (tipo === 'optimist') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
    return `${nombreParte}Guardería optimist`;
  }

  if (tipo === 'moto_agua') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
    return `${nombreParte}Guardería moto de agua`;
  }

  if (tipo === 'cuatriciclo') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
    return `${nombreParte}Guardería cuatriciclo`;
  }

  if (tipo === 'windsurf' || tipo === 'kayak' || tipo === 'canoa') {
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
    return `${nombreParte}Guardería windsurf/kayak/canoa`;
  }

  if (tipo === 'lancha') {
    if (eslora <= 18) {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería lancha/moto hasta 5.5m`;
    }
  }

  // Por defecto
  const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} ` : '';
  return `Amarra embarcación ${nombreParte}${eslora} pies × ${formatCurrency(config.amarra_valor_por_pie)}`;
};

export async function calcularVistaPreviaCupones(
  params: CalcularVistaPreviaParams
): Promise<VistaPreviaCupon[]> {
  const { mes, anio, fechaVencimiento, configuracion } = params;

  const supabase = createClient();

  // Verificar si ya existen cupones para este período
  const { data: cuponesExistentes } = await supabase
    .from('cupones')
    .select('id')
    .eq('periodo_mes', mes)
    .eq('periodo_anio', anio)
    .limit(1);

  if (cuponesExistentes && cuponesExistentes.length > 0) {
    throw new Error('Ya existen cupones generados para este período');
  }

  // Obtener todos los socios activos
  const { data: socios, error: errorSocios } = await supabase
    .from('socios')
    .select('*')
    .eq('estado', 'activo')
    .order('apellido', { ascending: true });

  if (errorSocios) {
    throw new Error('Error al cargar socios');
  }

  // Obtener todas las embarcaciones
  const { data: embarcaciones, error: errorEmbarcaciones } = await supabase
    .from('embarcaciones')
    .select('*');

  if (errorEmbarcaciones) {
    logger.error('Error al cargar embarcaciones:', errorEmbarcaciones);
  }

  // Obtener visitas pendientes del mes
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

  const { data: visitas, error: errorVisitas } = await supabase
    .from('visitas')
    .select('*')
    .eq('estado', 'pendiente')
    .gte('fecha_visita', fechaInicio.toISOString().split('T')[0])
    .lte('fecha_visita', fechaFin.toISOString().split('T')[0]);

  if (errorVisitas) {
    logger.error('Error al cargar visitas:', errorVisitas);
  }

  // Obtener cupones pendientes o vencidos cuya fecha de vencimiento ya pasó para calcular intereses
  const fechaActualStr = new Date().toISOString().split('T')[0];
  const { data: cuponesVencidos, error: errorCuponesVencidos } = await supabase
    .from('cupones')
    .select('id, numero_cupon, socio_id, fecha_vencimiento, monto_total')
    .in('estado', ['pendiente', 'vencido'])
    .lt('fecha_vencimiento', fechaActualStr);

  if (errorCuponesVencidos) {
    logger.error('Error al cargar cupones vencidos:', errorCuponesVencidos);
  }

  // Calcular vista previa para cada socio
  const vistaPreviaCalculada: VistaPreviaCupon[] = [];
  const fechaActual = new Date();

  for (const socio of socios || []) {
    const itemsPrevia: ItemPrevia[] = [];
    
    // Cuota social base
    const montoCuotaSocial = configuracion.cuota_social_base;
    itemsPrevia.push({
      tipo: 'cuota_social',
      descripcion: `Cuota Social - ${mes}/${anio} - ${formatCurrency(montoCuotaSocial)}`,
      monto: montoCuotaSocial,
    });

    // Cargo por amarra (una por cada embarcación)
    let montoAmarra = 0;
    const embarcacionesSocio = (embarcaciones || []).filter(
      (e: Embarcacion) => e.socio_id === socio.id
    );
    
    for (const embarcacion of embarcacionesSocio) {
      const costoAmarra = calcularCostoAmarra(embarcacion, configuracion);
      montoAmarra += costoAmarra;
      itemsPrevia.push({
        tipo: 'amarra',
        descripcion: obtenerDescripcionAmarra(embarcacion, configuracion),
        monto: costoAmarra,
      });
    }

    // Visitas del mes (una por cada visita)
    const visitasSocio = (visitas || []).filter(
      (v: Visita) => v.socio_id === socio.id
    );
    let montoVisitas = 0;
    for (const visita of visitasSocio) {
      const montoVisita = parseFloat(visita.monto_total?.toString() || '0');
      montoVisitas += montoVisita;
      const fechaVisita = new Date(visita.fecha_visita).toLocaleDateString('es-AR');
      itemsPrevia.push({
        tipo: 'visita',
        descripcion: `Visita ${fechaVisita} - ${visita.cantidad_visitantes} persona(s) × ${formatCurrency(visita.costo_unitario)} - ${formatCurrency(montoVisita)}`,
        monto: montoVisita,
      });
    }

    // Cuotas de planes de financiación - FUNCIONALIDAD REMOVIDA
    const montoCuotasPlanes = 0;

    // Intereses por deuda vencida (uno por cada cupón vencido)
    const cuponesVencidosSocio = (cuponesVencidos || []).filter(
      (c: CuponVencido) => c.socio_id === socio.id
    );
    let montoIntereses = 0;
    const cuponesVencidosConInteres: Array<{ cupon: CuponVencido; diasMora: number; interes: number }> = [];

    for (const cuponVencido of cuponesVencidosSocio) {
      const fechaVencimientoCupon = new Date(cuponVencido.fecha_vencimiento);
      const diasTranscurridos = Math.floor(
        (fechaActual.getTime() - fechaVencimientoCupon.getTime()) / (1000 * 60 * 60 * 24)
      );
      const diasMora = Math.max(0, diasTranscurridos - configuracion.dias_gracia);

      if (diasMora > 0) {
        const saldoVencido = parseFloat(cuponVencido.monto_total?.toString() || '0');
        const interesDiario = (saldoVencido * configuracion.tasa_interes_mora) / 30;
        const interes = interesDiario * diasMora;
        montoIntereses += interes;

        cuponesVencidosConInteres.push({
          cupon: cuponVencido,
          diasMora,
          interes,
        });

        itemsPrevia.push({
          tipo: 'interes',
          descripcion: `Intereses por mora - Cupón ${cuponVencido.numero_cupon} (${diasMora} días) - ${formatCurrency(interes)}`,
          monto: interes,
        });
      }
    }

    const montoTotal =
      montoCuotaSocial + montoAmarra + montoVisitas + montoCuotasPlanes + montoIntereses;

    vistaPreviaCalculada.push({
      socio: {
        id: socio.id,
        numero_socio: socio.numero_socio,
        apellido: socio.apellido,
        nombre: socio.nombre,
        dni: socio.dni || null,
        email: socio.email || null,
      },
      montoCuotaSocial,
      montoAmarra,
      montoVisitas,
      montoCuotasPlanes,
      montoIntereses,
      montoTotal,
      visitas: visitasSocio.map(v => ({
        id: v.id,
        fecha_visita: v.fecha_visita,
        cantidad_visitantes: v.cantidad_visitantes,
        costo_unitario: v.costo_unitario,
        monto_total: parseFloat(v.monto_total?.toString() || '0'),
      })),
      embarcaciones: embarcacionesSocio.map(e => ({
        id: e.id,
        tipo: e.tipo,
        eslora_pies: e.eslora_pies,
      })),
      cuponesVencidos: cuponesVencidosConInteres,
      items: itemsPrevia,
      seleccionado: true, // Por defecto todos seleccionados
    });
  }

  // Ordenar por apellido
  vistaPreviaCalculada.sort((a, b) => {
    const apellidoA = a.socio.apellido.toLowerCase();
    const apellidoB = b.socio.apellido.toLowerCase();
    return apellidoA.localeCompare(apellidoB);
  });

  return vistaPreviaCalculada;
}






