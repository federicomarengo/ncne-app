/**
 * Aplica un pago a los cupones pendientes del socio en orden cronológico
 * 
 * Lógica:
 * 1. Obtiene TODOS los cupones pendientes del socio
 * 2. Ordena por fecha_vencimiento (más antiguos primero)
 * 3. Para cada cupón:
 *    - Calcula saldo pendiente real
 *    - Aplica el monto disponible (min entre saldo pendiente y monto restante)
 *    - Si el cupón queda completamente pagado, lo marca como "pagado"
 * 4. Si queda excedente, lo guarda como saldo a favor
 * 
 * @param pagoId - ID del pago a aplicar
 * @param socioId - ID del socio
 * @param montoPago - Monto total del pago
 * @param fechaPago - Fecha del pago
 * @param supabase - Cliente de Supabase
 * @returns Resultado con cupones aplicados, excedente y cupones marcados como pagados
 */

import { calcularSaldoPendienteCupon } from './calcularSaldoPendienteCupon';
import { manejarSaldoAFavor } from './manejarSaldoAFavor';

export interface ResultadoAplicacionPago {
  cuponesAplicados: number[];
  excedente: number;
  cuponesMarcadosComoPagados: number[];
}

export async function aplicarPagoACupones(
  pagoId: number,
  socioId: number,
  montoPago: number,
  fechaPago: string,
  supabase: any
): Promise<ResultadoAplicacionPago> {
  // 1. Obtener TODOS los cupones pendientes del socio ordenados por vencimiento
  const { data: cuponesPendientes, error: errorCupones } = await supabase
    .from('cupones')
    .select('id, monto_total, fecha_vencimiento')
    .eq('socio_id', socioId)
    .in('estado', ['pendiente', 'vencido'])
    .order('fecha_vencimiento', { ascending: true }); // Más antiguos primero

  if (errorCupones) {
    console.error('Error al cargar cupones pendientes:', errorCupones);
    throw new Error(`Error al cargar cupones pendientes: ${errorCupones.message}`);
  }

  // Si no hay cupones pendientes, todo el pago es excedente
  if (!cuponesPendientes || cuponesPendientes.length === 0) {
    await manejarSaldoAFavor(socioId, montoPago, supabase);
    return {
      cuponesAplicados: [],
      excedente: montoPago,
      cuponesMarcadosComoPagados: [],
    };
  }

  let montoRestante = montoPago;
  const relacionesPagoCupon: any[] = [];
  const cuponesAMarcarComoPagados: number[] = [];

  // 2. Aplicar el pago a cada cupón en orden cronológico
  for (const cupon of cuponesPendientes) {
    if (montoRestante <= 0) {
      break; // Ya no hay monto para aplicar
    }

    // Calcular saldo pendiente REAL del cupón (considerando pagos parciales previos)
    const saldoPendiente = await calcularSaldoPendienteCupon(cupon.id, supabase);

    if (saldoPendiente <= 0) {
      // Cupón ya está completamente pagado, saltar
      continue;
    }

    // Aplicar el monto disponible (lo que queda del pago o el saldo pendiente, el menor)
    const montoAAplicar = Math.min(saldoPendiente, montoRestante);

    // Crear relación pago-cupón
    relacionesPagoCupon.push({
      pago_id: pagoId,
      cupon_id: cupon.id,
      monto_aplicado: montoAAplicar,
    });

    montoRestante -= montoAAplicar;

    // Si el cupón queda completamente pagado, marcarlo
    if (montoAAplicar >= saldoPendiente) {
      cuponesAMarcarComoPagados.push(cupon.id);
    }
  }

  // 3. Insertar relaciones pago-cupón en batch
  if (relacionesPagoCupon.length > 0) {
    const { error: errorPagoCupon } = await supabase
      .from('pagos_cupones')
      .insert(relacionesPagoCupon);

    if (errorPagoCupon) {
      console.error('Error al asociar cupones:', errorPagoCupon);
      throw new Error(`Error al asociar cupones: ${errorPagoCupon.message}`);
    }
  }

  // 4. Marcar cupones como pagados en batch
  if (cuponesAMarcarComoPagados.length > 0) {
    const { error: errorUpdate } = await supabase
      .from('cupones')
      .update({
        estado: 'pagado',
        fecha_pago: fechaPago,
      })
      .in('id', cuponesAMarcarComoPagados);

    if (errorUpdate) {
      console.error('Error al actualizar cupones:', errorUpdate);
      // No lanzar error, solo loggear (ya se crearon las relaciones)
    }
  }

  // 5. Si hay excedente, guardarlo como saldo a favor
  if (montoRestante > 0) {
    await manejarSaldoAFavor(socioId, montoRestante, supabase);
  }

  return {
    cuponesAplicados: relacionesPagoCupon.map((r: any) => r.cupon_id),
    excedente: montoRestante,
    cuponesMarcadosComoPagados: cuponesAMarcarComoPagados,
  };
}

