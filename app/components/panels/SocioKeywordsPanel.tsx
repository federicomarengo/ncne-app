'use client';

import React, { useState, useEffect } from 'react';
import { SocioKeyword } from '@/app/types/socios';

interface SocioKeywordsPanelProps {
  socioId: number;
}

export default function SocioKeywordsPanel({ socioId }: SocioKeywordsPanelProps) {
  const [keywords, setKeywords] = useState<SocioKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (expandido) {
      cargarKeywords();
    }
  }, [socioId, expandido]);

  const cargarKeywords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/socios/${socioId}/keywords`);
      
      if (!response.ok) {
        throw new Error('Error al cargar keywords');
      }

      const data = await response.json();
      setKeywords(data.keywords || []);
    } catch (err: any) {
      console.error('Error al cargar keywords:', err);
      setError('Error al cargar keywords');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarTodas = async () => {
    if (!window.confirm('¿Está seguro que desea eliminar todas las keywords relacionadas? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setEliminando(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/socios/${socioId}/keywords`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar keywords');
      }

      setSuccess('Keywords eliminadas correctamente');
      setKeywords([]);
    } catch (err: any) {
      console.error('Error al eliminar keywords:', err);
      setError('Error al eliminar keywords');
    } finally {
      setEliminando(false);
    }
  };

  const handleEliminarUno = async (keywordId: number) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta keyword?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/socios/${socioId}/keywords/${keywordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar keyword');
      }

      // Remover de la lista local
      setKeywords(prev => prev.filter(k => k.id !== keywordId));
      setSuccess('Keyword eliminada correctamente');
    } catch (err: any) {
      console.error('Error al eliminar keyword:', err);
      setError('Error al eliminar keyword');
    }
  };

  const formatKeyword = (keyword: SocioKeyword) => {
    const valor = keyword.valor;
    if (valor.length === 11) {
      return `${valor.slice(0, 2)}-${valor.slice(2, 10)}-${valor.slice(10)}`;
    }
    return valor;
  };

  // Cargar cantidad inicial sin expandir
  useEffect(() => {
    const cargarCantidad = async () => {
      try {
        const response = await fetch(`/api/socios/${socioId}/keywords`);
        if (response.ok) {
          const data = await response.json();
          setKeywords(data.keywords || []);
        }
      } catch (err) {
        // Silencioso
      } finally {
        setLoading(false);
      }
    };
    cargarCantidad();
  }, [socioId]);

  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>Keywords Relacionadas</span>
          {keywords.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {keywords.length}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandido && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span className="ml-2 text-xs text-gray-500">Cargando...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs">
                  {success}
                </div>
              )}

              {keywords.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  No hay keywords relacionadas. Se generan automáticamente al asignar pagos sin match.
                </p>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleLimpiarTodas}
                      disabled={eliminando}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {eliminando ? 'Eliminando...' : 'Limpiar Todas'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {keywords.map((keyword) => (
                      <div
                        key={keyword.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 flex-shrink-0">
                            CUIT
                          </span>
                          <span className="font-mono text-gray-900 truncate">
                            {formatKeyword(keyword)}
                          </span>
                          {keyword.nombre_info && (
                            <span className="text-gray-500 truncate hidden sm:inline">
                              • {keyword.nombre_info}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-400 text-xs">
                            {new Date(keyword.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleEliminarUno(keyword.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

