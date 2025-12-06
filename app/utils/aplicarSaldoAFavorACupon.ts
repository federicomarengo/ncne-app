/**
 * Aplica el saldo a favor del socio a un cupón recién generado
 * 
 * Esta función se debe llamar inmediatamente después de generar un nuevo cupón.
 * Si el socio tiene saldo a favor, se aplica automáticamente al cupón.
 * 
 * @param cuponId - ID del cupón recién generado
 * @param socioId - ID del socio
 * @param supabase - Cliente de Supabase
 * @returns Monto aplicado y saldo a favor restante
 */

import { calcularSaldoPendienteCupon } from './calcularSaldoPendienteCupon';
import { obtenerSaldoAFavor, manejarSaldoAFavor } from './manejarSaldoAFavor';
import { logger } from '@/app/utils/logger';

export interface ResultadoAplicacionSaldoFavor {
  montoAplicado: number;
  saldoRestante: number;
  cuponQuedoPagado: boolean;
}

export async function aplicarSaldoAFavorACupon(
  cuponId: number,
  socioId: number,
  supabase: any
): Promise<ResultadoAplicacionSaldoFavor> {
  try {
    // 1. Obtener saldo a favor del socio
    const saldoDisponible = await obtenerSaldoAFavor(socioId, supabase);

    if (saldoDisponible <= 0) {
      return {
        montoAplicado: 0,
        saldoRestante: 0,
        cuponQuedoPagado: false,
      };
    }

    // 2. Calcular saldo pendiente del cupón (debería ser igual al monto_total si es nuevo)
    const saldoPendiente = await calcularSaldoPendienteCupon(cuponId, supabase);

    if (saldoPendiente <= 0) {
      // Cupón ya está pagado, no hacer nada
      return {
        montoAplicado: 0,
        saldoRestante: saldoDisponible,
        cuponQuedoPagado: true,
      };
    }

    // 3. Aplicar saldo a favor (lo que alcance)
    const montoAAplicar = Math.min(saldoDisponible, saldoPendiente);
    const saldoRestante = saldoDisponible - montoAAplicar;
    const cuponQuedoPagado = montoAAplicar >= saldoPendiente;

    // 4. Crear "pago virtual" desde saldo a favor
    const { data: pagoSaldoFavor, error: errorPago } = await supabase
      .from('pagos')
      .insert({
        socio_id: socioId,
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: montoAAplicar,
        metodo_pago: 'saldo_a_favor',
        observaciones: 'Aplicación automática de saldo a favor al generar cupón',
        estado_conciliacion: 'conciliado',
      })
      .select()
      .single();

    if (errorPago) {
      logger.error('Error al crear pago desde saldo a favor:', errorPago);
      throw new Error(`Error al crear pago desde saldo a favor: ${errorPago.message}`);
    }

    // 5. Asociar pago al cupón
    if (pagoSaldoFavor) {
      const { error: errorPagoCupon } = await supabase
        .from('pagos_cupones')
        .insert({
          pago_id: pagoSaldoFavor.id,
          cupon_id: cuponId,
          monto_aplicado: montoAAplicar,
        });

      if (errorPagoCupon) {
        logger.error('Error al asociar pago al cupón:', errorPagoCupon);
        throw new Error(`Error al asociar pago al cupón: ${errorPagoCupon.message}`);
      }

      // 6. Si el cupón queda completamente pagado, marcarlo
      if (cuponQuedoPagado) {
        const { error: errorUpdate } = await supabase
          .from('cupones')
          .update({
            estado: 'pagado',
            fecha_pago: new Date().toISOString().split('T')[0],
          })
          .eq('id', cuponId);

        if (errorUpdate) {
          logger.error('Error al actualizar estado del cupón:', errorUpdate);
          // No lanzar error, solo loggear
        }
      }
    }

    // 7. Actualizar saldo a favor
    if (saldoRestante > 0) {
      // Actualizar el saldo a favor con el nuevo monto
      const { data: saldoActual } = await supabase
        .from('saldos_favor')
        .select('id, monto')
        .eq('socio_id', socioId)
        .single();

      if (saldoActual) {
        await supabase
          .from('saldos_favor')
          .update({
            monto: saldoRestante,
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq('id', saldoActual.id);
      }
    } else {
      // Eliminar registro si queda en 0
      await supabase
        .from('saldos_favor')
        .delete()
        .eq('socio_id', socioId);
    }

    return {
      montoAplicado: montoAAplicar,
      saldoRestante: saldoRestante,
      cuponQuedoPagado: cuponQuedoPagado,
    };
  } catch (error: any) {
    logger.error('Error en aplicarSaldoAFavorACupon:', error);
    throw error;
  }
}


