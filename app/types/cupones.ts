export type EstadoCupon = 'pendiente' | 'pagado' | 'vencido';

export interface ItemCupon {
  id: number;
  cupon_id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario?: number | null;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
}

export interface Cupon {
  id: number;
  numero_cupon: string;
  socio_id: number;
  periodo_mes: number;
  periodo_anio: number;
  fecha_emision: string | Date;
  fecha_vencimiento: string | Date;
  monto_cuota_social: number;
  monto_amarra: number;
  monto_visitas: number;
  monto_otros_cargos: number;
  monto_intereses: number;
  monto_total: number;
  estado: EstadoCupon;
  fecha_pago?: string | Date | null;
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
  
  // Items del cupón (cuando se cargan)
  items?: ItemCupon[];
}

export interface ItemPrevia {
  tipo: 'cuota_social' | 'amarra' | 'visita' | 'interes' | 'muelle_seco' | 'rampa';
  descripcion: string;
  monto: number;
}

export interface VistaPreviaCupon {
  socio: {
    id: number;
    numero_socio: number;
    apellido: string;
    nombre: string;
    dni?: string | null;
    email?: string | null;
  };
  montoCuotaSocial: number;
  montoAmarra: number;
  montoVisitas: number;
  montoCuotasPlanes: number;
  montoIntereses: number;
  montoTotal: number;
  visitas: Array<{
    id: number;
    fecha_visita: string;
    cantidad_visitantes: number;
    costo_unitario: number;
    monto_total: number;
  }>;
  embarcaciones: Array<{
    id: number;
    tipo: string;
    eslora_pies: number;
  }>;
  cuponesVencidos: Array<{
    cupon: {
      id: number;
      numero_cupon: string;
      socio_id: number;
      fecha_vencimiento: string;
      monto_total: number;
    };
    diasMora: number;
    interes: number;
  }>;
  items: ItemPrevia[];
  seleccionado?: boolean;
}

