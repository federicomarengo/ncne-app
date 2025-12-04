'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Visita } from '@/app/types/visitas';
import { createClient } from '@/utils/supabase/client';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';

interface ConfirmarEliminarVisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  visita: Visita | null;
  onSuccess?: () => void;
}

export default function ConfirmarEliminarVisitaModal({
  isOpen,
  onClose,
  visita,
  onSuccess,
}: ConfirmarEliminarVisitaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!visita) return;

    // Validar que esté en estado pendiente
    if (visita.estado !== 'pendiente') {
      setError('Solo se pueden eliminar visitas en estado "Pendiente"');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('visitas')
        .delete()
        .eq('id', visita.id);

      if (deleteError) {
        throw deleteError;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la visita');
    } finally {
      setLoading(false);
    }
  };

  if (!visita) return null;

  // Si la visita no está pendiente, mostrar mensaje
  if (visita.estado !== 'pendiente') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Visita" size="md">
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              Esta visita no se puede eliminar porque ya tiene un cupón generado.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Solo se pueden eliminar visitas en estado "Pendiente".
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="md">
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
                ¿Estás seguro de que deseas eliminar esta visita?
              </p>
              <p className="text-sm text-red-700">
                Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a la visita.
              </p>
            </div>
          </div>
        </div>

        {/* Visita Info */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información de la Visita
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Fecha:</span> {formatDate(visita.fecha_visita)}
            </p>
            {visita.socio && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Socio:</span>{' '}
                {visita.socio.numero_socio} - {getNombreCompleto(visita.socio as any)}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-medium">Cantidad de visitantes:</span> {visita.cantidad_visitantes}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Monto total:</span>{' '}
              ${visita.monto_total.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
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
            {loading ? 'Eliminando...' : 'Eliminar Visita'}
          </button>
        </div>
      </div>
    </Modal>
  );
}








