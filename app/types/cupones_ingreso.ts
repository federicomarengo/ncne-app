export type TipoIngreso = 'membresia' | 'derecho_embarcacion';

export interface CuotaIngreso {
  numero: number;
  fechaVencimiento: string;
  monto: number;
  estado: 'pendiente';
}

export interface VistaPreviaIngreso {
  tipo: TipoIngreso;
  socioId: number;
  embarcacionId?: number | null;
  montoTotal: number;
  cantidadCuotas: number;
  fechaInicio: string;
  cuotas: CuotaIngreso[];
  embarcacionNombre?: string;
}


