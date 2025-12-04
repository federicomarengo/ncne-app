/**
 * Sistema de logging de errores para conciliación bancaria
 * Guarda errores en localStorage para revisión posterior
 */

interface ErrorLog {
  id: string;
  timestamp: string;
  tipo: string;
  mensaje: string;
  detalles?: any;
  stack?: string;
  contexto?: string;
}

const STORAGE_KEY = 'conciliacion_error_logs';
const MAX_LOGS = 100; // Mantener solo los últimos 100 errores

export function logError(
  tipo: string,
  mensaje: string,
  error?: any,
  contexto?: string
): void {
  try {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      tipo,
      mensaje,
      detalles: error ? {
        message: error.message,
        name: error.name,
        code: error.code,
      } : undefined,
      stack: error?.stack,
      contexto,
    };

    // Obtener logs existentes
    const logsExistentes = obtenerLogs();
    
    // Agregar nuevo log al inicio
    const nuevosLogs = [errorLog, ...logsExistentes].slice(0, MAX_LOGS);
    
    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevosLogs));
    
    // También loggear en consola para debugging
    console.error(`[Error Log] ${tipo}:`, mensaje, error);
  } catch (err) {
    // Si falla el logging, al menos loggear en consola
    console.error('Error al guardar log de error:', err);
    console.error('Error original:', tipo, mensaje, error);
  }
}

export function obtenerLogs(): ErrorLog[] {
  try {
    const logsJson = localStorage.getItem(STORAGE_KEY);
    if (!logsJson) return [];
    return JSON.parse(logsJson);
  } catch (err) {
    console.error('Error al leer logs:', err);
    return [];
  }
}

export function limpiarLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error al limpiar logs:', err);
  }
}

export function exportarLogs(): string {
  const logs = obtenerLogs();
  return JSON.stringify(logs, null, 2);
}


