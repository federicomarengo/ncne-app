'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Visita } from '@/app/types/visitas';
import { createClient } from '@/utils/supabase/client';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { logger } from '@/app/utils/logger';

interface EditarVisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  visita: Visita | null;
  onSuccess?: () => void;
}

export default function EditarVisitaModal({
  isOpen,
  onClose,
  visita,
  onSuccess,
}: EditarVisitaModalProps) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [formData, setFormData] = useState({
    socio_id: '',
    fecha_visita: '',
    cantidad_visitantes: '1',
    costo_unitario: '4200',
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSocios, setLoadingSocios] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarSocios();
    }
  }, [isOpen]);

  useEffect(() => {
    if (visita) {
      // Solo permitir editar si está en estado pendiente
      if (visita.estado !== 'pendiente') {
        setError('Solo se pueden editar visitas en estado "Pendiente"');
      }

      setFormData({
        socio_id: visita.socio_id.toString(),
        fecha_visita:
          visita.fecha_visita && typeof visita.fecha_visita === 'string'
            ? visita.fecha_visita.split('T')[0]
            : visita.fecha_visita
            ? new Date(visita.fecha_visita).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        cantidad_visitantes: visita.cantidad_visitantes.toString(),
        costo_unitario: visita.costo_unitario.toString(),
        observaciones: visita.observaciones || '',
      });
      setError(null);
    }
  }, [visita]);

  const cargarSocios = async () => {
    setLoadingSocios(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('socios')
        .select('id, numero_socio, apellido, nombre')
        .eq('estado', 'activo')
        .order('apellido', { ascending: true });

      if (error) {
        logger.error('Error al cargar socios:', error);
      } else {
        setSocios((data as Socio[]) || []);
      }
    } catch (err) {
      logger.error('Error al cargar socios:', err);
    } finally {
      setLoadingSocios(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (error) {
      setError(null);
    }
  };

  const montoTotal = parseFloat(formData.cantidad_visitantes) * parseFloat(formData.costo_unitario);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visita) return;

    // Validar que esté en estado pendiente
    if (visita.estado !== 'pendiente') {
      setError('Solo se pueden editar visitas en estado "Pendiente"');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!formData.socio_id) {
        throw new Error('El socio es obligatorio');
      }

      if (!formData.fecha_visita) {
        throw new Error('La fecha de visita es obligatoria');
      }

      const cantidad = parseInt(formData.cantidad_visitantes);
      if (isNaN(cantidad) || cantidad < 1) {
        throw new Error('La cantidad de visitantes debe ser mayor a 0');
      }

      const costoUnitario = parseFloat(formData.costo_unitario);
      if (isNaN(costoUnitario) || costoUnitario < 0) {
        throw new Error('El costo unitario debe ser mayor o igual a 0');
      }

      const supabase = createClient();
      const updateData: any = {
        socio_id: parseInt(formData.socio_id),
        fecha_visita: formData.fecha_visita,
        cantidad_visitantes: cantidad,
        costo_unitario: costoUnitario,
        monto_total: montoTotal,
        observaciones: formData.observaciones.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('visitas')
        .update(updateData)
        .eq('id', visita.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la visita');
    } finally {
      setLoading(false);
    }
  };

  if (!visita) return null;

  // Si la visita no está pendiente, mostrar mensaje
  if (visita.estado !== 'pendiente') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Editar Visita" size="md">
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              Esta visita no se puede editar porque ya tiene un cupón generado.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Solo se pueden editar visitas en estado "Pendiente".
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
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Visita" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Socio */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Socio
          </h3>
          <div>
            <label
              htmlFor="socio_id"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Socio *
            </label>
            <select
              id="socio_id"
              name="socio_id"
              value={formData.socio_id}
              onChange={handleChange}
              required
              disabled={loadingSocios}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:bg-gray-100"
            >
              <option value="">Seleccionar socio...</option>
              {socios.map((socio) => (
                <option key={socio.id} value={socio.id}>
                  {getNombreCompleto(socio)} (Socio #{socio.numero_socio})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detalles de la Visita */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Detalles de la Visita
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fecha_visita"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha de Visita *
              </label>
              <input
                type="date"
                id="fecha_visita"
                name="fecha_visita"
                value={formData.fecha_visita}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="cantidad_visitantes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cantidad de Visitantes *
              </label>
              <input
                type="number"
                id="cantidad_visitantes"
                name="cantidad_visitantes"
                min="1"
                value={formData.cantidad_visitantes}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="costo_unitario"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Costo Unitario *
              </label>
              <input
                type="number"
                id="costo_unitario"
                name="costo_unitario"
                min="0"
                step="0.01"
                value={formData.costo_unitario}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="monto_total"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Monto Total
              </label>
              <input
                type="text"
                id="monto_total"
                value={`$${montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="observaciones"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                placeholder="Observaciones adicionales sobre la visita..."
              />
            </div>
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
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}








