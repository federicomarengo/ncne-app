'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cupon } from '@/app/types/cupones';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/app/utils/formatDate';
import { getMetodoPagoLabel } from '@/app/types/pagos';
import { logger } from '@/app/utils/logger';

interface EliminarCuponClientProps {
    cupon: Cupon;
}

interface PagoAsociado {
    id: number;
    pago_id: number;
    monto_aplicado: number;
    pago?: {
        id: number;
        fecha_pago: string | Date;
        monto: number;
        metodo_pago: string;
        numero_comprobante?: string | null;
        referencia_bancaria?: string | null;
        socio?: {
            apellido: string;
            nombre: string;
        };
    };
}

export default function EliminarCuponClient({ cupon }: EliminarCuponClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [loadingPagos, setLoadingPagos] = useState(true);

    useEffect(() => {
        cargarPagosAsociados();
    }, [cupon.id]);

    const cargarPagosAsociados = async () => {
        setLoadingPagos(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('pagos_cupones')
                .select(`
                    id,
                    pago_id,
                    monto_aplicado,
                    pago:pagos (
                        id,
                        fecha_pago,
                        monto,
                        metodo_pago,
                        numero_comprobante,
                        referencia_bancaria,
                        socio:socios (
                            apellido,
                            nombre
                        )
                    )
                `)
                .eq('cupon_id', cupon.id);

            if (error) {
                logger.error('Error al cargar pagos asociados:', error);
            } else {
                // Transformar los datos para manejar la estructura de Supabase
                const pagosTransformados: PagoAsociado[] = (data || []).map((item: any) => {
                    const pago = Array.isArray(item.pago) && item.pago.length > 0 
                        ? item.pago[0] 
                        : item.pago;
                    
                    const socio = pago?.socio 
                        ? (Array.isArray(pago.socio) && pago.socio.length > 0 
                            ? pago.socio[0] 
                            : pago.socio)
                        : undefined;

                    return {
                        id: item.id,
                        pago_id: item.pago_id,
                        monto_aplicado: item.monto_aplicado,
                        pago: pago ? {
                            id: pago.id,
                            fecha_pago: pago.fecha_pago,
                            monto: pago.monto,
                            metodo_pago: pago.metodo_pago,
                            numero_comprobante: pago.numero_comprobante,
                            referencia_bancaria: pago.referencia_bancaria,
                            socio: socio ? {
                                apellido: socio.apellido,
                                nombre: socio.nombre,
                            } : undefined,
                        } : undefined,
                    };
                });
                
                setPagosAsociados(pagosTransformados);
            }
        } catch (err) {
            logger.error('Error al cargar pagos asociados:', err);
        } finally {
            setLoadingPagos(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleDelete = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            // Verificar y eliminar relaciones en pagos_cupones
            if (pagosAsociados.length > 0) {
                // Eliminar relaciones pago-cupón
                const { error: deleteRelError } = await supabase
                    .from('pagos_cupones')
                    .delete()
                    .eq('cupon_id', cupon.id);

                if (deleteRelError) {
                    throw new Error('Error al eliminar relaciones con pagos');
                }

                // Recalcular estados de pagos afectados
                for (const pagoAsoc of pagosAsociados) {
                    if (pagoAsoc.pago) {
                        // Verificar si el pago tiene otros cupones asociados
                        const { data: otrosCupones } = await supabase
                            .from('pagos_cupones')
                            .select('cupon_id')
                            .eq('pago_id', pagoAsoc.pago.id)
                            .neq('cupon_id', cupon.id);

                        // Si el pago no tiene otros cupones, podría quedar como saldo a favor
                        // No modificamos el estado del pago aquí, solo limpiamos las relaciones
                    }
                }
            }

            // Eliminar items del cupón
            const { error: errorItems } = await supabase
                .from('items_cupon')
                .delete()
                .eq('cupon_id', cupon.id);

            if (errorItems) {
                logger.error('Error al eliminar items del cupón:', errorItems);
                // Continuar aunque falle, podría no tener items
            }

            // Eliminar el cupón usando la API
            const response = await fetch(`/api/cupones/${cupon.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar cupón');
            }

            router.push('/cupones');
        } catch (err: any) {
            setError(err.message || 'Error al eliminar el cupón');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/cupones/${cupon.id}`);
    };

    const getEstadoBadgeClass = (estado: string) => {
        switch (estado) {
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800';
            case 'pagado':
                return 'bg-green-100 text-green-800';
            case 'vencido':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatEstado = (estado: string) => {
        return estado.charAt(0).toUpperCase() + estado.slice(1);
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
                        Volver al Detalle del Cupón
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Eliminar Cupón</h1>
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
                                        ¿Estás seguro de que deseas eliminar este cupón?
                                    </p>
                                    <p className="text-sm text-red-700">
                                        Esta acción no se puede deshacer. Si el cupón tiene pagos asociados, se eliminarán las relaciones y los pagos quedarán disponibles para otros cupones.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información del Cupón
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Número de Cupón:</span>
                                    <span className="text-sm text-gray-900 font-medium">{cupon.numero_cupon}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">ID:</span>
                                    <span className="text-sm text-gray-900">{cupon.id}</span>
                                </div>
                                {cupon.socio && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">Socio:</span>
                                        <span className="text-sm text-gray-900">
                                            {`${cupon.socio.apellido}, ${cupon.socio.nombre}`} (Socio #{cupon.socio.numero_socio})
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Período:</span>
                                    <span className="text-sm text-gray-900">
                                        {String(cupon.periodo_mes).padStart(2, '0')}/{cupon.periodo_anio}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Fecha de Vencimiento:</span>
                                    <span className="text-sm text-gray-900">{formatDate(cupon.fecha_vencimiento)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Estado:</span>
                                    <span className="text-sm">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                                                cupon.estado
                                            )}`}
                                        >
                                            {formatEstado(cupon.estado)}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Monto Total:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Pagos Asociados */}
                        {loadingPagos ? (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500 text-center">Cargando pagos asociados...</p>
                            </div>
                        ) : pagosAsociados.length > 0 ? (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Pagos Asociados ({pagosAsociados.length})
                                </h3>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Advertencia:</strong> Este cupón tiene {pagosAsociados.length} pago(s) asociado(s). 
                                        Al eliminar el cupón, se eliminarán las relaciones y los pagos quedarán disponibles.
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Fecha de Pago
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Monto del Pago
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Monto Aplicado
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Método
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {pagosAsociados.map((pagoAsoc) => (
                                                <tr key={pagoAsoc.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {pagoAsoc.pago ? formatDate(pagoAsoc.pago.fecha_pago) : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {pagoAsoc.pago ? formatCurrency(parseFloat(pagoAsoc.pago.monto.toString())) : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                        {formatCurrency(parseFloat(pagoAsoc.monto_aplicado.toString()))}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {pagoAsoc.pago ? getMetodoPagoLabel(pagoAsoc.pago.metodo_pago as any) : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}

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
                                {loading ? 'Eliminando...' : 'Eliminar Cupón'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

