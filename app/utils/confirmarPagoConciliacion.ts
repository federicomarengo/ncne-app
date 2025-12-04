/**
 * Utilidades para confirmar pagos desde la conciliación bancaria
 * 
 * Maneja la creación de pagos, asociación con cupones y actualización de estados
 */

import { MovimientoProcesado, MatchResult } from '@/app/types/movimientos_bancarios';
import { verificarDuplicadoPago } from './verificarDuplicadoPago';
import { generarHashMovimiento } from './generarHashMovimiento';
import { logError } from './logErrores';
import { normalizarCUITCUIL, normalizarDNI } from './normalizarTexto';

interface ConfirmarPagoResult {
  success: boolean;
  pagoId?: number;
  movimientoId?: number;
  cuponesAsociados: number[];
  error?: string;
}

/**
 * Confirma un movimiento bancario como pago
 * Crea el pago, lo asocia a cupones y actualiza estados
 */
export async function confirmarPagoDesdeMovimiento(
  movimiento: MovimientoProcesado,
  supabase: any,
  socioIdManual?: number,
  cuponesPrecargados?: Map<number, any[]>,
  guardarKeywords?: boolean
): Promise<ConfirmarPagoResult> {
  // Si se proporciona socioIdManual, usarlo; de lo contrario, requerir match
  const socioId = socioIdManual;
  
  if (!socioId) {
    return {
      success: false,
      cuponesAsociados: [],
      error: 'No hay socio identificado para este movimiento',
    };
  }

  try {
    // 0. Generar hash único del movimiento
    const hashMovimiento = await generarHashMovimiento(movimiento);

    // 0.1. Verificar si ya existe un movimiento con este hash
    const { data: movimientoExistente, error: errorBusqueda } = await supabase
      .from('movimientos_bancarios')
      .select('id, estado, pago_id')
      .eq('hash_movimiento', hashMovimiento)
      .maybeSingle();

    if (errorBusqueda) {
      console.error('Error al buscar movimiento duplicado:', errorBusqueda);
    }

    let movimientoGuardado: any;

    // Si ya existe un movimiento con este hash
    if (movimientoExistente) {
      // Si ya tiene un pago asociado, es un duplicado
      if (movimientoExistente.pago_id) {
        return {
          success: false,
          cuponesAsociados: [],
          error: `Este movimiento ya fue procesado anteriormente (Movimiento ID: ${movimientoExistente.id}, Pago ID: ${movimientoExistente.pago_id})`,
        };
      }

      // Si existe pero no tiene pago, actualizar el existente en lugar de crear uno nuevo
      await supabase
        .from('movimientos_bancarios')
        .update({
          socio_identificado_id: socioId,
          nivel_match: 'M', // Manual
          porcentaje_confianza: 100,
          estado: 'procesado',
          observaciones: 'Asignación manual',
        })
        .eq('id', movimientoExistente.id);

      // Obtener el movimiento actualizado
      const { data: movimientoActualizado } = await supabase
        .from('movimientos_bancarios')
        .select('*')
        .eq('id', movimientoExistente.id)
        .single();

      movimientoGuardado = movimientoActualizado || movimientoExistente;
    } else {
      // 1. Guardar movimiento bancario en la base de datos (nuevo)
      const { data: nuevoMovimiento, error: errorMovimiento } = await supabase
        .from('movimientos_bancarios')
        .insert({
          fecha_movimiento: movimiento.fecha_movimiento,
          apellido_transferente: movimiento.apellido_transferente,
          nombre_transferente: movimiento.nombre_transferente,
          cuit_cuil: movimiento.cuit_cuil,
          dni: movimiento.dni,
          monto: movimiento.monto,
          referencia_bancaria: movimiento.referencia_bancaria || null,
          concepto_completo: movimiento.concepto_completo || null,
          socio_identificado_id: socioId,
          nivel_match: 'M', // Manual
          porcentaje_confianza: 100,
          estado: 'procesado',
          es_duplicado: false,
          observaciones: 'Asignación manual',
          hash_movimiento: hashMovimiento,
        })
        .select()
        .single();

      if (errorMovimiento) {
        // Si el error es por violación de constraint único (hash duplicado)
        if (errorMovimiento.code === '23505' || errorMovimiento.message.includes('unique')) {
          return {
            success: false,
            cuponesAsociados: [],
            error: 'Este movimiento ya existe en la base de datos (duplicado detectado por hash)',
          };
        }
        throw new Error(`Error al guardar movimiento: ${errorMovimiento.message}`);
      }

      movimientoGuardado = nuevoMovimiento;
    }

    // 2. Buscar cupones pendientes del socio con monto similar (±$1)
    const montoMinimo = movimiento.monto - 1;
    const montoMaximo = movimiento.monto + 1;

    let cuponesPendientes: any[] = [];

    // Usar cupones pre-cargados si están disponibles (optimización)
    if (cuponesPrecargados && socioId) {
      const cuponesDelSocio = cuponesPrecargados.get(socioId) || [];
      // Filtrar por rango de monto
      cuponesPendientes = cuponesDelSocio.filter((c: any) => {
        const montoTotal = parseFloat(c.monto_total.toString());
        return montoTotal >= montoMinimo && montoTotal <= montoMaximo;
      });
    } else {
      // Fallback: cargar cupones individualmente (cuando no hay pre-carga)
      const { data, error: errorCupones } = await supabase
        .from('cupones')
        .select('id, monto_total, estado')
        .eq('socio_id', socioId)
        .in('estado', ['pendiente', 'vencido'])
        .gte('monto_total', montoMinimo)
        .lte('monto_total', montoMaximo)
        .order('fecha_vencimiento', { ascending: true });

      if (errorCupones) {
        console.error('Error al buscar cupones:', errorCupones);
      } else {
        cuponesPendientes = data || [];
      }
    }

    // 3. Verificar duplicados simplificado (ya se verificó por hash en paso 0.1)
    // Si llegamos aquí, el hash no está duplicado
    // Solo verificar si el movimiento ya tiene un pago asociado (por si cambió entre medio)
    if (movimientoGuardado.pago_id) {
      return {
        success: false,
        cuponesAsociados: [],
        error: `Este movimiento ya tiene un pago asociado (Pago ID: ${movimientoGuardado.pago_id})`,
      };
    }

    // 4. Crear el pago
    const observacionesPago = `Pago conciliado automáticamente. Movimiento bancario ID: ${movimientoGuardado.id}`;

    const { data: pago, error: errorPago } = await supabase
      .from('pagos')
      .insert({
        socio_id: socioId,
        fecha_pago: movimiento.fecha_movimiento,
        monto: movimiento.monto,
        metodo_pago: 'transferencia_bancaria',
        numero_comprobante: movimiento.referencia_bancaria || null,
        referencia_bancaria: movimiento.referencia_bancaria || null,
        observaciones: observacionesPago,
        estado_conciliacion: 'conciliado',
        movimiento_bancario_id: movimientoGuardado.id,
      })
      .select()
      .single();

    if (errorPago) {
      logError(
        'CREAR_PAGO',
        `Error al crear pago: ${errorPago.message}`,
        errorPago,
        JSON.stringify({ socioId, movimientoId: movimientoGuardado.id })
      );
      throw new Error(`Error al crear pago: ${errorPago.message}`);
    }

    // 5. Asociar pago a cupones (OPTIMIZADO: batch operations)
    const cuponesAsociados: number[] = [];
    let montoRestante = movimiento.monto;
    const relacionesPagoCupon: any[] = [];
    const cuponesAAcutualizar: any[] = [];

    if (cuponesPendientes && cuponesPendientes.length > 0) {
      for (const cupon of cuponesPendientes) {
        if (montoRestante <= 0) break;

        const montoCupon = parseFloat(cupon.monto_total.toString());
        const montoAAplicar = Math.min(montoCupon, montoRestante);

        // Preparar relación pago-cupón para batch insert
        relacionesPagoCupon.push({
          pago_id: pago.id,
          cupon_id: cupon.id,
          monto_aplicado: montoAAplicar,
        });

        cuponesAsociados.push(cupon.id);
        montoRestante -= montoAAplicar;

        // Preparar cupón para batch update si está completamente pagado
        if (montoAAplicar >= montoCupon) {
          cuponesAAcutualizar.push({
            id: cupon.id,
            estado: 'pagado',
            fecha_pago: movimiento.fecha_movimiento,
          });
        }
      }

      // Batch insert: Insertar todas las relaciones pago-cupón de una vez
      if (relacionesPagoCupon.length > 0) {
        const { error: errorPagoCupon } = await supabase
          .from('pagos_cupones')
          .insert(relacionesPagoCupon);

        if (errorPagoCupon) {
          console.error('Error al asociar cupones en batch:', errorPagoCupon);
        }
      }

      // Batch update: Actualizar todos los cupones de una vez
      if (cuponesAAcutualizar.length > 0) {
        for (const cuponUpdate of cuponesAAcutualizar) {
          await supabase
            .from('cupones')
            .update({
              estado: cuponUpdate.estado,
              fecha_pago: cuponUpdate.fecha_pago,
            })
            .eq('id', cuponUpdate.id);
        }
      }
    }

    // 6. Actualizar movimiento con el pago_id
    await supabase
      .from('movimientos_bancarios')
      .update({
        pago_id: pago.id,
        estado: 'procesado',
      })
      .eq('id', movimientoGuardado.id);

    // 7. Guardar keywords si fue asignación manual desde sin match
    // SOLO guarda CUIT/CUIL, NUNCA DNI
    // El nombre se guarda como info adicional pero NO se usa en matching
    if (guardarKeywords && socioId) {
      try {
        // Guardar CUIT si existe y está normalizado
        if (movimiento.cuit_cuil) {
          const cuitNormalizado = normalizarCUITCUIL(movimiento.cuit_cuil);
          if (cuitNormalizado.length >= 11) {
            // Construir nombre completo si está disponible (info adicional)
            const nombreCompleto = movimiento.nombre_transferente && movimiento.apellido_transferente
              ? `${movimiento.apellido_transferente}, ${movimiento.nombre_transferente}`.trim()
              : movimiento.nombre_transferente || movimiento.apellido_transferente || null;

            const { error: errorKeyword } = await supabase
              .from('socios_keywords')
              .insert({
                socio_id: socioId,
                tipo: 'cuit',
                valor: cuitNormalizado,
                nombre_info: nombreCompleto, // Info adicional, no se usa en matching
              })
              .select();

            // Ignorar errores de duplicados (constraint único)
            if (errorKeyword && errorKeyword.code !== '23505') {
              console.error('Error al guardar keyword:', errorKeyword);
            }
          }
        }
        // NUNCA guardar DNI - solo CUIT/CUIL
      } catch (error) {
        // Logging silencioso - no fallar la confirmación por error en keywords
        console.error('Error al guardar keywords (no crítico):', error);
      }
    }

    return {
      success: true,
      pagoId: pago.id,
      movimientoId: movimientoGuardado.id,
      cuponesAsociados,
    };
  } catch (error: any) {
    console.error('Error al confirmar pago:', error);
    
    // Loggear error para revisión posterior
    logError(
      'CONFIRMAR_PAGO',
      `Error al confirmar pago: ${error.message || 'Error desconocido'}`,
      error,
      JSON.stringify({
        movimiento: {
          fecha: movimiento.fecha_movimiento,
          monto: movimiento.monto,
          referencia: movimiento.referencia_bancaria,
        },
        socioId,
      })
    );
    
    return {
      success: false,
      cuponesAsociados: [],
      error: error.message || 'Error desconocido al confirmar pago',
    };
  }
}

