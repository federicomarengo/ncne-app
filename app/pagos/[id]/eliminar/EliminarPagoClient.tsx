'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pago } from '@/app/types/pagos';
import { createClient } from '@/utils/supabase/client';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';
import { getMetodoPagoLabel } from '@/app/types/pagos';

interface EliminarPagoClientProps {
  pago: Pago;
}

export default function EliminarPagoClient({ pago }: EliminarPagoClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = async () => {
    // Verificar si el pago tiene cupones asociados
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Verificar cupones asociados
      const { data: cuponesAsociados } = await supabase
        .from('pagos_cupones')
        .select('cupon_id')
        .eq('pago_id', pago.id);

      if (cuponesAsociados && cuponesAsociados.length > 0) {
        // Si hay cupones asociados, necesitamos revertir el estado de los cupones
        // Primero, obtener los cupones que fueron pagados completamente con este pago
        const { data: cuponesData } = await supabase
          .from('pagos_cupones')
          .select(`
            cupon_id,
            monto_aplicado,
            cupon:cupones (
              id,
              monto_total,
              estado
            )
          `)
          .eq('pago_id', pago.id);

        if (cuponesData) {
          // Revertir estado de cupones que estaban pagados
          for (const pc of cuponesData) {
            const cupon = (pc as any).cupon;
            if (cupon && cupon.estado === 'pagado') {
              // Verificar si hay otros pagos para este cupón
              const { data: otrosPagos } = await supabase
                .from('pagos_cupones')
                .select('pago_id')
                .eq('cupon_id', cupon.id)
                .neq('pago_id', pago.id);

              // Si no hay otros pagos, revertir a pendiente
              if (!otrosPagos || otrosPagos.length === 0) {
                await supabase
                  .from('cupones')
                  .update({
                    estado: 'pendiente',
                    fecha_pago: null,
                  })
                  .eq('id', cupon.id);
              }
            }
          }
        }

        // Eliminar relaciones pago-cupón (CASCADE debería hacerlo automáticamente, pero por seguridad)
        await supabase
          .from('pagos_cupones')
          .delete()
          .eq('pago_id', pago.id);
      }

      // Eliminar el pago
      const { error: deleteError } = await supabase
        .from('pagos')
        .delete()
        .eq('id', pago.id);

      if (deleteError) {
        throw deleteError;
      }

      router.push('/pagos');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/pagos/${pago.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Detalle del Pago
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Eliminar Pago</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-800 font-medium mb-1">
                    ¿Estás seguro de que deseas eliminar este pago?
                  </p>
                  <p className="text-sm text-red-700">
                    Esta acción no se puede deshacer. Si el pago tiene cupones asociados, se revertirá su estado a "Pendiente" si no tienen otros pagos.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Información del Pago
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">ID:</span>
                  <span className="text-sm text-gray-900">{pago.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm text-gray-900">{formatDate(pago.fecha_pago)}</span>
                </div>
                {pago.socio && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Socio:</span>
                    <span className="text-sm text-gray-900">
                      {`${pago.socio.apellido}, ${pago.socio.nombre}`} (Socio #{pago.socio.numero_socio})
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Monto:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(parseFloat(pago.monto.toString()))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Método:</span>
                  <span className="text-sm text-gray-900">{getMetodoPagoLabel(pago.metodo_pago)}</span>
                </div>
                {pago.referencia_bancaria && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Referencia Bancaria:</span>
                    <span className="text-sm text-gray-900">{pago.referencia_bancaria}</span>
                  </div>
                )}
                {pago.numero_comprobante && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Comprobante:</span>
                    <span className="text-sm text-gray-900">{pago.numero_comprobante}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
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
                {loading ? 'Eliminando...' : 'Eliminar Pago'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

