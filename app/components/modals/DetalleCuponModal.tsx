'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Cupon, ItemCupon } from '@/app/types/cupones';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';
import VistaPreviewEmail from '@/app/components/emails/VistaPreviewEmail';
import { logger } from '@/app/utils/logger';

interface DetalleCuponModalProps {
  isOpen: boolean;
  onClose: () => void;
  cupon: Cupon | null;
}

export default function DetalleCuponModal({
  isOpen,
  onClose,
  cupon,
}: DetalleCuponModalProps) {
  const [items, setItems] = useState<ItemCupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [mensajeEmail, setMensajeEmail] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  useEffect(() => {
    if (isOpen && cupon) {
      cargarItems();
    }
  }, [isOpen, cupon]);

  const cargarItems = async () => {
    if (!cupon) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('items_cupon')
        .select('*')
        .eq('cupon_id', cupon.id)
        .order('id', { ascending: true });

      if (error) {
        logger.error('Error al cargar items:', error);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      logger.error('Error al cargar items:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!cupon) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: string) => {
    return estado.charAt(0).toUpperCase() + estado.slice(1);
  };

  const handleEnviarEmail = async () => {
    if (!cupon) return;
    
    setEnviandoEmail(true);
    setMensajeEmail(null);

    try {
      const response = await fetch('/api/emails/enviar-cupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cupon_id: cupon.id }),
      });

      const data = await response.json();

      if (data.success) {
        setMensajeEmail({
          tipo: 'success',
          texto: data.mensaje || 'Email enviado exitosamente',
        });
      } else {
        setMensajeEmail({
          tipo: 'error',
          texto: data.error || 'Error al enviar email',
        });
      }
    } catch (error: any) {
      setMensajeEmail({
        tipo: 'error',
        texto: 'Error al enviar email: ' + error.message,
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const handleVerPreview = () => {
    if (!cupon) return;
    
    setMostrarPreview(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Cupón" size="lg">
      <div className="space-y-6">
        {/* Información del Cupón */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información del Cupón
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cupón
              </label>
              <p className="text-sm text-gray-900 font-medium">
                {cupon.numero_cupon}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                  cupon.estado
                )}`}
              >
                {formatEstado(cupon.estado)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Socio
              </label>
              <p className="text-sm text-gray-900">
                {cupon.socio ? `${cupon.socio.apellido}, ${cupon.socio.nombre}` : 'N/A'}
                {cupon.socio && (
                  <span className="text-gray-500 ml-2">
                    (Socio #{cupon.socio.numero_socio})
                  </span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <p className="text-sm text-gray-900">
                {cupon.periodo_mes}/{cupon.periodo_anio}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Emisión
              </label>
              <p className="text-sm text-gray-900">
                {formatDate(cupon.fecha_emision)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento
              </label>
              <p className="text-sm text-gray-900">
                {formatDate(cupon.fecha_vencimiento)}
              </p>
            </div>
            {cupon.fecha_pago && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Pago
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(cupon.fecha_pago)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desglose de Montos */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Desglose de Montos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuota Social
              </label>
              <p className="text-sm text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_cuota_social.toString()))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amarra
              </label>
              <p className="text-sm text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_amarra.toString()))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visitas
              </label>
              <p className="text-sm text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_visitas.toString()))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Otros Cargos
              </label>
              <p className="text-sm text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_otros_cargos.toString()))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intereses
              </label>
              <p className="text-sm text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_intereses.toString()))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Monto Total
              </label>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(parseFloat(cupon.monto_total.toString()))}
              </p>
            </div>
          </div>
        </div>

        {/* Items del Cupón */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Cargando items...</p>
          </div>
        ) : items.length > 0 ? (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Items del Cupón
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unitario
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.descripcion}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.cantidad}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.precio_unitario
                          ? formatCurrency(parseFloat(item.precio_unitario.toString()))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(parseFloat(item.subtotal.toString()))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Observaciones */}
        {cupon.observaciones && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Observaciones
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {cupon.observaciones}
            </p>
          </div>
        )}

        {/* Mensaje de email */}
        {mensajeEmail && (
          <div className={`px-4 py-3 rounded-lg ${
            mensajeEmail.tipo === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {mensajeEmail.texto}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleVerPreview}
            disabled={enviandoEmail}
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 transition-colors"
          >
            👁️ Vista Previa
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleEnviarEmail}
              disabled={enviandoEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {enviandoEmail ? '📧 Enviando...' : '📧 Enviar por Email'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Preview */}
      {mostrarPreview && cupon && (
        <VistaPreviewEmail
          cuponId={cupon.id}
          onClose={() => setMostrarPreview(false)}
        />
      )}
    </Modal>
  );
}



