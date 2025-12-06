/**
 * Tipos TypeScript para la tabla de configuración del sistema
 * 
 * Mapeo exacto a la estructura de la tabla configuracion en la base de datos
 * Ver: migrations/001_esquema.sql
 */

export interface Configuracion {
  id: number;
  club_nombre: string | null;
  club_direccion: string | null;
  club_telefono1: string | null;
  club_telefono2: string | null;
  club_email1: string | null;
  club_email2: string | null;
  club_web: string | null;
  banco_cbu: string | null;
  banco_alias: string | null;
  banco_nombre: string | null;
  banco_titular: string | null;
  banco_tipo_cuenta: string | null;
  costo_visita: number;
  cuota_social_base: number;
  amarra_valor_por_pie: number;
  guarderia_vela_ligera: number;
  guarderia_windsurf: number;
  guarderia_lancha: number;
  dia_vencimiento: number;
  dias_gracia: number;
  tasa_interes_mora: number;
  generacion_automatica: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tipo para actualizar configuración (todos los campos opcionales excepto id)
 */
export type ConfiguracionUpdate = Partial<Omit<Configuracion, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Valores por defecto según el esquema SQL
 */
export const CONFIGURACION_DEFAULTS: Omit<Configuracion, 'id' | 'created_at' | 'updated_at'> = {
  club_nombre: null,
  club_direccion: null,
  club_telefono1: null,
  club_telefono2: null,
  club_email1: null,
  club_email2: null,
  club_web: null,
  banco_cbu: null,
  banco_alias: null,
  banco_nombre: null,
  banco_titular: null,
  banco_tipo_cuenta: null,
  costo_visita: 4200.00,
  cuota_social_base: 28000.00,
  amarra_valor_por_pie: 2800.00,
  guarderia_vela_ligera: 42000.00,
  guarderia_windsurf: 14000.00,
  guarderia_lancha: 56000.00,
  dia_vencimiento: 15,
  dias_gracia: 5,
  tasa_interes_mora: 0.0450,
  generacion_automatica: false,
};





