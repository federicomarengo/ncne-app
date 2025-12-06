/**
 * Utilidades para generar hash único de movimientos bancarios
 * 
 * Genera un hash SHA-256 basado en los datos esenciales del movimiento
 * para detectar duplicados incluso si se sube el mismo archivo múltiples veces
 */

import { MovimientoProcesado } from '@/app/types/movimientos_bancarios';
import { normalizarTexto } from './normalizarTexto';
import { logger } from '@/app/utils/logger';

/**
 * Interfaz para los datos que se usarán para generar el hash
 */
interface DatosHashMovimiento {
  fecha: string;           // YYYY-MM-DD
  monto: string;           // "15000.00" (sin separadores, 2 decimales)
  concepto: string;        // Normalizado (lowercase, sin espacios extra)
  referencia?: string;     // Si existe, normalizada
  apellido?: string;       // Si existe, normalizado
  nombre?: string;         // Si existe, normalizado
}

/**
 * Normaliza una fecha al formato YYYY-MM-DD
 */
function normalizarFecha(fecha: string): string {
  // Si ya está en formato YYYY-MM-DD, retornar tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }
  
  // Si está en formato DD/MM/YYYY, convertir
  const match = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dia, mes, anio] = match;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  // Si no se puede parsear, retornar tal cual (pero esto no debería pasar)
  return fecha;
}

/**
 * Normaliza un monto a string con 2 decimales, sin separadores
 */
function normalizarMonto(monto: number): string {
  return monto.toFixed(2);
}

/**
 * Normaliza un string para el hash (lowercase, sin espacios extra)
 */
function normalizarParaHash(texto: string | null | undefined): string {
  if (!texto) return '';
  return normalizarTexto(texto)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Reemplazar múltiples espacios por uno solo
}

/**
 * Prepara los datos del movimiento para generar el hash
 */
function prepararDatosParaHash(movimiento: MovimientoProcesado): DatosHashMovimiento {
  return {
    fecha: normalizarFecha(movimiento.fecha_movimiento),
    monto: normalizarMonto(movimiento.monto),
    concepto: normalizarParaHash(movimiento.concepto_completo),
    referencia: movimiento.referencia_bancaria 
      ? normalizarParaHash(movimiento.referencia_bancaria) 
      : undefined,
    apellido: movimiento.apellido_transferente 
      ? normalizarParaHash(movimiento.apellido_transferente) 
      : undefined,
    nombre: movimiento.nombre_transferente 
      ? normalizarParaHash(movimiento.nombre_transferente) 
      : undefined,
  };
}

/**
 * Genera un hash SHA-256 único para un movimiento bancario
 * 
 * El hash se genera a partir de los datos esenciales del movimiento:
 * - Fecha (normalizada a YYYY-MM-DD)
 * - Monto (redondeado a 2 decimales)
 * - Concepto completo (normalizado)
 * - Referencia bancaria (si existe, normalizada)
 * - Apellido y nombre del transferente (si existen, normalizados)
 * 
 * @param movimiento - Movimiento procesado del extracto bancario
 * @returns Hash SHA-256 hexadecimal de 64 caracteres
 */
export async function generarHashMovimiento(
  movimiento: MovimientoProcesado
): Promise<string> {
  // Preparar datos normalizados
  const datosHash = prepararDatosParaHash(movimiento);
  
  // Crear string JSON ordenado (sin espacios extra)
  const jsonString = JSON.stringify(datosHash, Object.keys(datosHash).sort());
  
  // Generar hash SHA-256
  // En Node.js/Browser, usar SubtleCrypto o crypto
  if (typeof window !== 'undefined') {
    // Browser: usar SubtleCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js: usar módulo crypto
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }
}

/**
 * Versión síncrona para usar en contextos donde no se puede usar async
 * IMPORTANTE: Solo funciona en Node.js (servidor). En el cliente, usar la versión async.
 */
export function generarHashMovimientoSync(movimiento: MovimientoProcesado): string {
  const datosHash = prepararDatosParaHash(movimiento);
  const jsonString = JSON.stringify(datosHash, Object.keys(datosHash).sort());
  
  // Solo funciona en Node.js (servidor)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
      // Usar crypto de Node.js
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(jsonString).digest('hex');
    } catch (e) {
      logger.error('Error al generar hash con crypto:', e);
    }
  }
  
  // Si estamos en el cliente, lanzar error porque necesitamos la versión async
  if (typeof window !== 'undefined') {
    throw new Error('generarHashMovimientoSync solo funciona en el servidor. Use generarHashMovimiento() en el cliente.');
  }
  
  // Fallback: hash simple (no debería llegar aquí)
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

