export type MetodoPago = 
  | 'transferencia_bancaria'
  | 'efectivo'
  | 'cheque'
  | 'tarjeta_debito'
  | 'tarjeta_credito';

export type EstadoConciliacion = 'pendiente' | 'conciliado';

export interface Pago {
  id: number;
  socio_id: number;
  movimiento_bancario_id?: number | null;
  fecha_pago: string | Date;
  monto: number;
  metodo_pago: MetodoPago;
  numero_comprobante?: string | null;
  referencia_bancaria?: string | null;
  estado_conciliacion: EstadoConciliacion;
  fecha_conciliacion?: string | Date | null;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Relaciones (cuando se hace join)
  socio?: {
    id: number;
    numero_socio: number;
    apellido: string;
    nombre: string;
  };
  
  // Cupones asociados (cuando se cargan)
  cupones?: Array<{
    cupon_id: number;
    monto_aplicado: number;
    cupon?: {
      numero_cupon: string;
      monto_total: number;
      estado: string;
      fecha_vencimiento?: string | Date;
      fecha_pago?: string | Date | null;
      concepto?: string;
    };
  }>;
  
  // Movimiento bancario relacionado (cuando se carga)
  movimiento_bancario?: {
    id: number;
    fecha_movimiento: string | Date;
    referencia_bancaria?: string | null;
    concepto_completo?: string | null;
    monto: number;
    apellido_transferente?: string | null;
    nombre_transferente?: string | null;
    cuit_cuil?: string | null;
    dni?: string | null;
    estado: string;
  };
}

export const METODOS_PAGO: Array<{ value: MetodoPago; label: string }> = [
  { value: 'transferencia_bancaria', label: 'Transferencia Bancaria' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
];

export function getMetodoPagoLabel(metodo: MetodoPago): string {
  const metodoObj = METODOS_PAGO.find(m => m.value === metodo);
  return metodoObj?.label || metodo;
}



