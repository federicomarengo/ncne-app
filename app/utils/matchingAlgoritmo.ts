/**
 * Sistema de matching inteligente para conciliación bancaria
 * 
 * Implementa los 6 niveles de matching según la especificación funcional
 */

// Note: This file uses dynamic imports to work in both server and client contexts
// The actual client creation will be passed as a parameter
import { MatchResult, NivelMatch, MovimientoProcesado } from '@/app/types/movimientos_bancarios';
import { normalizarTexto, normalizarCUITCUIL, normalizarDNI } from './normalizarTexto';
import { porcentajeSimilitud, similitudNombreCompleto } from './calcularSimilitud';

/**
 * Ejecuta el matching jerárquico para un movimiento bancario
 * Retorna el mejor match encontrado según los 6 niveles
 * 
 * @param movimiento - Movimiento bancario a matchear
 * @param supabaseClient - Cliente de Supabase (puede ser server o client)
 */
export async function ejecutarMatching(
  movimiento: MovimientoProcesado,
  supabaseClient: any
): Promise<MatchResult> {
  // Nivel A: Match por CUIT/CUIL exacto (100% confianza)
  const matchA = await matchNivelA(movimiento, supabaseClient);
  if (matchA.socio_id) {
    return matchA;
  }

  // Nivel B: Match por DNI exacto (95% confianza)
  const matchB = await matchNivelB(movimiento, supabaseClient);
  if (matchB.socio_id) {
    return matchB;
  }

  // Nivel C: Match bidireccional por CUIL generado (98% confianza)
  const matchC = await matchNivelC(movimiento, supabaseClient);
  if (matchC.socio_id) {
    return matchC;
  }

  // Nivel D: Match por nombre completo normalizado (85% confianza)
  const matchD = await matchNivelD(movimiento, supabaseClient);
  if (matchD.socio_id) {
    return matchD;
  }

  // Nivel E: Match por similitud Levenshtein (60-80% confianza)
  const matchE = await matchNivelE(movimiento, supabaseClient);
  if (matchE.socio_id) {
    return matchE;
  }

  // Nivel E.5: Match por keywords relacionadas (75% confianza)
  const matchE5 = await matchNivelE5(movimiento, supabaseClient);
  if (matchE5.socio_id) {
    return matchE5;
  }

  // Nivel F: Sin match
  return {
    socio_id: null,
    nivel: 'F',
    porcentaje_confianza: 0,
    razon: 'No se encontró coincidencia con ningún socio',
  };
}

/**
 * Nivel A: Match por CUIT/CUIL exacto (100% confianza)
 */
async function matchNivelA(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.cuit_cuil) {
    return crearMatchResult(null, 'A', 0, 'Sin CUIT/CUIL en el movimiento');
  }

  const cuitNormalizado = normalizarCUITCUIL(movimiento.cuit_cuil);

  if (cuitNormalizado.length < 11) {
    return crearMatchResult(null, 'A', 0, 'CUIT/CUIL inválido');
  }

  try {
    const { data, error } = await supabase
      .from('socios')
      .select('id, apellido, nombre, cuit_cuil')
      .eq('cuit_cuil', cuitNormalizado)
      .maybeSingle();

    if (error || !data) {
      return crearMatchResult(null, 'A', 0, 'No se encontró socio con este CUIT/CUIL');
    }

    return crearMatchResult(
      data.id,
      'A',
      100,
      `Match exacto por CUIT/CUIL: ${cuitNormalizado}`,
      `${data.apellido} ${data.nombre}`
    );
  } catch (error) {
    console.error('Error en match Nivel A:', error);
    return crearMatchResult(null, 'A', 0, 'Error al buscar por CUIT/CUIL');
  }
}

/**
 * Nivel B: Match por DNI exacto (95% confianza)
 */
async function matchNivelB(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.dni) {
    return crearMatchResult(null, 'B', 0, 'Sin DNI en el movimiento');
  }

  const dniNormalizado = normalizarDNI(movimiento.dni);

  if (dniNormalizado.length < 7 || dniNormalizado.length > 8) {
    return crearMatchResult(null, 'B', 0, 'DNI inválido');
  }

  try {
    const { data, error } = await supabase
      .from('socios')
      .select('id, apellido, nombre, dni')
      .eq('dni', dniNormalizado)
      .maybeSingle();

    if (error || !data) {
      return crearMatchResult(null, 'B', 0, 'No se encontró socio con este DNI');
    }

    // Validar que el nombre coincida parcialmente
    const nombreMovimiento = normalizarTexto(
      `${movimiento.apellido_transferente} ${movimiento.nombre_transferente}`
    );
    const nombreSocio = normalizarTexto(`${data.apellido} ${data.nombre}`);

    if (nombreMovimiento && nombreSocio) {
      const similitud = porcentajeSimilitud(nombreMovimiento, nombreSocio);
      if (similitud < 50) {
        // Los nombres no coinciden, podría ser un error
        return crearMatchResult(null, 'B', 0, 'DNI coincide pero nombres no coinciden');
      }
    }

    return crearMatchResult(
      data.id,
      'B',
      95,
      `Match exacto por DNI: ${dniNormalizado}`,
      `${data.apellido} ${data.nombre}`
    );
  } catch (error) {
    console.error('Error en match Nivel B:', error);
    return crearMatchResult(null, 'B', 0, 'Error al buscar por DNI');
  }
}

