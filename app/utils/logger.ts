/**
 * Sistema de logging mejorado
 * 
 * Características:
 * - Se desactiva automáticamente en producción (excepto errores)
 * - Formatea logs con timestamps y contexto
 * - Soporta diferentes niveles de log
 * - Almacena logs en memoria para visualización en dashboard
 */

import { logsStorage } from './logs-storage';

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  environment: string;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // En desarrollo, siempre loguear
    if (isDevelopment) return true;
    
    // En producción, solo loguear errores y warnings críticos
    return level === 'error' || level === 'warn';
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        return `${prefix} ${message}\n${dataStr}`;
      } catch {
        return `${prefix} ${message}\n${String(data)}`;
      }
    }
    
    return `${prefix} ${message}`;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    };
  }

  log(...args: unknown[]): void {
    if (this.shouldLog('log')) {
      const message = args[0] as string;
      const data = args.length > 1 ? args.slice(1) : undefined;
      const entry = this.createLogEntry('log', message, data);
      console.log(this.formatMessage('log', message, data));
      
      // Solo almacenar en desarrollo
      if (isDevelopment) {
        logsStorage.addLog({
          level: 'log',
          message,
          data,
          environment: entry.environment,
        });
      }
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const message = args[0] as string;
      const data = args.length > 1 ? args.slice(1) : undefined;
      const entry = this.createLogEntry('error', message, data);
      
      console.error(this.formatMessage('error', message, data));
      
      // Almacenar en memoria para el dashboard
      logsStorage.addLog({
        level: 'error',
        message,
        data,
        environment: entry.environment,
        // Agregar contexto del navegador si está disponible
        ...(typeof window !== 'undefined' && {
          url: window.location.href,
          pathname: window.location.pathname,
          userAgent: window.navigator.userAgent,
        }),
      });
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      const message = args[0] as string;
      const data = args.length > 1 ? args.slice(1) : undefined;
      const entry = this.createLogEntry('warn', message, data);
      console.warn(this.formatMessage('warn', message, data));
      
      // Almacenar warnings importantes
      logsStorage.addLog({
        level: 'warn',
        message,
        data,
        environment: entry.environment,
        ...(typeof window !== 'undefined' && {
          url: window.location.href,
          pathname: window.location.pathname,
        }),
      });
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      const message = args[0] as string;
      const data = args.length > 1 ? args.slice(1) : undefined;
      console.info(this.formatMessage('info', message, data));
      
      // Solo almacenar info en desarrollo
      if (isDevelopment) {
        const entry = this.createLogEntry('info', message, data);
        logsStorage.addLog({
          level: 'info',
          message,
          data,
          environment: entry.environment,
        });
      }
    }
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      const message = args[0] as string;
      const data = args.length > 1 ? args.slice(1) : undefined;
      console.debug(this.formatMessage('debug', message, data));
      
      // Solo almacenar debug en desarrollo
      if (isDevelopment) {
        const entry = this.createLogEntry('debug', message, data);
        logsStorage.addLog({
          level: 'debug',
          message,
          data,
          environment: entry.environment,
        });
      }
    }
  }
}

export const logger = new Logger();
