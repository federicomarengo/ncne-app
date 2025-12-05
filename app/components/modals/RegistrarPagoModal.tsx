'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { Cupon } from '@/app/types/cupones';
import { MetodoPago, METODOS_PAGO } from '@/app/types/pagos';
import { createClient } from '@/utils/supabase/client';
import { aplicarPagoACupones } from '@/app/utils/aplicarPagoACupones';
import { calcularSaldoPendienteCupon } from '@/app/utils/calcularSaldoPendienteCupon';

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegistrarPagoModal({
  isOpen,
  onClose,
  onSuccess,
}: RegistrarPagoModalProps) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [socioId, setSocioId] = useState('');
  const [cuponId, setCuponId] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia_bancaria');
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [loadingCupones, setLoadingCupones] = useState(false);
  const [montoMaximo, setMontoMaximo] = useState(0);

  useEffect(() => {
    if (isOpen) {
      cargarSocios();
      setSocioId('');
      setCuponId('');
      setMonto('');
      setFechaPago(new Date().toISOString().split('T')[0]);
      setNumeroComprobante('');
      setObservaciones('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (socioId) {
      cargarCuponesPendientes(parseInt(socioId));
    } else {
      setCupones([]);
      setCuponId('');
      setMontoMaximo(0);
    }
  }, [socioId]);

  useEffect(() => {
    if (cuponId) {
      const cupon = cupones.find((c) => c.id === parseInt(cuponId));
      if (cupon) {
        setMontoMaximo(parseFloat(cupon.monto_total.toString()));
        setMonto(cupon.monto_total.toString());
      }
    } else {
      setMontoMaximo(0);
      setMonto('');
    }
  }, [cuponId, cupones]);

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
        console.error('Error al cargar socios:', error);
      } else {
        setSocios((data as Socio[]) || []);
      }
    } catch (err) {
      console.error('Error al cargar socios:', err);
    } finally {
      setLoadingSocios(false);
    }
  };

  const cargarCuponesPendientes = async (socioIdNum: number) => {
    setLoadingCupones(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cupones')
        .select('*')
        .eq('socio_id', socioIdNum)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true });

      if (error) {
        console.error('Error al cargar cupones:', error);
        setCupones([]);
      } else {
        setCupones((data as Cupon[]) || []);
      }
    } catch (err) {
      console.error('Error al cargar cupones:', err);
      setCupones([]);
    } finally {
      setLoadingCupones(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!socioId) {
      setError('Debe seleccionar un socio');
      return;
    }

    // El cupón es opcional - si no se selecciona, se aplica automáticamente a todos los pendientes

    if (!monto || parseFloat(monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    const montoNum = parseFloat(monto);
    if (montoNum > montoMaximo) {
      setError(`El monto no puede exceder ${montoMaximo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`);
      return;
    }

    const fechaPagoDate = new Date(fechaPago);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fechaPagoDate > hoy) {
      setError('La fecha de pago no puede ser futura');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Crear el pago
      const { data: pago, error: errorPago } = await supabase
        .from('pagos')
        .insert({
          socio_id: parseInt(socioId),
          fecha_pago: fechaPago,
          monto: montoNum,
          metodo_pago: metodoPago,
          numero_comprobante: numeroComprobante || null,
          observaciones: observaciones || null,
          estado_conciliacion: 'pendiente',
        })
        .select()
        .single();

      if (errorPago) {
        throw new Error(errorPago.message || 'Error al crear el pago');
      }

      // Aplicar pago a cupones usando la nueva función
      if (cuponId) {
        // Si hay cupón seleccionado, aplicar primero a ese
        const saldoPendiente = await calcularSaldoPendienteCupon(parseInt(cuponId), supabase);
        const montoAAplicarACuponSeleccionado = Math.min(montoNum, saldoPendiente);
        
        if (montoAAplicarACuponSeleccionado > 0) {
          const { error: errorPagoCupon } = await supabase
            .from('pagos_cupones')
            .insert({
              pago_id: pago.id,
              cupon_id: parseInt(cuponId),
              monto_aplicado: montoAAplicarACuponSeleccionado,
            });

          if (errorPagoCupon) {
            console.error('Error al crear relación pago-cupón:', errorPagoCupon);
          }

          // Si el cupón queda completamente pagado, marcarlo
          if (montoAAplicarACuponSeleccionado >= saldoPendiente) {
            const { error: errorCupon } = await supabase
              .from('cupones')
              .update({
                estado: 'pagado',
                fecha_pago: fechaPago,
              })
              .eq('id', parseInt(cuponId));

            if (errorCupon) {
              console.error('Error al actualizar cupón:', errorCupon);
            }
          }
        }

        // Si queda excedente, aplicar a otros cupones
        const excedente = montoNum - montoAAplicarACuponSeleccionado;
        if (excedente > 0) {
          await aplicarPagoACupones(pago.id, parseInt(socioId), excedente, fechaPago, supabase);
        }
      } else {
        // Si no hay cupón seleccionado, aplicar automáticamente a todos los pendientes
        await aplicarPagoACupones(
          pago.id,
          parseInt(socioId),
          montoNum,
          fechaPago,
          supabase
        );
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Socio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Socio <span className="text-red-500">*</span>
          </label>
          <select
            value={socioId}
            onChange={(e) => setSocioId(e.target.value)}
            disabled={loadingSocios}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Seleccione un socio</option>
            {socios.map((socio) => (
              <option key={socio.id} value={socio.id}>
                {getNombreCompleto(socio)} (Socio #{socio.numero_socio})
              </option>
            ))}
          </select>
        </div>

        {/* Cupón */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cupón a Pagar (Opcional)
          </label>
          <select
            value={cuponId}
            onChange={(e) => setCuponId(e.target.value)}
            disabled={!socioId || loadingCupones}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {!socioId
                ? 'Seleccione un socio primero'
                : loadingCupones
                ? 'Cargando cupones...'
                : cupones.length === 0
                ? 'No hay cupones pendientes (se aplicará automáticamente)'
                : 'Seleccione un cupón o deje vacío para aplicar automáticamente'}
            </option>
            {cupones.map((cupon) => (
              <option key={cupon.id} value={cupon.id}>
                {cupon.numero_cupon} - Vence: {new Date(cupon.fecha_vencimiento).toLocaleDateString('es-AR')} -{' '}
                {formatCurrency(parseFloat(cupon.monto_total.toString()))}
              </option>
            ))}
          </select>
          {cuponId && montoMaximo > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Monto máximo: {formatCurrency(montoMaximo)}
            </p>
          )}
        </div>

        {/* Método de Pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Método de Pago <span className="text-red-500">*</span>
          </label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {METODOS_PAGO.map((metodo) => (
              <option key={metodo.value} value={metodo.value}>
                {metodo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={montoMaximo}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            disabled={!cuponId}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="0.00"
          />
        </div>

        {/* Fecha de Pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Pago <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Número de Comprobante */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Comprobante
          </label>
          <input
            type="text"
            value={numeroComprobante}
            onChange={(e) => setNumeroComprobante(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Opcional"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Opcional"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}







