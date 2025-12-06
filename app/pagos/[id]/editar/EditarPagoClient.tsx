'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pago, MetodoPago, METODOS_PAGO } from '@/app/types/pagos';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { Cupon } from '@/app/types/cupones';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';

interface EditarPagoClientProps {
  pago: Pago;
}

interface PagoCupon {
  id: number;
  pago_id: number;
  cupon_id: number;
  monto_aplicado: number;
  cupon?: Cupon;
}

export default function EditarPagoClient({ pago }: EditarPagoClientProps) {
  const router = useRouter();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [cuponesDisponibles, setCuponesDisponibles] = useState<Cupon[]>([]);
  const [cuponesAsociados, setCuponesAsociados] = useState<PagoCupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [loadingCupones, setLoadingCupones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregandoCupon, setAgregandoCupon] = useState(false);
  const [editandoCupon, setEditandoCupon] = useState<PagoCupon | null>(null);
  const [formData, setFormData] = useState({
    socio_id: pago.socio_id.toString(),
    fecha_pago: pago.fecha_pago ? new Date(pago.fecha_pago).toISOString().split('T')[0] : '',
    monto: pago.monto.toString(),
    metodo_pago: pago.metodo_pago,
    numero_comprobante: pago.numero_comprobante || '',
    referencia_bancaria: pago.referencia_bancaria || '',
    estado_conciliacion: pago.estado_conciliacion,
    fecha_conciliacion: pago.fecha_conciliacion ? new Date(pago.fecha_conciliacion).toISOString().split('T')[0] : '',
    observaciones: pago.observaciones || '',
  });
  const [cuponFormData, setCuponFormData] = useState({
    cupon_id: '',
    monto_aplicado: '',
  });

  useEffect(() => {
    cargarSocios();
    cargarCuponesAsociados();
  }, []);

  useEffect(() => {
    if (formData.socio_id) {
      cargarCuponesPendientes(parseInt(formData.socio_id));
    }
  }, [formData.socio_id]);

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
        logger.error('Error al cargar socios:', error);
      } else {
        setSocios((data as Socio[]) || []);
      }
    } catch (err) {
      logger.error('Error al cargar socios:', err);
    } finally {
      setLoadingSocios(false);
    }
  };

  const cargarCuponesPendientes = async (socioId: number) => {
    setLoadingCupones(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cupones')
        .select('*')
        .eq('socio_id', socioId)
        .in('estado', ['pendiente', 'vencido'])
        .order('fecha_vencimiento', { ascending: true });

      if (error) {
        logger.error('Error al cargar cupones:', error);
        setCuponesDisponibles([]);
      } else {
        setCuponesDisponibles((data as Cupon[]) || []);
      }
    } catch (err) {
      logger.error('Error al cargar cupones:', err);
    } finally {
      setLoadingCupones(false);
    }
  };

  const cargarCuponesAsociados = async () => {
    try {
      const response = await fetch(`/api/pagos/${pago.id}/cupones`);
      if (!response.ok) {
        throw new Error('Error al cargar cupones asociados');
      }
      const data = await response.json();
      setCuponesAsociados(data.cupones || []);
    } catch (err) {
      logger.error('Error al cargar cupones asociados:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleCuponChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCuponFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // Si cambia el cupón, establecer el monto máximo
      if (name === 'cupon_id' && value) {
        const cupon = cuponesDisponibles.find(c => c.id === parseInt(value));
        if (cupon) {
          newData.monto_aplicado = cupon.monto_total.toString();
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar fecha
      const fechaPagoDate = new Date(formData.fecha_pago);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (fechaPagoDate > hoy) {
        throw new Error('La fecha de pago no puede ser futura');
      }

      // Validar monto
      const montoNum = parseFloat(formData.monto);
      if (montoNum <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Validar que el monto total coincida con la suma de cupones asociados
      const totalCupones = cuponesAsociados.reduce(
        (sum, pc) => sum + parseFloat(pc.monto_aplicado.toString()),
        0
      );

      if (Math.abs(totalCupones - montoNum) > 0.01 && cuponesAsociados.length > 0) {
        const continuar = window.confirm(
          `El monto del pago (${formatCurrency(montoNum)}) no coincide con la suma de cupones asociados (${formatCurrency(totalCupones)}). ¿Desea continuar?`
        );
        if (!continuar) {
          setLoading(false);
          return;
        }
      }

      const updateData: any = {
        socio_id: parseInt(formData.socio_id),
        fecha_pago: formData.fecha_pago,
        monto: montoNum,
        metodo_pago: formData.metodo_pago,
        numero_comprobante: formData.numero_comprobante.trim() || null,
        referencia_bancaria: formData.referencia_bancaria.trim() || null,
        estado_conciliacion: formData.estado_conciliacion,
        fecha_conciliacion: formData.fecha_conciliacion || null,
        observaciones: formData.observaciones.trim() || null,
      };

      const response = await fetch(`/api/pagos/${pago.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar pago');
      }

      router.push(`/pagos/${pago.id}`);
      router.refresh();
    } catch (err: any) {
      logger.error('Error al actualizar pago:', err);
      setError(err.message || 'Error al actualizar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarCupon = () => {
    setAgregandoCupon(true);
    setEditandoCupon(null);
    setCuponFormData({
      cupon_id: '',
      monto_aplicado: '',
    });
  };

  const handleEditarCupon = (pagoCupon: PagoCupon) => {
    setEditandoCupon(pagoCupon);
    setAgregandoCupon(false);
    setCuponFormData({
      cupon_id: pagoCupon.cupon_id.toString(),
      monto_aplicado: pagoCupon.monto_aplicado.toString(),
    });
  };

  const handleGuardarCupon = async () => {
    if (!cuponFormData.cupon_id) {
      setError('Debe seleccionar un cupón');
      return;
    }

    const montoAplicado = parseFloat(cuponFormData.monto_aplicado);
    if (montoAplicado <= 0) {
      setError('El monto aplicado debe ser mayor a 0');
      return;
    }

    try {
      let response;
      if (editandoCupon) {
        // Actualizar asociación existente
        response = await fetch(`/api/pagos/${pago.id}/cupones`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pago_cupon_id: editandoCupon.id,
            monto_aplicado: montoAplicado,
          }),
        });
      } else {
        // Crear nueva asociación
        response = await fetch(`/api/pagos/${pago.id}/cupones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cupon_id: parseInt(cuponFormData.cupon_id),
            monto_aplicado: montoAplicado,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar asociación con cupón');
      }

      await cargarCuponesAsociados();
      setAgregandoCupon(false);
      setEditandoCupon(null);
      setCuponFormData({
        cupon_id: '',
        monto_aplicado: '',
      });
    } catch (err: any) {
      logger.error('Error al guardar cupón:', err);
      setError(err.message || 'Error al guardar asociación con cupón');
    }
  };

  const handleEliminarCupon = async (pagoCuponId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta asociación con el cupón?')) {
      return;
    }

    try {
      const response = await fetch(`/api/pagos/${pago.id}/cupones?pago_cupon_id=${pagoCuponId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar asociación');
      }

      await cargarCuponesAsociados();
    } catch (err: any) {
      logger.error('Error al eliminar cupón:', err);
      setError(err.message || 'Error al eliminar asociación');
    }
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

  const montoTotalCupones = cuponesAsociados.reduce(
    (sum, pc) => sum + parseFloat(pc.monto_aplicado.toString()),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/pagos/${pago.id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Detalle
          </button>
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold text-gray-900">Editar Pago</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Pago */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Información del Pago
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Socio <span className="text-red-500">*</span>
                </label>
                {loadingSocios ? (
                  <p className="text-sm text-gray-500">Cargando...</p>
                ) : (
                  <select
                    name="socio_id"
                    value={formData.socio_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar socio</option>
                    {socios.map((socio) => (
                      <option key={socio.id} value={socio.id}>
                        {getNombreCompleto(socio)} (Socio #{socio.numero_socio})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Pago <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha_pago"
                  value={formData.fecha_pago}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago <span className="text-red-500">*</span>
                </label>
                <select
                  name="metodo_pago"
                  value={formData.metodo_pago}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {METODOS_PAGO.map((metodo) => (
                    <option key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Comprobante
                </label>
                <input
                  type="text"
                  name="numero_comprobante"
                  value={formData.numero_comprobante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia Bancaria
                </label>
                <input
                  type="text"
                  name="referencia_bancaria"
                  value={formData.referencia_bancaria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado de Conciliación
                </label>
                <select
                  name="estado_conciliacion"
                  value={formData.estado_conciliacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="conciliado">Conciliado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Conciliación
                </label>
                <input
                  type="date"
                  name="fecha_conciliacion"
                  value={formData.fecha_conciliacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Cupones Asociados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Cupones Asociados
              </h2>
              <button
                type="button"
                onClick={handleAgregarCupon}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Cupón
              </button>
            </div>

            {(agregandoCupon || editandoCupon) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  {editandoCupon ? 'Editar Asociación con Cupón' : 'Agregar Cupón'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cupón <span className="text-red-500">*</span>
                    </label>
                    {loadingCupones ? (
                      <p className="text-sm text-gray-500">Cargando...</p>
                    ) : (
                      <select
                        name="cupon_id"
                        value={cuponFormData.cupon_id}
                        onChange={handleCuponChange}
                        required
                        disabled={!!editandoCupon}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">Seleccionar cupón</option>
                        {cuponesDisponibles.map((cupon) => (
                          <option key={cupon.id} value={cupon.id}>
                            {cupon.numero_cupon} - {formatCurrency(parseFloat(cupon.monto_total.toString()))} - {cupon.estado}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Aplicado <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="monto_aplicado"
                      value={cuponFormData.monto_aplicado}
                      onChange={handleCuponChange}
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleGuardarCupon}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgregandoCupon(false);
                      setEditandoCupon(null);
                      setCuponFormData({
                        cupon_id: '',
                        monto_aplicado: '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {cuponesAsociados.length > 0 ? (
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
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cuponesAsociados.map((pagoCupon) => (
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
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditarCupon(pagoCupon)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarCupon(pagoCupon.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Total Aplicado:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {formatCurrency(montoTotalCupones)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay cupones asociados a este pago
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push(`/pagos/${pago.id}`)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

