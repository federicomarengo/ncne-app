export type TipoEmbarcacion =
  | 'crucero'
  | 'velero'
  | 'lancha'
  | 'moto_agua'
  | 'kayak'
  | 'canoa'
  | 'windsurf'
  | 'vela_ligera'
  | 'optimist'
  | 'cuatriciclo'
  | 'otro';

export interface Embarcacion {
  id: number;
  socio_id: number;
  matricula?: string | null;
  nombre: string;
  tipo: TipoEmbarcacion | string;
  astillero?: string | null;
  modelo?: string | null;
  eslora_pies: number;
  eslora_metros?: number | null;
  manga_metros?: number | null;
  puntal_metros?: number | null;
  calado?: number | null;
  tonelaje?: number | null;
  anio_construccion?: number | null;
  motor_info?: string | null;
  hp?: number | null;
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

export const TIPOS_EMBARCACION: { value: TipoEmbarcacion; label: string }[] = [
  { value: 'crucero', label: 'Crucero' },
  { value: 'velero', label: 'Velero' },
  { value: 'lancha', label: 'Lancha' },
  { value: 'moto_agua', label: 'Moto de Agua' },
  { value: 'kayak', label: 'Kayak' },
  { value: 'canoa', label: 'Canoa' },
  { value: 'windsurf', label: 'Windsurf (Tabla)' },
  { value: 'vela_ligera', label: 'Vela Ligera' },
  { value: 'optimist', label: 'Optimist' },
  { value: 'cuatriciclo', label: 'Cuatriciclo' },
  { value: 'otro', label: 'Otro' },
];

