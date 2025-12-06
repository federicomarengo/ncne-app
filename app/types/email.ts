/**
 * Tipos TypeScript para el sistema de envío de emails
 * 
 * Incluye interfaces para configuración SMTP, envíos, y tracking
 */

// =====================================================
// CONFIGURACIÓN SMTP
// =====================================================

export type TipoSeguridad = 'TLS' | 'SSL' | 'NONE';

export interface ConfiguracionEmail {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_usuario: string;
  smtp_password: string;
  smtp_seguridad: TipoSeguridad;
  email_remitente: string;
  email_remitente_nombre: string;
  habilitado: boolean;
  modo_desarrollo: boolean;
  email_desarrollo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracionEmailUpdate {
  smtp_host?: string;
  smtp_port?: number;
  smtp_usuario?: string;
  smtp_password?: string;
  smtp_seguridad?: TipoSeguridad;
  email_remitente?: string;
  email_remitente_nombre?: string;
  habilitado?: boolean;
  modo_desarrollo?: boolean;
  email_desarrollo?: string | null;
}

export interface ConfiguracionEmailCreate {
  smtp_host: string;
  smtp_port: number;
  smtp_usuario: string;
  smtp_password: string;
  smtp_seguridad: TipoSeguridad;
  email_remitente: string;
  email_remitente_nombre: string;
  habilitado?: boolean;
  modo_desarrollo?: boolean;
  email_desarrollo?: string | null;
}

// =====================================================
// ENVÍOS DE EMAIL
// =====================================================

export type TipoEnvio = 'cupon_mensual' | 'cupon_individual' | 'cupon_ingreso' | 'recordatorio' | 'test';
export type EstadoEnvio = 'pendiente' | 'enviado' | 'error' | 'rebotado';

export interface EnvioEmail {
  id: number;
  tipo_envio: TipoEnvio;
  socio_id: number | null;
  cupon_id: number | null;
  email_destino: string;
  asunto: string;
  estado: EstadoEnvio;
  fecha_envio: string | null;
  error_mensaje: string | null;
  intentos: number;
  created_at: string;
}

export interface EnvioEmailCreate {
  tipo_envio: TipoEnvio;
  socio_id?: number | null;
  cupon_id?: number | null;
  email_destino: string;
  asunto: string;
  estado?: EstadoEnvio;
}

export interface EnvioEmailUpdate {
  estado?: EstadoEnvio;
  fecha_envio?: string;
  error_mensaje?: string | null;
  intentos?: number;
}

// =====================================================
// DATOS DEL EMAIL
// =====================================================

export interface DatosEmailCupon {
  // Datos del socio
  socio: {
    id: number;
    numero_socio: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  
  // Datos del cupón
  cupon: {
    id: number;
    numero_cupon: string;
    periodo_mes: number;
    periodo_anio: number;
    fecha_vencimiento: string;
    monto_total: number;
    monto_cuota_social: number;
    monto_amarra: number;
    monto_visitas: number;
    monto_otros_cargos: number;
    monto_intereses: number;
  };
  
  // Items del cupón
  items: Array<{
    descripcion: string;
    cantidad: number;
    precio_unitario: number | null;
    subtotal: number;
  }>;
  
  // Embarcaciones del socio
  embarcaciones: Array<{
    nombre: string;
    tipo: string;
    eslora_pies: number;
  }>;
  
  // Datos del club
  club: {
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
    web: string | null;
  };
  
  // Datos bancarios
  banco: {
    nombre: string | null;
    cbu: string | null;
    alias: string | null;
    titular: string | null;
    tipo_cuenta: string | null;
  };
  
  // URL del portal
  urlPortal: string;
}

// =====================================================
// RESPUESTAS DE API
// =====================================================

export interface ResultadoEnvioEmail {
  success: boolean;
  envioId?: number;
  error?: string;
  detalles?: string;
}

export interface ResultadoEnvioMasivo {
  total: number;
  enviados: number;
  errores: number;
  detalles: Array<{
    socioId: number;
    email: string;
    estado: 'enviado' | 'error';
    error?: string;
  }>;
}

// =====================================================
// CONFIGURACIÓN DE EMAIL DE PRUEBA
// =====================================================

export interface EmailPruebaRequest {
  email_destino: string;
  asunto?: string;
}

export interface EmailPruebaResponse {
  success: boolean;
  mensaje: string;
  error?: string;
}

