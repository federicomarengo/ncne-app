'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/app/utils/logger';

interface LogEntry {
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

interface LogsStats {
  total: number;
  byLevel: Record<string, number>;
  errorsLast24h: number;
  errorsLastHour: number;
}

export default function LogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [hours, setHours] = useState<number>(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('level', filter);
      }
      params.set('hours', hours.toString());
      params.set('limit', '200');

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (error) {
      logger.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Actualizar cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [filter, hours, autoRefresh]);

  const clearLogs = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar todos los logs?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
      });

      if (response.ok) {
        setLogs([]);
        setStats(null);
      }
    } catch (error) {
      logger.error('Error limpiando logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Logs del Sistema</h1>
        <p className="text-gray-600">Monitoreo de errores y eventos de la aplicación</p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total de Logs</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Errores (24h)</div>
            <div className="text-2xl font-bold text-red-600">{stats.errorsLast24h}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Errores (1h)</div>
            <div className="text-2xl font-bold text-red-600">{stats.errorsLastHour}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.byLevel.warn || 0}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="error">Solo Errores</option>
              <option value="warn">Solo Warnings</option>
              <option value="info">Solo Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Últimas horas
            </label>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="1">1 hora</option>
              <option value="6">6 horas</option>
              <option value="24">24 horas</option>
              <option value="168">7 días</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-actualizar (5s)
            </label>
          </div>

          <div className="ml-auto">
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
            >
              Actualizar
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Limpiar Logs
            </button>
          </div>
        </div>
      </div>

      {/* Lista de logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensaje
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No hay logs para mostrar
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded border ${getLevelColor(
                          log.level
                        )}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-md truncate">{log.message}</div>
                      {log.data !== undefined && log.data !== null && (
                        <details className="mt-1">
                          <summary className="text-xs text-blue-600 cursor-pointer">
                            Ver detalles
                          </summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.pathname || log.url || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

