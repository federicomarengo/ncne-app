'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Pago, MetodoPago, EstadoConciliacion, METODOS_PAGO, getMetodoPagoLabel } from '@/app/types/pagos';
import { filterPagos } from '@/app/utils/filterPagos';
import { formatDate } from '@/app/utils/formatDate';
import { getNombreCompleto } from '@/app/types/socios';

interface PagosTableProps {
  pagos: Pago[];
  onRefresh?: () => void;
}

export default function PagosTable({ pagos, onRefresh }: PagosTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [metodoFilter, setMetodoFilter] = useState<MetodoPago | 'Todos'>('Todos');
  const [conciliacionFilter, setConciliacionFilter] = useState<EstadoConciliacion | 'Todos'>('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const filteredPagos = useMemo(
    () => filterPagos(pagos, searchTerm, metodoFilter, conciliacionFilter, fechaDesde, fechaHasta),
    [pagos, searchTerm, metodoFilter, conciliacionFilter, fechaDesde, fechaHasta]
  );

  const getEstadoBadgeClass = (estado: EstadoConciliacion) => {
    switch (estado) {
      case 'conciliado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: EstadoConciliacion) => {
    switch (estado) {
      case 'conciliado':
        return 'Conciliado';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  const handleSuccess = () => {
    router.refresh();
    onRefresh?.();
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setMetodoFilter('Todos');
    setConciliacionFilter('Todos');
    setFechaDesde('');
    setFechaHasta('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Header con botón Registrar Pago */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los pagos registrados</p>
        </div>
        <button
          onClick={() => router.push('/pagos/registrar')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Pago
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Búsqueda
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por socio..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            <select
              value={metodoFilter}
              onChange={(e) => setMetodoFilter(e.target.value as MetodoPago | 'Todos')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo.value} value={metodo.value}>
                  {metodo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Conciliación
            </label>
            <select
              value={conciliacionFilter}
              onChange={(e) => setConciliacionFilter(e.target.value as EstadoConciliacion | 'Todos')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="conciliado">Conciliado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{filteredPagos.length}</span> de{' '}
          <span className="font-medium">{pagos.length}</span> pagos
        </p>
        {(searchTerm || metodoFilter !== 'Todos' || conciliacionFilter !== 'Todos' || fechaDesde || fechaHasta) && (
          <button
            onClick={limpiarFiltros}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Socio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comprobante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia Bancaria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filteredPagos.map((pago) => (
                  <tr 
                    key={pago.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/pagos/${pago.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(pago.fecha_pago)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pago.socio ? `${pago.socio.apellido}, ${pago.socio.nombre}` : 'N/A'}
                      </div>
                      {pago.socio && (
                        <div className="text-xs text-gray-500">
                          Socio #{pago.socio.numero_socio}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(parseFloat(pago.monto.toString()))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getMetodoPagoLabel(pago.metodo_pago)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pago.numero_comprobante || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pago.referencia_bancaria || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                          pago.estado_conciliacion
                        )}`}
                      >
                        {formatEstado(pago.estado_conciliacion)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/pagos/${pago.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Ver detalle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/pagos/${pago.id}/eliminar`)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Eliminar pago"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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