/**
 * Nivel C: Match bidireccional por CUIL generado (98% confianza)
 */
async function matchNivelC(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.dni && !movimiento.cuit_cuil) {
    return crearMatchResult(null, 'C', 0, 'Sin DNI ni CUIT/CUIL en el movimiento');
  }

  try {
    // Obtener todos los socios con DNI o CUIT
    const { data: socios, error } = await supabase
      .from('socios')
      .select('id, apellido, nombre, dni, cuit_cuil')
      .not('dni', 'is', null)
      .not('cuit_cuil', 'is', null);

    if (error || !socios || socios.length === 0) {
      return crearMatchResult(null, 'C', 0, 'No hay socios con DNI y CUIT para comparar');
    }

    let mejorMatch: MatchResult | null = null;

    // Si tenemos DNI en el movimiento, generar CUIL y comparar
    if (movimiento.dni) {
      const dniMovimiento = normalizarDNI(movimiento.dni);

      for (const socio of socios) {
        const dniSocio = normalizarDNI(socio.dni || '');
        if (dniMovimiento === dniSocio && socio.cuit_cuil) {
          // Generar CUIL desde DNI y comparar con CUIT del movimiento
          const cuitMovimiento = movimiento.cuit_cuil ? normalizarCUITCUIL(movimiento.cuit_cuil) : '';
          
          if (cuitMovimiento && cuitMovimiento.length >= 11) {
            // Comparar últimos dígitos del CUIL (el DNI debería estar en el medio)
            const cuitSocio = normalizarCUITCUIL(socio.cuit_cuil);
            
            if (cuitMovimiento.slice(2, -1) === dniMovimiento && 
                cuitSocio.slice(2, -1) === dniSocio) {
              // Match bidireccional confirmado
              mejorMatch = crearMatchResult(
                socio.id,
                'C',
                98,
                `Match bidireccional por CUIL generado desde DNI: ${dniMovimiento}`,
                `${socio.apellido} ${socio.nombre}`
              );
              break;
            }
          }
        }
      }
    }

    return mejorMatch || crearMatchResult(null, 'C', 0, 'No se encontró match bidireccional');
  } catch (error) {
    console.error('Error en match Nivel C:', error);
    return crearMatchResult(null, 'C', 0, 'Error en match bidireccional');
  }
}

/**
 * Nivel D: Match por nombre completo normalizado (85% confianza)
 */
async function matchNivelD(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.apellido_transferente && !movimiento.nombre_transferente) {
    return crearMatchResult(null, 'D', 0, 'Sin nombre en el movimiento');
  }

  const apellidoMovimiento = normalizarTexto(movimiento.apellido_transferente || '');
  const nombreMovimiento = normalizarTexto(movimiento.nombre_transferente || '');

  if (!apellidoMovimiento) {
    return crearMatchResult(null, 'D', 0, 'Sin apellido en el movimiento');
  }

  try {
    const { data: socios, error } = await supabase
      .from('socios')
      .select('id, apellido, nombre');

    if (error || !socios || socios.length === 0) {
      return crearMatchResult(null, 'D', 0, 'No hay socios en el sistema');
    }

    let mejorMatch: MatchResult | null = null;
    let mejorSimilitud = 0;

    for (const socio of socios) {
      const apellidoSocio = normalizarTexto(socio.apellido || '');
      const nombreSocio = normalizarTexto(socio.nombre || '');

      const similitud = similitudNombreCompleto(
        apellidoMovimiento,
        nombreMovimiento,
        apellidoSocio,
        nombreSocio
      );

      if (similitud >= 85 && similitud > mejorSimilitud) {
        mejorSimilitud = similitud;
        mejorMatch = crearMatchResult(
          socio.id,
          'D',
          Math.round(similitud),
          `Match por nombre completo: ${Math.round(similitud)}% de similitud`,
          `${socio.apellido} ${socio.nombre}`
        );
      }
    }

    return mejorMatch || crearMatchResult(null, 'D', 0, 'No se encontró match por nombre completo');
  } catch (error) {
    console.error('Error en match Nivel D:', error);
    return crearMatchResult(null, 'D', 0, 'Error al buscar por nombre');
  }
}