/**
 * Confirma múltiples pagos en lote (OPTIMIZADO)
 * Pre-carga cupones de todos los socios para reducir consultas
 */
export async function confirmarPagosEnLote(
  movimientos: Array<{ movimiento: MovimientoProcesado; match: MatchResult }>,
  supabase: any,
  onProgress?: (current: number, total: number, mensaje: string) => void
): Promise<{
  exitosos: number;
  fallidos: number;
  errores: Array<{ movimiento: MovimientoProcesado; error: string }>;
}> {
  let exitosos = 0;
  let fallidos = 0;
  const errores: Array<{ movimiento: MovimientoProcesado; error: string }> = [];

  // PRE-CARGA: Obtener todos los IDs de socios únicos
  const sociosIds = [...new Set(
    movimientos
      .map(m => m.match.socio_id)
      .filter(id => id !== null)
  )] as number[];

  // PRE-CARGA: Cargar todos los cupones pendientes de todos los socios de una vez
  const cuponesPorSocio = new Map<number, any[]>();
  if (sociosIds.length > 0) {
    const { data: todosCupones } = await supabase
      .from('cupones')
      .select('id, socio_id, monto_total, estado, fecha_vencimiento')
      .in('socio_id', sociosIds)
      .in('estado', ['pendiente', 'vencido'])
      .order('socio_id')
      .order('fecha_vencimiento', { ascending: true });

    if (todosCupones) {
      // Agrupar cupones por socio_id para acceso rápido
      todosCupones.forEach((cupon: any) => {
        if (!cuponesPorSocio.has(cupon.socio_id)) {
          cuponesPorSocio.set(cupon.socio_id, []);
        }
        cuponesPorSocio.get(cupon.socio_id)!.push(cupon);
      });
    }
  }

  // Procesar cada movimiento
  const total = movimientos.length;
  for (let i = 0; i < movimientos.length; i++) {
    const { movimiento, match } = movimientos[i];
    
    // Callback de progreso
    if (onProgress) {
      onProgress(i + 1, total, `Confirmando pago ${i + 1} de ${total}...`);
    }
    
    // NO guardar keywords en confirmarPagosEnLote
    // Solo se guardan cuando se asigna manualmente desde sin match
    const resultado = await confirmarPagoDesdeMovimiento(
      movimiento, 
      supabase,
      match.socio_id || undefined, // Pasar socio_id del match
      cuponesPorSocio // Pasar cupones pre-cargados
      // NO pasar guardarKeywords aquí - solo se guarda en asignación manual desde sin match
    );
    
    if (resultado.success) {
      exitosos++;
    } else {
      fallidos++;
      errores.push({
        movimiento,
        error: resultado.error || 'Error desconocido',
      });
    }
  }

  return { exitosos, fallidos, errores };
}

