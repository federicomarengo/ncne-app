import { logger } from '@/app/utils/logger';
/**
 * Calcula el saldo acumulado de un socio hasta una fecha específica
 * 
 * Saldo = Total pagado - Total aplicado a cupones
 * 
 * @param socioId - ID del socio
 * @param fechaHasta - Fecha hasta la cual calcular el saldo (opcional, por defecto hoy)
 * @param supabase - Cliente de Supabase
 * @returns Saldo acumulado (positivo = a favor, negativo = debe)
 */
export async function calcularSaldoHistorico(
  socioId: number,
  fechaHasta?: string | Date,
  supabase?: any
): Promise<number> {
  if (!supabase) {
    return 0;
  }

  try {
    const fechaLimite = fechaHasta 
      ? new Date(fechaHasta).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // 1. Obtener total pagado hasta la fecha
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('socio_id', socioId)
      .lte('fecha_pago', fechaLimite);

    const totalPagado = pagos?.reduce(
      (sum: number, p: any) => sum + parseFloat(p.monto.toString()),
      0
    ) || 0;

    // 2. Obtener total aplicado a cupones hasta la fecha
    // Necesitamos obtener los pagos hasta la fecha y luego sumar los montos aplicados
    const { data: pagosIds } = await supabase
      .from('pagos')
      .select('id')
      .eq('socio_id', socioId)
      .lte('fecha_pago', fechaLimite);

    const pagosIdsArray = pagosIds?.map((p: any) => p.id) || [];

    if (pagosIdsArray.length === 0) {
      return totalPagado; // Si no hay pagos, el saldo es 0 (o positivo si hay saldo a favor)
    }

    const { data: pagosCupones } = await supabase
      .from('pagos_cupones')
      .select('monto_aplicado')
      .in('pago_id', pagosIdsArray);

    const totalAplicado = pagosCupones?.reduce(
      (sum: number, pc: any) => sum + parseFloat(pc.monto_aplicado.toString()),
      0
    ) || 0;

    // 3. Calcular saldo
    const saldo = totalPagado - totalAplicado;

    return saldo;
  } catch (error) {
    logger.error('Error al calcular saldo histórico:', error);
    return 0;
  }
}

