/**
 * Sistema de logging mejorado para errores
 * Reemplaza las funciones de Sentry con un sistema de logging local
 */

import { logger } from './logger';

/**
 * Captura un error con contexto adicional
 * Reemplaza la funcionalidad de Sentry.captureException
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  const errorContext: Record<string, unknown> = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // En cliente, agregar información del navegador
  if (typeof window !== 'undefined') {
    errorContext.userAgent = window.navigator.userAgent;
    errorContext.url = window.location.href;
    errorContext.pathname = window.location.pathname;
  }

  logger.error('Error capturado:', errorContext);
}

/**
 * Captura un mensaje con nivel de severidad
 * Reemplaza la funcionalidad de Sentry.captureMessage
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' | 'debug' = 'info'
) {
  const logData: Record<string, unknown> = {
    message,
    level,
    timestamp: new Date().toISOString(),
  };

  // En cliente, agregar información del navegador
  if (typeof window !== 'undefined') {
    logData.url = window.location.href;
    logData.pathname = window.location.pathname;
  }

  switch (level) {
    case 'error':
    case 'fatal':
      logger.error(message, logData);
      break;
    case 'warning':
      logger.warn(message, logData);
      break;
    case 'info':
      logger.info(message, logData);
      break;
    case 'debug':
      logger.debug(message, logData);
      break;
  }
}

/**
 * Agrega contexto adicional a los logs
 * Útil para agregar información que se incluirá en todos los logs siguientes
 */
export function setContext(name: string, context: Record<string, unknown>) {
  logger.info(`Contexto establecido: ${name}`, context);
}

/**
 * Agrega tags a los logs
 * Útil para categorizar errores
 */
export function setTag(key: string, value: string) {
  logger.debug(`Tag establecido: ${key}=${value}`);
}
