'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Visita, EstadoVisita } from '@/app/types/visitas';
import { filterVisitas } from '@/app/utils/filterVisitas';
import { formatDate } from '@/app/utils/formatDate';
import { getNombreCompleto } from '@/app/types/socios';
import Button from './ui/Button';

interface VisitasTableProps {
  visitas: Visita[];
  onRefresh?: () => void;
}

export default function VisitasTable({ visitas, onRefresh }: VisitasTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoVisita | 'Todos'>('Todos');
  const [mesFilter, setMesFilter] = useState('Todos');

  const filteredVisitas = useMemo(
    () => filterVisitas(visitas, searchTerm, estadoFilter, mesFilter),
    [visitas, searchTerm, estadoFilter, mesFilter]
  );

  // Obtener meses únicos para el filtro
  const mesesUnicos = useMemo(() => {
    const meses = new Set<string>();
    visitas.forEach((visita) => {
      const fecha = new Date(visita.fecha_visita);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mes);
    });
    return Array.from(meses).sort().reverse();
  }, [visitas]);

  const getEstadoBadgeClass = (estado: EstadoVisita) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'con_cupon_generado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: EstadoVisita) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'con_cupon_generado':
        return 'Con Cupón Generado';
      default:
        return estado;
    }
  };


  return (
    <div className="w-full">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Estado
            </label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as EstadoVisita | 'Todos')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="con_cupon_generado">Con Cupón Generado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mes
            </label>
            <select
              value={mesFilter}
              onChange={(e) => setMesFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos los meses</option>
              {mesesUnicos.map((mes) => {
                const [anio, mesNum] = mes.split('-');
                const fecha = new Date(parseInt(anio), parseInt(mesNum) - 1);
                const nombreMes = fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
                return (
                  <option key={mes} value={mes}>
                    {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{filteredVisitas.length}</span> de{' '}
          <span className="font-medium">{visitas.length}</span> visitas
        </p>
        {(searchTerm || estadoFilter !== 'Todos' || mesFilter !== 'Todos') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setEstadoFilter('Todos');
              setMesFilter('Todos');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Botón Nueva Visita */}
      <div className="mb-4 flex justify-end">
        <Button onClick={() => router.push('/visitas/cargar')} variant="blue">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Visita
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  FECHA
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  SOCIO
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  CANT. VISITANTES
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  MONTO TOTAL
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ESTADO
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  CUPÓN
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVisitas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron visitas
                  </td>
                </tr>
              ) : (
                filteredVisitas.map((visita, index) => (
                  <tr
                    key={visita.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(visita.fecha_visita)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {visita.socio ? (
                        <span>
                          {visita.socio.numero_socio} - {getNombreCompleto(visita.socio as any)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {visita.cantidad_visitantes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${visita.monto_total.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                          visita.estado
                        )}`}
                      >
                        {formatEstado(visita.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {visita.fecha_generacion_cupon
                        ? formatDate(visita.fecha_generacion_cupon)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {visita.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={() => router.push(`/visitas/${visita.id}/editar`)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Editar visita"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.push(`/visitas/${visita.id}/eliminar`)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Eliminar visita"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        {visita.estado === 'con_cupon_generado' && (
                          <span className="text-xs text-gray-500">No editable</span>
                        )}
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




