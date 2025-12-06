import { logger } from '@/app/utils/logger';
/**
 * Utilidades para verificar duplicados antes de crear un pago
 * 
 * Implementa múltiples niveles de verificación para detectar pagos duplicados
 */

interface DatosPago {
  socio_id: number;
  fecha_pago: string;
  monto: number;
  metodo_pago: string;
  numero_comprobante?: string | null;
  referencia_bancaria?: string | null;
  movimiento_bancario_id?: number | null;
}

export interface ResultadoVerificacionDuplicado {
  esDuplicado: boolean;
  pagoDuplicadoId: number | null;
  razon: string;
  nivelConfianza: 'alto' | 'medio' | 'bajo';
}

/**
 * Verifica si un pago es duplicado antes de crearlo
 * 
 * Criterios de duplicado (en orden de prioridad):
 * 1. Por referencia bancaria (alto) - Si existe referencia, debe ser única
 * 2. Por movimiento bancario (alto) - Un movimiento solo puede generar un pago
 * 3. Por número de comprobante (alto) - Si existe, debe ser único
 * 4. Por criterios combinados (medio) - Mismo socio, monto similar, fecha cercana
 * 
 * @param datosPago - Datos del pago a verificar
 * @param supabase - Cliente de Supabase
 * @returns Resultado de la verificación
 */
