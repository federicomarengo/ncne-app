/**
 * Tipos TypeScript para movimientos bancarios y conciliación
 * 
 * Mapeo a la tabla movimientos_bancarios en la base de datos
 * Ver: migrations/001_esquema.sql
 */

export type EstadoMovimiento = 'nuevo' | 'procesado' | 'descartado' | 'ya_registrado';
export type NivelMatch = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface MovimientoBancario {
  id: number;
  fecha_movimiento: string;
  apellido_transferente: string | null;
  nombre_transferente: string | null;
  cuit_cuil: string | null;
  dni: string | null;
  monto: number;
  referencia_bancaria: string | null;
  concepto_completo: string | null;
  socio_identificado_id: number | null;
  nivel_match: string | null;
  porcentaje_confianza: number | null;
  estado: EstadoMovimiento;
  es_duplicado: boolean;
  movimiento_duplicado_id: number | null;
  pago_id: number | null;
  observaciones: string | null;
  hash_movimiento?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Movimiento bancario antes de guardarlo en la BD (sin ID)
 */
export interface MovimientoBancarioInput {
  fecha_movimiento: string;
  apellido_transferente?: string | null;
  nombre_transferente?: string | null;
  cuit_cuil?: string | null;
  dni?: string | null;
  monto: number;
  referencia_bancaria?: string | null;
  concepto_completo?: string | null;
  socio_identificado_id?: number | null;
  nivel_match?: string | null;
  porcentaje_confianza?: number | null;
  estado?: EstadoMovimiento;
  es_duplicado?: boolean;
  movimiento_duplicado_id?: number | null;
  observaciones?: string | null;
  hash_movimiento?: string | null;
}

/**
 * Resultado de matching para un movimiento
 */
export interface MatchResult {
  socio_id: number | null;
  nivel: NivelMatch;
  porcentaje_confianza: number;
  razon: string;
  nombre_completo?: string;
}

/**
 * Datos extraídos de una línea del extracto bancario
 */
export interface LineaExtracto {
  fecha: string;
  concepto: string;
  monto: number;
  referencia: string | null;
  tipo_movimiento: string;
}

/**
 * Datos procesados de un movimiento antes de matching
 */
export interface MovimientoProcesado {
  fecha_movimiento: string;
  apellido_transferente: string | null;
  nombre_transferente: string | null;
  cuit_cuil: string | null;
  dni: string | null;
  monto: number;
  referencia_bancaria: string | null;
  concepto_completo: string;
}

/**
 * Estadísticas de conciliación
 */
export interface EstadisticasConciliacion {
  total: number;
  match_exacto: number;
  match_probable: number;
  sin_match: number;
  duplicados: number;
  procesados: number;
  monto_total: number;
}

