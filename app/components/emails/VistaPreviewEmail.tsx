'use client';

import React, { useState, useEffect } from 'react';
import { DatosEmailCupon } from '@/app/types/email';

interface VistaPreviewEmailProps {
  cuponId: number;
  onClose: () => void;
}

export default function VistaPreviewEmail({ cuponId, onClose }: VistaPreviewEmailProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [datos, setDatos] = useState<DatosEmailCupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarPreview();
  }, [cuponId]);

  const cargarPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emails/preview/${cuponId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Error al cargar vista previa');
        return;
      }

      setHtmlContent(data.html);
      setDatos(data.datos);
    } catch (err: any) {
      setError('Error al cargar vista previa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vista Previa del Email</h2>
            {datos && (
              <p className="text-sm text-gray-600 mt-1">
                Cupón: {datos.cupon.numero_cupon} | 
                Socio: {datos.socio.nombre} {datos.socio.apellido} ({datos.socio.email})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando vista previa...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && htmlContent && (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Iframe para mostrar el HTML sin que afecte el estilo de la página */}
              <iframe
                title="Preview Email"
                srcDoc={htmlContent}
                className="w-full h-[600px] bg-gray-50"
                style={{ border: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={cargarPreview}
              disabled={loading}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              🔄 Recargar
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

