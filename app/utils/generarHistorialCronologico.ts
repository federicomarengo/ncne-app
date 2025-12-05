/**
 * Genera un historial cronológico de cupones y pagos con saldo acumulado
 * 
 * Estructura: Una línea por cupón seguida de sus pagos aplicados
 * Muestra saldo acumulado después de cada movimiento
 * 
 * @param socioId - ID del socio
 * @param supabase - Cliente de Supabase
 * @returns Array de movimientos ordenados cronológicamente con saldo acumulado
 */

import { calcularSaldoHistorico } from './calcularSaldoHistorico';

export interface MovimientoCronologico {
  tipo: 'cupon' | 'pago' | 'saldo_a_favor';
  fecha: string;
  concepto: string;
  monto: number;
  saldoAcumulado: number;
  saldoPendienteCupon?: number; // Para pagos, el saldo pendiente del cupón después de este pago
  detalle: any;
  cuponId?: number;
  pagoId?: number;
  montoAplicado?: number; // Para pagos, el monto aplicado a este cupón específico
  estado?: string; // Estado del cupón o pago
  esSaldoAFavor?: boolean; // Indica si este pago quedó como saldo a favor
}

export async function generarHistorialCronologico(
  socioId: number,
  supabase: any
): Promise<MovimientoCronologico[]> {
  try {
    // 1. Obtener todos los cupones del socio ordenados por fecha de emisión
    const { data: cupones, error: errorCupones } = await supabase
      .from('cupones')
      .select('*')
      .eq('socio_id', socioId)
      .order('fecha_emision', { ascending: true });

    if (errorCupones) {
      console.error('Error al cargar cupones:', errorCupones);
      return [];
    }

    // 2. Obtener todos los pagos del socio
    const { data: pagos, error: errorPagos } = await supabase
      .from('pagos')
      .select('*')
      .eq('socio_id', socioId)
      .order('fecha_pago', { ascending: true });

    if (errorPagos) {
      console.error('Error al cargar pagos:', errorPagos);
      return [];
    }

    // 3. Obtener todas las relaciones pago-cupón
    const pagosIds = pagos?.map((p: any) => p.id) || [];
    const { data: pagosCupones, error: errorPagosCupones } = await supabase
      .from('pagos_cupones')
      .select('*')
      .in('pago_id', pagosIds);

    if (errorPagosCupones) {
      console.error('Error al cargar relaciones pago-cupón:', errorPagosCupones);
    }

    // 4. Crear mapa de pagos por cupón y identificar pagos sin cupones asociados
    const pagosPorCupon = new Map<number, Array<{ pago: any; montoAplicado: number }>>();
    const pagosIdsAsociados = new Set<number>(); // IDs de pagos que tienen cupones asociados
    
    if (pagosCupones && pagos) {
      pagosCupones.forEach((pc: any) => {
        const pago = pagos.find((p: any) => p.id === pc.pago_id);
        if (pago) {
          pagosIdsAsociados.add(pc.pago_id);
          if (!pagosPorCupon.has(pc.cupon_id)) {
            pagosPorCupon.set(pc.cupon_id, []);
          }
          pagosPorCupon.get(pc.cupon_id)!.push({
            pago,
            montoAplicado: parseFloat(pc.monto_aplicado.toString()),
          });
        }
      });
    }

    // 5. Generar historial: agregar todos los movimientos sin calcular saldo acumulado
    const historial: MovimientoCronologico[] = [];

    // 5.1. Agregar todos los cupones con sus pagos
    if (cupones) {
      for (const cupon of cupones) {
        const montoCupon = parseFloat(cupon.monto_total.toString());
        
        // Usar el día 1 del mes del período como fecha para el cupón
        // Esto es la fecha que se muestra en la tabla y se usa para ordenamiento
        let fechaCupon: string;
        if (cupon.periodo_mes && cupon.periodo_anio) {
          const month = String(cupon.periodo_mes).padStart(2, '0');
          const year = cupon.periodo_anio;
          fechaCupon = `${year}-${month}-01`; // Formato YYYY-MM-DD
        } else {
          // Fallback a fecha_emision si no hay período
          fechaCupon = cupon.fecha_emision;
        }
        
        historial.push({
          tipo: 'cupon',
          fecha: fechaCupon,
          concepto: `Cupón ${cupon.numero_cupon}`,
          monto: montoCupon,
          saldoAcumulado: 0, // Se recalculará después
          saldoPendienteCupon: montoCupon, // Saldo pendiente inicial = monto total
          detalle: cupon,
          cuponId: cupon.id,
          estado: cupon.estado,
        });

        // Agregar pagos aplicados a este cupón, ordenados por fecha
        const pagosDelCupon = pagosPorCupon.get(cupon.id) || [];
        pagosDelCupon.sort((a, b) => 
          new Date(a.pago.fecha_pago).getTime() - new Date(b.pago.fecha_pago).getTime()
        );

        let saldoPendienteCupon = montoCupon;
        for (const { pago, montoAplicado } of pagosDelCupon) {
          saldoPendienteCupon -= montoAplicado; // Reducir saldo pendiente del cupón
          historial.push({
            tipo: 'pago',
            fecha: pago.fecha_pago,
            concepto: `Pago - ${pago.metodo_pago}`,
            monto: montoAplicado,
            saldoAcumulado: 0, // Se recalculará después
            saldoPendienteCupon: Math.max(0, saldoPendienteCupon), // Saldo pendiente después de este pago
            detalle: pago,
            pagoId: pago.id,
            cuponId: cupon.id,
            montoAplicado,
            estado: pago.estado_conciliacion,
          });
        }
      }
    }

    // 5.2. Agregar pagos que NO están asociados a ningún cupón (saldo a favor)
    if (pagos) {
      for (const pago of pagos) {
        if (!pagosIdsAsociados.has(pago.id)) {
          // Este pago no tiene cupones asociados, se guardó como saldo a favor
          const montoPago = parseFloat(pago.monto.toString());
          historial.push({
            tipo: 'pago',
            fecha: pago.fecha_pago,
            concepto: `Pago - ${pago.metodo_pago} (Saldo a favor)`,
            monto: montoPago,
            saldoAcumulado: 0, // Se recalculará después
            detalle: pago,
            pagoId: pago.id,
            montoAplicado: montoPago,
            estado: pago.estado_conciliacion,
            esSaldoAFavor: true, // Marcar que este pago quedó como saldo a favor
          });
        }
      }
    }

    // 6. Ordenar todo por fecha (cupones y pagos mezclados)
    historial.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      if (fechaA !== fechaB) {
        return fechaA - fechaB; // Orden ascendente: más antiguos primero
      }
      // Si misma fecha, cupones primero, luego pagos
      if (a.tipo === 'cupon' && b.tipo === 'pago') return -1;
      if (a.tipo === 'pago' && b.tipo === 'cupon') return 1;
      return 0;
    });

    // 7. Calcular saldo acumulado secuencialmente desde el movimiento más antiguo
    // Lógica: empezar en 0, luego para cada movimiento en orden cronológico:
    // - Si es cupón: resta del saldo (aumenta deuda, saldo negativo)
    // - Si es pago: suma al saldo (reduce deuda, saldo positivo)
    // Saldo negativo = debe dinero, Saldo positivo = saldo a favor
    let saldoAcumulado = 0;
    
    for (let i = 0; i < historial.length; i++) {
      const movimiento = historial[i];
      
      if (movimiento.tipo === 'cupon') {
        // Cupón: resta (aumenta deuda, saldo negativo)
        saldoAcumulado -= movimiento.monto;
      } else {
        // Pago: suma (reduce deuda, saldo positivo)
        // Usar montoAplicado si existe, sino usar monto
        const montoPago = movimiento.montoAplicado ?? movimiento.monto;
        saldoAcumulado += montoPago;
      }
      
      movimiento.saldoAcumulado = saldoAcumulado;
    }

    return historial;
  } catch (error) {
    console.error('Error al generar historial cronológico:', error);
    return [];
  }
}

