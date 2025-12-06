'use client';

import React, { useState } from 'react';
import { VistaPreviaCupon } from '@/app/types/cupones';

interface VistaPreviaCuponesTableProps {
  cupones: VistaPreviaCupon[];
  cuponesSeleccionados: Set<number>;
  onToggleSeleccion: (socioId: number) => void;
}

export default function VistaPreviaCuponesTable({
  cupones,
  cuponesSeleccionados,
  onToggleSeleccion,
}: VistaPreviaCuponesTableProps) {
  const [sociosExpandidos, setSociosExpandidos] = useState<Set<number>>(new Set());

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const toggleExpandir = (socioId: number) => {
    const nuevos = new Set(sociosExpandidos);
    if (nuevos.has(socioId)) {
      nuevos.delete(socioId);
    } else {
      nuevos.add(socioId);
    }
    setSociosExpandidos(nuevos);
  };

  if (cupones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay cupones para mostrar. Calcule la vista previa primero.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={cupones.length > 0 && cupones.every(c => cuponesSeleccionados.has(c.socio.id))}
                  onChange={(e) => {
                    const todosSeleccionados = cupones.every(c => cuponesSeleccionados.has(c.socio.id));
                    if (e.target.checked && !todosSeleccionados) {
                      // Seleccionar todos los que no están seleccionados
                      cupones.forEach(c => {
                        if (!cuponesSeleccionados.has(c.socio.id)) {
                          onToggleSeleccion(c.socio.id);
                        }
                      });
                    } else if (!e.target.checked && todosSeleccionados) {
                      // Deseleccionar todos
                      cupones.forEach(c => {
                        if (cuponesSeleccionados.has(c.socio.id)) {
                          onToggleSeleccion(c.socio.id);
                        }
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Socio
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Cuota Social
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Amarra
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Visitas
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Intereses
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cupones.map((item) => {
              const isExpanded = sociosExpandidos.has(item.socio.id);
              const isSelected = cuponesSeleccionados.has(item.socio.id);
              return (
                <React.Fragment key={item.socio.id}>
                  <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSeleccion(item.socio.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {item.items.length > 0 && (
                        <button
                          onClick={() => toggleExpandir(item.socio.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.socio.apellido}, {item.socio.nombre}
                      <span className="text-gray-500 ml-2">
                        (#{item.socio.numero_socio})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.montoCuotaSocial)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.montoAmarra)}
                      {item.embarcaciones.length > 0 && (
                        <span className="text-xs text-gray-500 block">
                          ({item.embarcaciones.length} embarcación{item.embarcaciones.length > 1 ? 'es' : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.montoVisitas)}
                      {item.visitas.length > 0 && (
                        <span className="text-xs text-gray-500 block">
                          ({item.visitas.length} visita{item.visitas.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.montoIntereses)}
                      {item.cuponesVencidos.length > 0 && (
                        <span className="text-xs text-gray-500 block">
                          ({item.cuponesVencidos.length} cupón{item.cuponesVencidos.length > 1 ? 'es' : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(item.montoTotal)}
                    </td>
                  </tr>
                  {isExpanded && item.items.length > 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-3 bg-gray-50">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Items del cupón:</p>
                          {item.items.map((itemPrevia, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex justify-between">
                              <span>{itemPrevia.descripcion}</span>
                              <span className="font-medium">{formatCurrency(itemPrevia.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

