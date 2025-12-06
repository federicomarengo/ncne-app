/**
 * Sistema de almacenamiento de logs en memoria
 * Almacena los últimos N logs para visualización en el dashboard
 */

export interface LogEntry {
  id: string;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  data?: unknown;
  timestamp: string;
  environment: string;
  url?: string;
  pathname?: string;
  userAgent?: string;
}

class LogsStorage {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Mantener solo los últimos 1000 logs

  /**
   * Agrega un log al almacenamiento
   */
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Mantener solo los últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Obtiene los logs filtrados
   */
  getLogs(options?: {
    level?: LogEntry['level'] | LogEntry['level'][];
    limit?: number;
    since?: Date;
  }): LogEntry[] {
    let filtered = [...this.logs];

    // Filtrar por nivel
    if (options?.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level];
      filtered = filtered.filter(log => levels.includes(log.level));
    }

    // Filtrar por fecha
    if (options?.since) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= options.since!);
    }

    // Ordenar por timestamp (más recientes primero)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limitar cantidad
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Obtiene estadísticas de logs
   */
  getStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    errorsLast24h: number;
    errorsLastHour: number;
  } {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const byLevel: Record<LogEntry['level'], number> = {
      log: 0,
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
    };

    let errorsLast24h = 0;
    let errorsLastHour = 0;

    this.logs.forEach(log => {
      byLevel[log.level]++;

      if (log.level === 'error') {
        const logDate = new Date(log.timestamp);
        if (logDate >= last24h) {
          errorsLast24h++;
        }
        if (logDate >= lastHour) {
          errorsLastHour++;
        }
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      errorsLast24h,
      errorsLastHour,
    };
  }

  /**
   * Limpia los logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Limpia logs antiguos (más de N días)
   */
  clearOldLogs(days: number = 7): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoff);
  }
}

// Instancia singleton
export const logsStorage = new LogsStorage();