export async function verificarDuplicadoPago(
  datosPago: DatosPago,
  supabase: any
): Promise<ResultadoVerificacionDuplicado> {
  // Nivel 1: Por referencia bancaria (ALTA confianza)
  if (datosPago.referencia_bancaria && datosPago.referencia_bancaria.trim() !== '') {
    const { data: pagoPorRef, error } = await supabase
      .from('pagos')
      .select('id, fecha_pago, monto, socio_id, referencia_bancaria')
      .eq('referencia_bancaria', datosPago.referencia_bancaria.trim())
      .maybeSingle();
    
    if (error) {
      logger.error('Error al verificar por referencia bancaria:', error);
    } else if (pagoPorRef) {
      return {
        esDuplicado: true,
        pagoDuplicadoId: pagoPorRef.id,
        razon: `Ya existe un pago con la misma referencia bancaria "${datosPago.referencia_bancaria}" (Pago ID: ${pagoPorRef.id}, Fecha: ${pagoPorRef.fecha_pago}, Monto: $${pagoPorRef.monto})`,
        nivelConfianza: 'alto',
      };
    }
  }

  // Nivel 2: Por movimiento bancario (ALTA confianza)
  // Un movimiento bancario solo puede generar un pago
  if (datosPago.movimiento_bancario_id) {
    const { data: pagoPorMovimiento, error } = await supabase
      .from('pagos')
      .select('id, fecha_pago, monto, movimiento_bancario_id')
      .eq('movimiento_bancario_id', datosPago.movimiento_bancario_id)
      .maybeSingle();
    
    if (error) {
      logger.error('Error al verificar por movimiento bancario:', error);
    } else if (pagoPorMovimiento) {
      return {
        esDuplicado: true,
        pagoDuplicadoId: pagoPorMovimiento.id,
        razon: `Ya existe un pago para este movimiento bancario (Pago ID: ${pagoPorMovimiento.id}, Movimiento ID: ${datosPago.movimiento_bancario_id})`,
        nivelConfianza: 'alto',
      };
    }
    
    // También verificar si el movimiento bancario tiene un hash y buscar otros movimientos con el mismo hash
    const { data: movimientoBancario } = await supabase
      .from('movimientos_bancarios')
      .select('hash_movimiento, pago_id')
      .eq('id', datosPago.movimiento_bancario_id)
      .maybeSingle();
    
    if (movimientoBancario?.hash_movimiento) {
      // Buscar otros movimientos con el mismo hash que ya tengan un pago
      const { data: movimientosConMismoHash } = await supabase
        .from('movimientos_bancarios')
        .select('id, pago_id')
        .eq('hash_movimiento', movimientoBancario.hash_movimiento)
        .not('pago_id', 'is', null);
      
      if (movimientosConMismoHash && movimientosConMismoHash.length > 0) {
        const movimientoConPago = movimientosConMismoHash.find((m: any) => m.pago_id);
        if (movimientoConPago && movimientoConPago.pago_id) {
          return {
            esDuplicado: true,
            pagoDuplicadoId: movimientoConPago.pago_id,
            razon: `Ya existe un pago para un movimiento bancario idéntico (mismo hash) (Pago ID: ${movimientoConPago.pago_id}, Movimiento ID: ${movimientoConPago.id})`,
            nivelConfianza: 'alto',
          };
        }
      }
    }
  }

  // Nivel 3: Por número de comprobante (ALTA confianza)
  // Si hay número de comprobante, debe ser único
  if (datosPago.numero_comprobante && datosPago.numero_comprobante.trim() !== '') {
    const { data: pagoPorComprobante, error } = await supabase
      .from('pagos')
      .select('id, fecha_pago, monto, socio_id, numero_comprobante')
      .eq('numero_comprobante', datosPago.numero_comprobante.trim())
      .maybeSingle();
    
    if (error) {
      logger.error('Error al verificar por número de comprobante:', error);
    } else if (pagoPorComprobante) {
      return {
        esDuplicado: true,
        pagoDuplicadoId: pagoPorComprobante.id,
        razon: `Ya existe un pago con el mismo número de comprobante "${datosPago.numero_comprobante}" (Pago ID: ${pagoPorComprobante.id}, Fecha: ${pagoPorComprobante.fecha_pago})`,
        nivelConfianza: 'alto',
      };
    }
  }

  // Nivel 4: Por criterios combinados (MEDIA confianza)
  // Mismo socio + monto similar (±$1) + fecha cercana (±3 días) + mismo método de pago
  const fechaPago = new Date(datosPago.fecha_pago);
  const fechaMin = new Date(fechaPago);
  fechaMin.setDate(fechaMin.getDate() - 3);
  const fechaMax = new Date(fechaPago);
  fechaMax.setDate(fechaMax.getDate() + 3);

  const montoMinimo = datosPago.monto - 1;
  const montoMaximo = datosPago.monto + 1;

  const { data: pagosSimilares, error: errorSimilares } = await supabase
    .from('pagos')
    .select('id, fecha_pago, monto, metodo_pago, numero_comprobante, socio_id')
    .eq('socio_id', datosPago.socio_id)
    .eq('metodo_pago', datosPago.metodo_pago)
    .gte('monto', montoMinimo)
    .lte('monto', montoMaximo)
    .gte('fecha_pago', fechaMin.toISOString().split('T')[0])
    .lte('fecha_pago', fechaMax.toISOString().split('T')[0]);

  if (errorSimilares) {
    logger.error('Error al verificar pagos similares:', errorSimilares);
  } else if (pagosSimilares && pagosSimilares.length > 0) {
    // Buscar coincidencia exacta (mismo monto y misma fecha)
    const pagoExacto = pagosSimilares.find(
      (p: any) => Math.abs(parseFloat(p.monto.toString()) - datosPago.monto) < 0.01 &&
             p.fecha_pago === datosPago.fecha_pago
    );
    
    if (pagoExacto) {
      return {
        esDuplicado: true,
        pagoDuplicadoId: pagoExacto.id,
        razon: `Posible duplicado: Ya existe un pago del mismo socio con monto $${pagoExacto.monto} y fecha ${pagoExacto.fecha_pago} (Pago ID: ${pagoExacto.id})`,
        nivelConfianza: 'medio',
      };
    }

    // Si hay múltiples pagos similares, advertir
    if (pagosSimilares.length >= 2) {
      return {
        esDuplicado: true,
        pagoDuplicadoId: pagosSimilares[0].id,
        razon: `Se encontraron ${pagosSimilares.length} pagos similares del mismo socio en fechas cercanas. Verifique que no sea un duplicado.`,
        nivelConfianza: 'bajo',
      };
    }
  }

  // No se encontraron duplicados
  return {
    esDuplicado: false,
    pagoDuplicadoId: null,
    razon: '',
    nivelConfianza: 'alto',
  };
}

