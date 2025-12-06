'use client';

import React, { useState } from 'react';
import SidePanel from '../ui/SidePanel';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { createClient } from '@/utils/supabase/client';

interface ConfirmarEliminarSocioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  socio: Socio | null;
  onSuccess?: () => void;
}

export default function ConfirmarEliminarSocioPanel({
  isOpen,
  onClose,
  socio,
  onSuccess,
}: ConfirmarEliminarSocioPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!socio) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('socios')
        .delete()
        .eq('id', socio.id);

      if (deleteError) {
        throw deleteError;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el socio');
    } finally {
      setLoading(false);
    }
  };

  if (!socio) return null;

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="md">
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-800 font-medium mb-1">
                ¿Estás seguro de que deseas eliminar este socio?
              </p>
              <p className="text-sm text-red-700">
                Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al socio.
              </p>
            </div>
          </div>
        </div>

        {/* Socio Info */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información del Socio
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Socio:</p>
            <p className="font-semibold text-gray-900">
              {getNombreCompleto(socio)}
            </p>
            <p className="text-sm text-gray-600">DNI: {socio.dni}</p>
            <p className="text-sm text-gray-600">Número de Socio: {socio.numero_socio}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Eliminando...' : 'Eliminar Socio'}
          </button>
        </div>
      </div>
    </SidePanel>
  );
}








