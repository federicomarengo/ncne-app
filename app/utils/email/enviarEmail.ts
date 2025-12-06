/**
 * Utilidad para envío de emails usando nodemailer
 * 
 * Maneja la conexión con el servidor SMTP y el envío de emails
 */

import nodemailer from 'nodemailer';
import { ConfiguracionEmail, ResultadoEnvioEmail } from '@/app/types/email';
import { logger } from '@/app/utils/logger';

// =====================================================
// INTERFAZ PARA ENVÍO DE EMAIL
// =====================================================

export interface OpcionesEmail {
  destinatario: string;
  asunto: string;
  html: string;
  texto?: string; // Versión plain text (fallback)
  emailRealDestinatario?: string; // Email real del destinatario (para modo desarrollo)
}

// =====================================================
// CREAR TRANSPORTER
// =====================================================

/**
 * Crea un transporter de nodemailer con la configuración SMTP
 */
export function crearTransporter(config: ConfiguracionEmail) {
  const transporterConfig: any = {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_seguridad === 'SSL', // true para puerto 465, false para otros
    auth: {
      user: config.smtp_usuario,
      pass: config.smtp_password,
    },
  };

  // Configurar TLS específicamente
  if (config.smtp_seguridad === 'TLS') {
    transporterConfig.secure = false;
    transporterConfig.requireTLS = true;
    transporterConfig.tls = {
      rejectUnauthorized: false, // Permite certificados auto-firmados (útil para desarrollo)
    };
  }

  // Si es NONE, sin seguridad (no recomendado en producción)
  if (config.smtp_seguridad === 'NONE') {
    transporterConfig.secure = false;
    transporterConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  return nodemailer.createTransport(transporterConfig);
}

// =====================================================
// ENVIAR EMAIL
// =====================================================

/**
 * Envía un email usando la configuración SMTP proporcionada
 * 
 * @param config - Configuración SMTP
 * @param opciones - Opciones del email (destinatario, asunto, contenido)
 * @returns Resultado del envío
 */
export async function enviarEmail(
  config: ConfiguracionEmail,
  opciones: OpcionesEmail
): Promise<ResultadoEnvioEmail> {
  try {
    // Validar configuración
    if (!config.habilitado) {
      return {
        success: false,
        error: 'El sistema de emails está deshabilitado',
      };
    }

    // Validar opciones
    if (!opciones.destinatario || !opciones.asunto || !opciones.html) {
      return {
        success: false,
        error: 'Faltan parámetros obligatorios (destinatario, asunto, html)',
      };
    }

    // Obtener email destino (considerando modo desarrollo)
    const { email: emailDestino, esDesarrollo } = obtenerEmailDestino(
      config,
      opciones.destinatario
    );

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailDestino)) {
      return {
        success: false,
        error: 'El email del destinatario no es válido',
      };
    }

    // Crear transporter
    const transporter = crearTransporter(config);

    // Formatear asunto considerando modo desarrollo
    const asuntoFinal = formatearAsuntoDesarrollo(
      opciones.asunto,
      esDesarrollo,
      opciones.destinatario // Email real para mostrar en desarrollo
    );

    // Configurar mensaje
    const mensaje = {
      from: `"${config.email_remitente_nombre}" <${config.email_remitente}>`,
      to: emailDestino,
      subject: asuntoFinal,
      html: opciones.html,
      text: opciones.texto || extraerTextoDeHTML(opciones.html), // Fallback a versión texto
    };

    // Enviar email
    const info = await transporter.sendMail(mensaje);

    return {
      success: true,
      detalles: `Email enviado: ${info.messageId}`,
    };

  } catch (error: any) {
    logger.error('Error al enviar email:', error);
    
    return {
      success: false,
      error: error.message || 'Error desconocido al enviar email',
      detalles: error.stack,
    };
  }
}

// =====================================================
// VERIFICAR CONFIGURACIÓN SMTP
// =====================================================

/**
 * Verifica que la configuración SMTP sea válida probando la conexión
 * 
 * @param config - Configuración SMTP a verificar
 * @returns Resultado de la verificación
 */
export async function verificarConfiguracionSMTP(
  config: ConfiguracionEmail
): Promise<ResultadoEnvioEmail> {
  try {
    const transporter = crearTransporter(config);
    
    // Verificar conexión
    await transporter.verify();
    
    return {
      success: true,
      detalles: 'Conexión SMTP verificada exitosamente',
    };

  } catch (error: any) {
    logger.error('Error al verificar configuración SMTP:', error);
    
    return {
      success: false,
      error: 'No se pudo conectar al servidor SMTP',
      detalles: error.message,
    };
  }
}

// =====================================================
// MODO DESARROLLO
// =====================================================

/**
 * Obtiene el email destino considerando el modo desarrollo
 * Si el modo desarrollo está activo, retorna el email de desarrollo
 * 
 * @param config - Configuración SMTP
 * @param emailDestinoReal - Email destino real (del socio)
 * @returns Email destino a usar (desarrollo o real)
 */
export function obtenerEmailDestino(
  config: ConfiguracionEmail,
  emailDestinoReal: string
): { email: string; esDesarrollo: boolean } {
  if (config.modo_desarrollo && config.email_desarrollo) {
    return {
      email: config.email_desarrollo,
      esDesarrollo: true,
    };
  }
  
  return {
    email: emailDestinoReal,
    esDesarrollo: false,
  };
}

/**
 * Modifica el asunto para incluir información del modo desarrollo
 * 
 * @param asuntoOriginal - Asunto original del email
 * @param esDesarrollo - Si está en modo desarrollo
 * @param emailReal - Email real del destinatario (para mostrar en desarrollo)
 * @returns Asunto modificado
 */
export function formatearAsuntoDesarrollo(
  asuntoOriginal: string,
  esDesarrollo: boolean,
  emailReal?: string
): string {
  if (!esDesarrollo) {
    return asuntoOriginal;
  }
  
  const prefijo = '[DESARROLLO]';
  const destinatarioInfo = emailReal ? ` (Destinatario real: ${emailReal})` : '';
  
  return `${prefijo} ${asuntoOriginal}${destinatarioInfo}`;
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Extrae texto plano de HTML (versión básica)
 * Para usar como fallback cuando el email no puede mostrar HTML
 */
function extraerTextoDeHTML(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formatea un monto en pesos argentinos
 */
export function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

/**
 * Formatea una fecha en formato argentino
 */
export function formatearFecha(fecha: string | Date): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaObj);
}

/**
 * Obtiene el nombre del mes en español
 */
export function obtenerNombreMes(mes: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || '';
}

