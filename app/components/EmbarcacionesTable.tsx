'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { filterEmbarcaciones } from '@/app/utils/filterEmbarcaciones';
import { getNombreCompleto } from '@/app/types/socios';

interface EmbarcacionesTableProps {
  embarcaciones: Embarcacion[];
  onRefresh?: () => void;
}

export default function EmbarcacionesTable({ embarcaciones, onRefresh }: EmbarcacionesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('Todos');
  const [socioFilter, setSocioFilter] = useState<string>('Todos');

  const filteredEmbarcaciones = useMemo(
    () => filterEmbarcaciones(embarcaciones, searchTerm, tipoFilter, socioFilter),
    [embarcaciones, searchTerm, tipoFilter, socioFilter]
  );

  // Obtener lista única de socios para el filtro, ordenados por apellido
  const sociosUnicos = useMemo(() => {
    const sociosMap = new Map();
    embarcaciones.forEach((emb) => {
      if (emb.socio) {
        sociosMap.set(emb.socio_id, emb.socio);
      }
    });
    return Array.from(sociosMap.values()).sort((a: any, b: any) => {
      const apellidoA = a.apellido || '';
      const apellidoB = b.apellido || '';
      return apellidoA.localeCompare(apellidoB);
    });
  }, [embarcaciones]);


  const getTipoLabel = (tipo: string) => {
    const tipoObj = TIPOS_EMBARCACION.find((t) => t.value === tipo);
    return tipoObj?.label || tipo;
  };

  return (
    <div className="w-full">
      {/* Header con botón Nueva Embarcación */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Embarcaciones</h1>
          <p className="text-sm text-gray-600 mt-1">Administra las embarcaciones de los socios</p>
        </div>
        <button
          onClick={() => router.push('/embarcaciones/nueva')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Embarcación
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Búsqueda */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Búsqueda
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Matrícula, nombre de embarcación o socio..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtro por Tipo */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              id="tipo"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              {TIPOS_EMBARCACION.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Socio */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Socio
            </label>
            <select
              id="socio"
              value={socioFilter}
              onChange={(e) => setSocioFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              {sociosUnicos.map((socio) => (
                <option key={socio.id} value={socio.id.toString()}>
                  {getNombreCompleto(socio as any)} (Socio #{socio.numero_socio})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{filteredEmbarcaciones.length}</span> de{' '}
          <span className="font-medium">{embarcaciones.length}</span> embarcaciones
        </p>
        {(searchTerm || tipoFilter !== 'Todos' || socioFilter !== 'Todos') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setTipoFilter('Todos');
              setSocioFilter('Todos');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  MATRÍCULA
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  NOMBRE
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  TIPO
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ESLORA (PIES)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  SOCIO PROPIETARIO
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmbarcaciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No se encontraron embarcaciones
                  </td>
                </tr>
              ) : (
                filteredEmbarcaciones.map((embarcacion, index) => (
                  <tr
                    key={embarcacion.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {embarcacion.matricula || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {embarcacion.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {getTipoLabel(embarcacion.tipo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {embarcacion.eslora_pies} pies
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {embarcacion.socio ? (
                        <span>
                          {getNombreCompleto(embarcacion.socio as any)} (Socio #{embarcacion.socio.numero_socio})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/embarcaciones/${embarcacion.id}`)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Ver detalle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/embarcaciones/${embarcacion.id}/editar`)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Editar embarcación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/embarcaciones/${embarcacion.id}/eliminar`)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Eliminar embarcación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