/**
 * Nivel E: Match por similitud Levenshtein (60-80% confianza)
 */
async function matchNivelE(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.apellido_transferente) {
    return crearMatchResult(null, 'E', 0, 'Sin apellido en el movimiento');
  }

  const apellidoMovimiento = normalizarTexto(movimiento.apellido_transferente || '');

  try {
    const { data: socios, error } = await supabase
      .from('socios')
      .select('id, apellido, nombre');

    if (error || !socios || socios.length === 0) {
      return crearMatchResult(null, 'E', 0, 'No hay socios en el sistema');
    }

    let mejorMatch: MatchResult | null = null;
    let mejorSimilitud = 0;

    for (const socio of socios) {
      const apellidoSocio = normalizarTexto(socio.apellido || '');

      if (!apellidoSocio) continue;

      const similitud = porcentajeSimilitud(apellidoMovimiento, apellidoSocio);

      if (similitud >= 60 && similitud <= 80 && similitud > mejorSimilitud) {
        mejorSimilitud = similitud;
        mejorMatch = crearMatchResult(
          socio.id,
          'E',
          Math.round(similitud),
          `Match por similitud de apellido: ${Math.round(similitud)}%`,
          `${socio.apellido} ${socio.nombre}`
        );
      }
    }

    return mejorMatch || crearMatchResult(null, 'E', 0, 'No se encontró match por similitud');
  } catch (error) {
    console.error('Error en match Nivel E:', error);
    return crearMatchResult(null, 'E', 0, 'Error al buscar por similitud');
  }
}

/**
 * Nivel E.5: Match por keywords relacionadas (75% confianza)
 * Busca en la tabla socios_keywords SOLO por CUIT/CUIL del movimiento
 * NUNCA busca por DNI
 */
async function matchNivelE5(movimiento: MovimientoProcesado, supabase: any): Promise<MatchResult> {
  if (!movimiento.cuit_cuil) {
    return crearMatchResult(null, 'E', 0, 'Sin CUIT/CUIL en el movimiento para buscar keywords');
  }

  try {
    const cuitNormalizado = normalizarCUITCUIL(movimiento.cuit_cuil);
    
    if (cuitNormalizado.length < 11) {
      return crearMatchResult(null, 'E', 0, 'CUIT/CUIL inválido para buscar keywords');
    }

    const { data: keywordCuit, error: errorCuit } = await supabase
      .from('socios_keywords')
      .select('socio_id, socios(id, apellido, nombre)')
      .eq('tipo', 'cuit')
      .eq('valor', cuitNormalizado)
      .maybeSingle();

    if (!errorCuit && keywordCuit && keywordCuit.socios) {
      const socio = keywordCuit.socios;
      return crearMatchResult(
        socio.id,
        'E',
        75,
        `Match por keyword relacionada: CUIT ${cuitNormalizado}`,
        `${socio.apellido} ${socio.nombre}`
      );
    }

    return crearMatchResult(null, 'E', 0, 'No se encontró match por keywords relacionadas');
  } catch (error) {
    console.error('Error en match Nivel E.5 (keywords):', error);
    return crearMatchResult(null, 'E', 0, 'Error al buscar por keywords relacionadas');
  }
}

/**
 * Helper para crear un MatchResult
 */
function crearMatchResult(
  socio_id: number | null,
  nivel: NivelMatch,
  porcentaje: number,
  razon: string,
  nombre_completo?: string
): MatchResult {
  return {
    socio_id,
    nivel,
    porcentaje_confianza: porcentaje,
    razon,
    nombre_completo,
  };
}

/**
 * Detecta duplicados en movimientos bancarios
 */
export async function detectarDuplicados(
  movimiento: MovimientoProcesado,
  movimientosExistentes: MovimientoProcesado[]
): Promise<{
  esDuplicado: boolean;
  movimientoDuplicadoId: number | null;
  razon: string;
}> {
  // Nivel 1: Por referencia bancaria
  if (movimiento.referencia_bancaria) {
    // Aquí necesitaríamos buscar en la BD movimientos existentes con la misma referencia
    // Por ahora retornamos que no es duplicado
  }

  // Nivel 2: Por criterios combinados (socio, monto, fecha)
  // Esto se hará después de guardar los movimientos en la BD

  return {
    esDuplicado: false,
    movimientoDuplicadoId: null,
    razon: '',
  };
}

