'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Pago } from '@/app/types/pagos';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';
import { getMetodoPagoLabel } from '@/app/types/pagos';

interface DetallePagoClientProps {
  pago: Pago;
}

export default function DetallePagoClient({ pago }: DetallePagoClientProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'conciliado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: string) => {
    switch (estado) {
      case 'conciliado':
        return 'Conciliado';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/pagos')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Pagos
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalle del Pago</h1>
              <p className="text-sm text-gray-600 mt-1">ID: {pago.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/pagos/${pago.id}/editar`)}
                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => router.push(`/pagos/${pago.id}/eliminar`)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Información del Pago */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Información del Pago
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Pago</label>
                <p className="text-base text-gray-900 mt-1">{formatDate(pago.fecha_pago)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Monto</label>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {formatCurrency(parseFloat(pago.monto.toString()))}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Método de Pago</label>
                <p className="text-base text-gray-900 mt-1">{getMetodoPagoLabel(pago.metodo_pago)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Estado de Conciliación</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                      pago.estado_conciliacion
                    )}`}
                  >
                    {formatEstado(pago.estado_conciliacion)}
                  </span>
                </p>
              </div>
              {pago.numero_comprobante && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Número de Comprobante</label>
                  <p className="text-base text-gray-900 mt-1">{pago.numero_comprobante}</p>
                </div>
              )}
              {pago.referencia_bancaria && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Referencia Bancaria</label>
                  <p className="text-base font-medium text-blue-600 mt-1">{pago.referencia_bancaria}</p>
                </div>
              )}
              {pago.fecha_conciliacion && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Conciliación</label>
                  <p className="text-base text-gray-900 mt-1">{formatDate(pago.fecha_conciliacion)}</p>
                </div>
              )}
            </div>
            {pago.observaciones && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">Observaciones</label>
                <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{pago.observaciones}</p>
              </div>
            )}
          </div>

          {/* Información del Socio */}
          {pago.socio && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Información del Socio</h2>
                <button
                  onClick={() => router.push(`/socios/${pago.socio!.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  Ver detalle
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
                  <p className="text-base text-gray-900 mt-1">{`${pago.socio.apellido}, ${pago.socio.nombre}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Número de Socio</label>
                  <p className="text-base text-gray-900 mt-1">#{pago.socio.numero_socio}</p>
                </div>
              </div>
            </div>
          )}

          {/* Movimiento Bancario */}
          {pago.movimiento_bancario_id && pago.movimiento_bancario && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Movimiento Bancario Asociado</h2>
                <span className="text-xs text-gray-500">ID: {pago.movimiento_bancario.id}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha del Movimiento</label>
                  <p className="text-base text-gray-900 mt-1">
                    {formatDate(pago.movimiento_bancario.fecha_movimiento)}
                  </p>
                </div>
                {pago.movimiento_bancario.referencia_bancaria && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referencia Bancaria</label>
                    <p className="text-base font-medium text-blue-600 mt-1">
                      {pago.movimiento_bancario.referencia_bancaria}
                    </p>
                  </div>
                )}
                {pago.movimiento_bancario.concepto_completo && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Concepto</label>
                    <p className="text-base text-gray-900 mt-1">
                      {pago.movimiento_bancario.concepto_completo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cupones Asociados */}
          {pago.cupones && pago.cupones.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Cupones Asociados ({pago.cupones.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cupón
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto Aplicado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pago.cupones.map((pagoCupon: any) => (
                      <tr key={pagoCupon.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {pagoCupon.cupon?.numero_cupon || `Cupón #${pagoCupon.cupon_id}`}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(parseFloat(pagoCupon.cupon?.monto_total?.toString() || '0'))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(parseFloat(pagoCupon.monto_aplicado.toString()))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pagoCupon.cupon?.estado === 'pagado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {pagoCupon.cupon?.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {pagoCupon.cupon?.id && (
                            <button
                              onClick={() => router.push(`/cupones/${pagoCupon.cupon.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Ver detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!pago.cupones || pago.cupones.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 text-center py-4">
                No hay cupones asociados a este pago
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

