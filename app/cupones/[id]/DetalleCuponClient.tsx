'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cupon, ItemCupon } from '@/app/types/cupones';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';
import { getMetodoPagoLabel } from '@/app/types/pagos';
import VistaPreviewEmail from '@/app/components/emails/VistaPreviewEmail';
import { logger } from '@/app/utils/logger';

interface DetalleCuponClientProps {
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

export default function DetalleCuponClient({ cupon }: DetalleCuponClientProps) {
    const router = useRouter();
    const [items, setItems] = useState<ItemCupon[]>([]);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPagos, setLoadingPagos] = useState(false);
    const [mostrarPreview, setMostrarPreview] = useState(false);
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [mensajeEmail, setMensajeEmail] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

    useEffect(() => {
        cargarItems();
        cargarPagosAsociados();
    }, [cupon]);

    const cargarItems = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('items_cupon')
                .select('*')
                .eq('cupon_id', cupon.id)
                .order('id', { ascending: true });

            if (error) {
                logger.error('Error al cargar items:', error);
            } else {
                setItems(data || []);
            }
        } catch (err) {
            logger.error('Error al cargar items:', err);
        } finally {
            setLoading(false);
        }
    };

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
                .eq('cupon_id', cupon.id)
                .order('pago_id', { ascending: false });

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

    const handleVerPreview = () => {
        setMostrarPreview(true);
    };

    const handleEnviarEmail = async () => {
        setEnviandoEmail(true);
        setMensajeEmail(null);

        try {
            const response = await fetch('/api/emails/enviar-cupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cupon_id: cupon.id }),
            });

            const data = await response.json();

            if (data.success) {
                setMensajeEmail({
                    tipo: 'success',
                    texto: data.mensaje || 'Email enviado exitosamente',
                });
            } else {
                setMensajeEmail({
                    tipo: 'error',
                    texto: data.error || 'Error al enviar email',
                });
            }
        } catch (error: any) {
            setMensajeEmail({
                tipo: 'error',
                texto: 'Error al enviar email: ' + error.message,
            });
        } finally {
            setEnviandoEmail(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/cupones')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Volver a Cupones
                    </button>
                    <div className="flex justify-between items-start">
                        <h1 className="text-3xl font-bold text-gray-900">Detalle del Cupón {cupon.numero_cupon}</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleVerPreview}
                                disabled={enviandoEmail}
                                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Vista Previa
                            </button>
                            <button
                                onClick={handleEnviarEmail}
                                disabled={enviandoEmail}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                            >
                                {enviandoEmail ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Enviar por Email
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => router.push(`/cupones/${cupon.id}/editar`)}
                                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                            </button>
                            <button
                                onClick={() => router.push(`/cupones/${cupon.id}/eliminar`)}
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

                {/* Mensaje de Email */}
                {mensajeEmail && (
                    <div className={`mb-6 px-4 py-3 rounded-lg ${
                        mensajeEmail.tipo === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {mensajeEmail.texto}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información del Cupón
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de Cupón
                                    </label>
                                    <p className="text-sm text-gray-900 font-medium">
                                        {cupon.numero_cupon}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado
                                    </label>
                                    <span
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                                            cupon.estado
                                        )}`}
                                    >
                                        {formatEstado(cupon.estado)}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Socio
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {cupon.socio ? `${cupon.socio.apellido}, ${cupon.socio.nombre}` : 'N/A'}
                                        {cupon.socio && (
                                            <span className="text-gray-500 ml-2">
                                                (Socio #{cupon.socio.numero_socio})
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Período
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {cupon.periodo_mes}/{cupon.periodo_anio}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Emisión
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(cupon.fecha_emision)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Vencimiento
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(cupon.fecha_vencimiento)}
                                    </p>
                                </div>
                                {cupon.fecha_pago && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha de Pago
                                        </label>
                                        <p className="text-sm text-gray-900">
                                            {formatDate(cupon.fecha_pago)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Desglose de Montos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cuota Social
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_cuota_social.toString()))}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amarra
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_amarra.toString()))}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Visitas
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_visitas.toString()))}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Otros Cargos
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_otros_cargos.toString()))}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Intereses
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_intereses.toString()))}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                                        Monto Total
                                    </label>
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500">Cargando items...</p>
                            </div>
                        ) : items.length > 0 ? (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Items del Cupón
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Descripción
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Cantidad
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Precio Unitario
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Subtotal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                        {item.descripcion}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {item.cantidad}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {item.precio_unitario
                                                            ? formatCurrency(parseFloat(item.precio_unitario.toString()))
                                                            : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                                        {formatCurrency(parseFloat(item.subtotal.toString()))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}

                        {/* Pagos Asociados */}
                        {loadingPagos ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500">Cargando pagos asociados...</p>
                            </div>
                        ) : pagosAsociados.length > 0 ? (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Pagos Asociados ({pagosAsociados.length})
                                </h3>
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
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Acción
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {pagosAsociados.map((pagoAsoc) => (
                                                <tr key={pagoAsoc.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {pagoAsoc.pago ? formatDate(pagoAsoc.pago.fecha_pago) : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {pagoAsoc.pago ? formatCurrency(parseFloat(pagoAsoc.pago.monto.toString())) : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(parseFloat(pagoAsoc.monto_aplicado.toString()))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {pagoAsoc.pago ? getMetodoPagoLabel(pagoAsoc.pago.metodo_pago as any) : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {pagoAsoc.pago?.id && (
                                                            <button
                                                                onClick={() => router.push(`/pagos/${pagoAsoc.pago!.id}`)}
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
                        ) : (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Pagos Asociados
                                </h3>
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No hay pagos asociados a este cupón
                                </p>
                            </div>
                        )}

                        {cupon.observaciones && (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Observaciones
                                </h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {cupon.observaciones}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Preview */}
            {mostrarPreview && (
                <VistaPreviewEmail
                    cuponId={cupon.id}
                    onClose={() => setMostrarPreview(false)}
                />
            )}
        </div>
    );
}

