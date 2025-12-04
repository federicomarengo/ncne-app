'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { getNombreCompleto } from '@/app/types/socios';

interface DetalleEmbarcacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  embarcacion: Embarcacion | null;
}

export default function DetalleEmbarcacionModal({
  isOpen,
  onClose,
  embarcacion,
}: DetalleEmbarcacionModalProps) {
  if (!embarcacion) return null;

  const getTipoLabel = (tipo: string) => {
    const tipoObj = TIPOS_EMBARCACION.find((t) => t.value === tipo);
    return tipoObj?.label || tipo;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de la Embarcación" size="lg">
      <div className="space-y-6">
        {/* Información Básica */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información Básica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <p className="text-sm text-gray-900 font-medium">
                {embarcacion.nombre}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Matrícula
              </label>
              <p className="text-sm text-gray-900">
                {embarcacion.matricula || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <p className="text-sm text-gray-900">
                {getTipoLabel(embarcacion.tipo)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eslora (Pies)
              </label>
              <p className="text-sm text-gray-900">
                {embarcacion.eslora_pies} pies
              </p>
            </div>
            {embarcacion.eslora_metros && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eslora (Metros)
                </label>
                <p className="text-sm text-gray-900">
                  {embarcacion.eslora_metros} m
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Socio Propietario
              </label>
              <p className="text-sm text-gray-900">
                {embarcacion.socio ? (
                  <span>
                    {embarcacion.socio.numero_socio} - {getNombreCompleto(embarcacion.socio as any)}
                  </span>
                ) : (
                  '-'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        {(embarcacion.astillero || embarcacion.modelo || embarcacion.manga_metros || 
          embarcacion.puntal_metros || embarcacion.calado || embarcacion.tonelaje || 
          embarcacion.anio_construccion) && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Información Adicional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {embarcacion.astillero && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Astillero
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.astillero}</p>
                </div>
              )}
              {embarcacion.modelo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.modelo}</p>
                </div>
              )}
              {embarcacion.manga_metros && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manga (Metros)
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.manga_metros} m</p>
                </div>
              )}
              {embarcacion.puntal_metros && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puntal (Metros)
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.puntal_metros} m</p>
                </div>
              )}
              {embarcacion.calado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calado (Metros)
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.calado} m</p>
                </div>
              )}
              {embarcacion.tonelaje && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tonelaje
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.tonelaje} T</p>
                </div>
              )}
              {embarcacion.anio_construccion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año de Construcción
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.anio_construccion}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información del Motor */}
        {(embarcacion.motor_info || embarcacion.hp) && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Información del Motor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {embarcacion.motor_info && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Información del Motor
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.motor_info}</p>
                </div>
              )}
              {embarcacion.hp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Potencia (HP)
                  </label>
                  <p className="text-sm text-gray-900">{embarcacion.hp} HP</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observaciones */}
        {embarcacion.observaciones && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Observaciones
            </h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {embarcacion.observaciones}
            </p>
          </div>
        )}

        {/* Botón de Cerrar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
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

