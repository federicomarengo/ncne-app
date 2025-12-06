export type EstadoVisita = 'pendiente' | 'con_cupon_generado';

export interface Visita {
  id: number;
  socio_id: number;
  fecha_visita: string | Date;
  cantidad_visitantes: number;
  costo_unitario: number;
  monto_total: number;
  estado: EstadoVisita;
  cupon_id?: number | null;
  fecha_generacion_cupon?: string | Date | null;
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
}









