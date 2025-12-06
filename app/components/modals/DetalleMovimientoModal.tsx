'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { MovimientoProcesado, MatchResult } from '@/app/types/movimientos_bancarios';
import { createClient } from '@/utils/supabase/client';
import SelectorSocio from '../SelectorSocio';
import { confirmarPagoDesdeMovimiento } from '@/app/utils/confirmarPagoConciliacion';
import { logger } from '@/app/utils/logger';

interface DetalleMovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimiento: MovimientoProcesado;
  match: MatchResult;
  movimientoId?: number;
  estado?: string;
  pagoAsociado?: {
    id: number;
    fecha_pago: string;
    monto: number;
    metodo_pago: string;
    referencia_bancaria?: string;
    socio?: {
      numero_socio: number;
      nombre: string;
      apellido: string;
    };
  };
  onConfirmarPago?: () => void;
  modoAsignacion?: boolean; // Si es true, solo asigna el socio sin confirmar
  onAsignarSocio?: (socioId: number) => void; // Callback cuando se asigna socio en modo asignación
  onCambiarSocio?: (socioId: number) => void; // Callback cuando se cambia el socio en match exacto/probable
  guardarKeywords?: boolean; // Si es true, guarda keywords al confirmar
}

export default function DetalleMovimientoModal({
  isOpen,
  onClose,
  movimiento,
  match,
  movimientoId,
  estado,
  pagoAsociado,
  onConfirmarPago,
  modoAsignacion = false,
  onAsignarSocio,
  onCambiarSocio,
  guardarKeywords = false,
}: DetalleMovimientoModalProps) {
  const [socioSeleccionado, setSocioSeleccionado] = useState<number | null>(match.socio_id || null);
  const [mostrarCambioSocio, setMostrarCambioSocio] = useState(false);
  const [socioData, setSocioData] = useState<any>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (match.socio_id) {
      cargarSocio(match.socio_id);
    }
  }, [match.socio_id]);

  const cargarSocio = async (socioId: number) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('socios')
        .select('id, numero_socio, nombre, apellido, dni, email')
        .eq('id', socioId)
        .single();

      if (error) throw error;
      setSocioData(data);
    } catch (err) {
      logger.error('Error al cargar socio:', err);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const handleConfirmarPago = async () => {
    if (!socioSeleccionado) {
      setError('Debe seleccionar un socio');
      return;
    }

    // Si está en modo asignación, solo asigna el socio sin confirmar
    if (modoAsignacion && onAsignarSocio) {
      onAsignarSocio(socioSeleccionado);
      onClose();
      return;
    }

    // Si hay callback de cambiar socio (para match exacto/probable), usarlo
    // NO guardar keywords cuando solo se cambia el socio
    if (onCambiarSocio && (esProbableMatch || (match.nivel === 'A' || match.nivel === 'B'))) {
      onCambiarSocio(socioSeleccionado);
      onClose();
      return;
    }

    setConfirmando(true);
    setError(null);

    try {
      const supabase = createClient();
      // Solo guardar keywords si es sin match (guardarKeywords = true)
      const resultado = await confirmarPagoDesdeMovimiento(
        movimiento,
        supabase,
        socioSeleccionado,
        undefined, // cuponesPrecargados
        guardarKeywords // guardarKeywords - solo true para sin match
      );

      if (resultado.success) {
        onConfirmarPago?.();
        onClose();
      } else {
        setError(resultado.error || 'Error al confirmar pago');
      }
    } catch (err: any) {
      setError(err.message || 'Error al confirmar pago');
    } finally {
      setConfirmando(false);
    }
  };

  const esDuplicado = estado === 'ya_registrado';
  const esSinMatch = match.nivel === 'F' && !esDuplicado;
  const esProbableMatch = ['C', 'D', 'E'].includes(match.nivel);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Movimiento Bancario" size="xl">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Información del Movimiento */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Movimiento</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha</label>
              <p className="text-gray-900">{formatDate(movimiento.fecha_movimiento)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Monto</label>
              <p className="text-gray-900 font-semibold">{formatCurrency(movimiento.monto)}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Concepto Completo</label>
              <p className="text-gray-900">{movimiento.concepto_completo || '-'}</p>
            </div>
            {movimiento.referencia_bancaria && (
              <div>
                <label className="text-sm font-medium text-gray-700">Referencia Bancaria</label>
                <p className="text-gray-900">{movimiento.referencia_bancaria}</p>
              </div>
            )}
            {movimiento.cuit_cuil && (
              <div>
                <label className="text-sm font-medium text-gray-700">CUIT/CUIL Extraído</label>
                <p className="text-gray-900">{movimiento.cuit_cuil}</p>
              </div>
            )}
            {movimiento.dni && (
              <div>
                <label className="text-sm font-medium text-gray-700">DNI Extraído</label>
                <p className="text-gray-900">{movimiento.dni}</p>
              </div>
            )}
            {movimiento.apellido_transferente && (
              <div>
                <label className="text-sm font-medium text-gray-700">Apellido Transferente</label>
                <p className="text-gray-900">{movimiento.apellido_transferente}</p>
              </div>
            )}
            {movimiento.nombre_transferente && (
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre Transferente</label>
                <p className="text-gray-900">{movimiento.nombre_transferente}</p>
              </div>
            )}
            {movimientoId && (
              <div>
                <label className="text-sm font-medium text-gray-700">ID Movimiento</label>
                <p className="text-gray-900">#{movimientoId}</p>
              </div>
            )}
            {estado && (
              <div>
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <p className="text-gray-900">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    estado === 'procesado' ? 'bg-green-100 text-green-800' :
                    estado === 'ya_registrado' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {estado === 'procesado' ? 'Procesado' :
                     estado === 'ya_registrado' ? 'Ya Registrado' :
                     estado}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Información del Match */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado del Matching</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nivel de Match</label>
              <p className="text-gray-900">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  match.nivel === 'A' || match.nivel === 'B' ? 'bg-green-100 text-green-800' :
                  match.nivel === 'C' || match.nivel === 'D' ? 'bg-yellow-100 text-yellow-800' :
                  match.nivel === 'E' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Nivel {match.nivel}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confianza</label>
              <p className="text-gray-900">{match.porcentaje_confianza}%</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Razón</label>
              <p className="text-gray-900">{match.razon || '-'}</p>
            </div>
          </div>
        </div>

        {/* Información del Pago Asociado (si es duplicado) */}
        {esDuplicado && pagoAsociado && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pago Ya Registrado</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Pago ID</label>
                <p className="text-gray-900 font-medium">#{pagoAsociado.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de Pago</label>
                <p className="text-gray-900">{formatDate(pagoAsociado.fecha_pago)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Monto</label>
                <p className="text-gray-900">{formatCurrency(pagoAsociado.monto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Método de Pago</label>
                <p className="text-gray-900">{pagoAsociado.metodo_pago}</p>
              </div>
              {pagoAsociado.referencia_bancaria && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Referencia Bancaria</label>
                  <p className="text-gray-900">{pagoAsociado.referencia_bancaria}</p>
                </div>
              )}
              {pagoAsociado.socio && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Socio</label>
                  <p className="text-gray-900">
                    {pagoAsociado.socio.apellido}, {pagoAsociado.socio.nombre} (Socio #{pagoAsociado.socio.numero_socio})
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <a
                href={`/pagos/${pagoAsociado.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 text-sm font-medium underline"
              >
                Ver detalle del pago →
              </a>
            </div>
          </div>
        )}

        {/* Selector de Socio para Sin Match */}
        {esSinMatch && (
          <div className="border-2 border-yellow-400 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asignar Socio Manualmente</h3>
            <p className="text-sm text-gray-600 mb-4">
              Este movimiento no pudo ser asociado automáticamente. Por favor, seleccione el socio correspondiente.
            </p>
            <SelectorSocio
              onSocioSeleccionado={setSocioSeleccionado}
              socioIdInicial={socioSeleccionado}
            />
          </div>
        )}

        {/* Opción para Cambiar Socio en Probable Match */}
        {esProbableMatch && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Socio Sugerido (Confianza: {match.porcentaje_confianza}%)
                </h3>
                {socioData && (
                  <p className="font-medium text-gray-700 mt-1">
                    {socioData.apellido}, {socioData.nombre} (Socio #{socioData.numero_socio})
                  </p>
                )}
              </div>
              <button
                onClick={() => setMostrarCambioSocio(!mostrarCambioSocio)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {mostrarCambioSocio ? 'Cancelar' : 'Cambiar socio'}
              </button>
            </div>
            
            {mostrarCambioSocio && (
              <div className="mt-3 pt-3 border-t">
                <SelectorSocio
                  onSocioSeleccionado={setSocioSeleccionado}
                  socioIdInicial={socioSeleccionado}
                />
              </div>
            )}
          </div>
        )}

        {/* Botones de Acción */}
        {!esDuplicado && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarPago}
              disabled={!socioSeleccionado || confirmando}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modoAsignacion 
                ? (confirmando ? 'Asignando...' : 'Asignar Socio')
                : (confirmando ? 'Confirmando...' : 'Confirmar Pago')
              }
            </button>
          </div>
        )}

        {esDuplicado && (
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}



