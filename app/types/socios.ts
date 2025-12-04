export type EstadoSocio = 'activo' | 'inactivo' | 'pendiente';

export interface Socio {
  id: number;
  numero_socio: number;
  apellido: string;
  nombre: string;
  dni: string;
  cuit_cuil?: string | null;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  fecha_nacimiento?: string | Date | null;
  estado: EstadoSocio;
  fecha_ingreso?: string | Date | null;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Función helper para obtener nombre completo
export function getNombreCompleto(socio: Socio | null | undefined): string {
  if (!socio) return '';
  return `${socio.apellido}, ${socio.nombre}`.trim();
}

// Keyword relacionada con un socio para matching mejorado
export interface SocioKeyword {
  id: number;
  socio_id: number;
  tipo: 'cuit';
  valor: string;
  nombre_info?: string | null; // Nombre de la persona/empresa (info adicional, no se usa en matching)
  created_at: string;
  updated_at: string;
}

