/**
 * Genera un historial cronológico de cupones y pagos con saldo acumulado
 * 
 * IMPORTANTE: Muestra cada pago UNA SOLA VEZ con su monto total,
 * no fragmentado por cupón. El desglose de aplicación se incluye en el detalle.
 * 
 * @param socioId - ID del socio
 * @param supabase - Cliente de Supabase
 * @returns Array de movimientos ordenados cronológicamente con saldo acumulado
 */

import { calcularSaldoHistorico } from './calcularSaldoHistorico';
import { logger } from '@/app/utils/logger';

export interface CuponAplicado {
  cupon_id: number;
  numero_cupon: string;
  monto_aplicado: number;
  monto_total_cupon: number;
}

export interface MovimientoCronologico {
  tipo: 'cupon' | 'pago';
  fecha: string;
  concepto: string;
  monto: number; // Monto TOTAL del movimiento (no fragmentado)
  saldoAcumulado: number;
  detalle: any;
  cuponId?: number;
  pagoId?: number;
  estado?: string;
  
  // Para PAGOS: información de aplicación
  cuponesAplicados?: CuponAplicado[]; // Lista de cupones a los que se aplicó este pago
  montoSaldoAFavor?: number; // Si quedó saldo a favor después de aplicar a cupones
}

export async function generarHistorialCronologico(
  socioId: number,
  supabase: any
): Promise<MovimientoCronologico[]> {
  try {
    // 1. Obtener todos los cupones del socio
    const { data: cupones, error: errorCupones } = await supabase
      .from('cupones')
      .select('*')
      .eq('socio_id', socioId)
      .order('fecha_emision', { ascending: true });

    if (errorCupones) {
      logger.error('Error al cargar cupones:', errorCupones);
      return [];
    }

    // 2. Obtener todos los pagos del socio
    const { data: pagos, error: errorPagos } = await supabase
      .from('pagos')
      .select('*')
      .eq('socio_id', socioId)
      .order('fecha_pago', { ascending: true });

    if (errorPagos) {
      logger.error('Error al cargar pagos:', errorPagos);
      return [];
    }

    // 3. Obtener todas las relaciones pago-cupón CON información de cupones
    const pagosIds = pagos?.map((p: any) => p.id) || [];
    const { data: pagosCupones, error: errorPagosCupones } = await supabase
      .from('pagos_cupones')
      .select(`
        *,
        cupon:cupones (
          id,
          numero_cupon,
          monto_total
        )
      `)
      .in('pago_id', pagosIds);

    if (errorPagosCupones) {
      logger.error('Error al cargar relaciones pago-cupón:', errorPagosCupones);
    }

    // 4. Crear mapa de cupones aplicados por pago
    const cuponesPorPago = new Map<number, CuponAplicado[]>();
    
    if (pagosCupones) {
      pagosCupones.forEach((pc: any) => {
        if (!cuponesPorPago.has(pc.pago_id)) {
          cuponesPorPago.set(pc.pago_id, []);
        }
        cuponesPorPago.get(pc.pago_id)!.push({
          cupon_id: pc.cupon_id,
          numero_cupon: pc.cupon?.numero_cupon || `Cupón #${pc.cupon_id}`,
          monto_aplicado: parseFloat(pc.monto_aplicado.toString()),
          monto_total_cupon: parseFloat(pc.cupon?.monto_total?.toString() || '0'),
        });
      });
    }

    // 5. Generar historial
    const historial: MovimientoCronologico[] = [];

    // 5.1. Agregar todos los cupones
    if (cupones) {
      for (const cupon of cupones) {
        const montoCupon = parseFloat(cupon.monto_total.toString());
        
        // Usar el día 1 del mes del período como fecha para el cupón
        let fechaCupon: string;
        if (cupon.periodo_mes && cupon.periodo_anio) {
          const month = String(cupon.periodo_mes).padStart(2, '0');
          const year = cupon.periodo_anio;
          fechaCupon = `${year}-${month}-01`;
        } else {
          fechaCupon = cupon.fecha_emision;
        }
        
        historial.push({
          tipo: 'cupon',
          fecha: fechaCupon,
          concepto: `Cupón ${cupon.numero_cupon}`,
          monto: montoCupon,
          saldoAcumulado: 0, // Se recalculará después
          detalle: cupon,
          cuponId: cupon.id,
          estado: cupon.estado,
        });
      }
    }

    // 5.2. Agregar TODOS los pagos (UNA VEZ cada uno, con su monto total)
    if (pagos) {
      for (const pago of pagos) {
        const montoPago = parseFloat(pago.monto.toString());
        const cuponesAplicados = cuponesPorPago.get(pago.id) || [];
        
        // Calcular cuánto se aplicó a cupones vs cuánto quedó como saldo a favor
        const totalAplicadoACupones = cuponesAplicados.reduce(
          (sum, ca) => sum + ca.monto_aplicado, 
          0
        );
        const montoSaldoAFavor = montoPago - totalAplicadoACupones;
        
        historial.push({
          tipo: 'pago',
          fecha: pago.fecha_pago,
          concepto: `Pago - ${pago.metodo_pago}`,
          monto: montoPago, // MONTO TOTAL del pago
          saldoAcumulado: 0, // Se recalculará después
          detalle: pago,
          pagoId: pago.id,
          estado: pago.estado_conciliacion,
          cuponesAplicados: cuponesAplicados.length > 0 ? cuponesAplicados : undefined,
          montoSaldoAFavor: montoSaldoAFavor > 0 ? montoSaldoAFavor : undefined,
        });
      }
    }

    // 6. Ordenar todo por fecha
    historial.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      if (fechaA !== fechaB) {
        return fechaA - fechaB; // Más antiguos primero
      }
      // Si misma fecha, cupones primero, luego pagos
      if (a.tipo === 'cupon' && b.tipo === 'pago') return -1;
      if (a.tipo === 'pago' && b.tipo === 'cupon') return 1;
      return 0;
    });

    // 7. Calcular saldo acumulado
    let saldoAcumulado = 0;
    
    for (let i = 0; i < historial.length; i++) {
      const movimiento = historial[i];
      
      if (movimiento.tipo === 'cupon') {
        // Cupón: resta (aumenta deuda, saldo negativo)
        saldoAcumulado -= movimiento.monto;
      } else {
        // Pago: suma (reduce deuda, saldo positivo)
        saldoAcumulado += movimiento.monto;
      }
      
      movimiento.saldoAcumulado = saldoAcumulado;
    }

    return historial;
  } catch (error) {
    logger.error('Error al generar historial cronológico:', error);
    return [];
  }
}
