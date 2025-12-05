/**
 * Calcula el saldo pendiente real de un cupón
 * 
 * El saldo pendiente es: monto_total - suma de todos los pagos aplicados
 * 
 * @param cuponId - ID del cupón
 * @param supabase - Cliente de Supabase
 * @returns Saldo pendiente (siempre >= 0)
 */
export async function calcularSaldoPendienteCupon(
  cuponId: number,
  supabase: any
): Promise<number> {
  try {
    // 1. Obtener monto total del cupón
    const { data: cupon, error: errorCupon } = await supabase
      .from('cupones')
      .select('monto_total')
      .eq('id', cuponId)
      .single();

    if (errorCupon) {
      console.error('Error al obtener cupón:', errorCupon);
      return 0;
    }

    if (!cupon) {
      return 0;
    }

    const montoTotal = parseFloat(cupon.monto_total.toString());

    // 2. Sumar todos los montos aplicados a este cupón desde pagos_cupones
    const { data: pagosCupon, error: errorPagos } = await supabase
      .from('pagos_cupones')
      .select('monto_aplicado')
      .eq('cupon_id', cuponId);

    if (errorPagos) {
      console.error('Error al obtener pagos del cupón:', errorPagos);
      // Si hay error, asumir que no hay pagos aplicados
      return montoTotal;
    }

    // 3. Calcular total aplicado
    const totalAplicado = pagosCupon?.reduce(
      (sum: number, pc: any) => sum + parseFloat(pc.monto_aplicado.toString()),
      0
    ) || 0;

    // 4. Calcular saldo pendiente
    const saldoPendiente = montoTotal - totalAplicado;

    // 5. Retornar siempre >= 0 (no puede ser negativo)
    return Math.max(0, saldoPendiente);
  } catch (error) {
    console.error('Error al calcular saldo pendiente del cupón:', error);
    return 0;
  }
}

