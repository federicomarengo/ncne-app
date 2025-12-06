import { logger } from '@/app/utils/logger';
/**
 * Maneja el saldo a favor de un socio
 * 
 * Si existe registro: suma al monto existente
 * Si no existe: crea nuevo registro
 * Actualiza fecha_actualizacion
 * 
 * @param socioId - ID del socio
 * @param monto - Monto a agregar al saldo a favor
 * @param supabase - Cliente de Supabase
 */
export async function manejarSaldoAFavor(
  socioId: number,
  monto: number,
  supabase: any
): Promise<void> {
  if (monto <= 0) {
    return; // No hacer nada si el monto es 0 o negativo
  }

  try {
    // 1. Verificar si existe registro de saldo a favor
    const { data: saldoExistente, error: errorBusqueda } = await supabase
      .from('saldos_favor')
      .select('id, monto')
      .eq('socio_id', socioId)
      .maybeSingle();

    if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", que es válido si no existe registro
      logger.error('Error al buscar saldo a favor:', errorBusqueda);
      throw new Error(`Error al buscar saldo a favor: ${errorBusqueda.message}`);
    }

    if (saldoExistente) {
      // 2. Actualizar saldo existente
      const nuevoMonto = parseFloat(saldoExistente.monto.toString()) + monto;
      
      const { error: errorUpdate } = await supabase
        .from('saldos_favor')
        .update({
          monto: nuevoMonto,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', saldoExistente.id);

      if (errorUpdate) {
        logger.error('Error al actualizar saldo a favor:', errorUpdate);
        throw new Error(`Error al actualizar saldo a favor: ${errorUpdate.message}`);
      }
    } else {
      // 3. Crear nuevo registro
      const { error: errorInsert } = await supabase
        .from('saldos_favor')
        .insert({
          socio_id: socioId,
          monto: monto,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
        });

      if (errorInsert) {
        logger.error('Error al crear saldo a favor:', errorInsert);
        throw new Error(`Error al crear saldo a favor: ${errorInsert.message}`);
      }
    }
  } catch (error: any) {
    logger.error('Error en manejarSaldoAFavor:', error);
    throw error;
  }
}

/**
 * Obtiene el saldo a favor de un socio
 * 
 * @param socioId - ID del socio
 * @param supabase - Cliente de Supabase
 * @returns Monto del saldo a favor (0 si no existe)
 */
export async function obtenerSaldoAFavor(
  socioId: number,
  supabase: any
): Promise<number> {
  try {
    const { data: saldoFavor, error } = await supabase
      .from('saldos_favor')
      .select('monto')
      .eq('socio_id', socioId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error al obtener saldo a favor:', error);
      return 0;
    }

    if (!saldoFavor) {
      return 0;
    }

    return parseFloat(saldoFavor.monto.toString());
  } catch (error) {
    logger.error('Error al obtener saldo a favor:', error);
    return 0;
  }
}


