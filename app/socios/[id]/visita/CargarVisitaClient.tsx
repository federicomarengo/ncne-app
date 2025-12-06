'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';

interface CargarVisitaClientProps {
    socio: Socio;
}

export default function CargarVisitaClient({ socio }: CargarVisitaClientProps) {
    const router = useRouter();
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [cantidadVisitantes, setCantidadVisitantes] = useState(1);
    const [costoUnitario, setCostoUnitario] = useState(4200);
    const [observaciones, setObservaciones] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resumenMes, setResumenMes] = useState({
        totalVisitas: 0,
        totalAcumulado: 0,
        pendientes: 0,
        conCupon: 0,
    });

    const montoTotal = cantidadVisitantes * costoUnitario;

    useEffect(() => {
        cargarCostoVisita();
        cargarResumenMes();
    }, []);

    useEffect(() => {
        cargarResumenMes();
    }, [fecha]);

    const cargarCostoVisita = async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('configuracion')
                .select('costo_visita')
                .eq('id', 1)
                .maybeSingle();

            if (error) {
                logger.error('Error al cargar costo de visita:', error);
                setCostoUnitario(4200);
            } else if (data?.costo_visita) {
                setCostoUnitario(parseFloat(data.costo_visita.toString()));
            } else {
                setCostoUnitario(4200);
            }
        } catch (err) {
            logger.error('Error al cargar costo de visita:', err);
            setCostoUnitario(4200);
        }
    };

    const cargarResumenMes = async () => {
        try {
            const supabase = createClient();
            const fechaSeleccionada = new Date(fecha);
            const primerDiaMes = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1);
            const ultimoDiaMes = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth() + 1, 0);

            const { data: visitas, error } = await supabase
                .from('visitas')
                .select('monto_total, estado')
                .eq('socio_id', socio.id)
                .gte('fecha_visita', primerDiaMes.toISOString().split('T')[0])
                .lte('fecha_visita', ultimoDiaMes.toISOString().split('T')[0]);

            if (error) {
                logger.error('Error al cargar resumen del mes:', error);
            } else {
                const totalVisitas = visitas?.length || 0;
                const totalAcumulado = visitas?.reduce((sum, v) => sum + parseFloat(v.monto_total.toString()), 0) || 0;
                const pendientes = visitas?.filter(v => v.estado === 'pendiente').length || 0;
                const conCupon = visitas?.filter(v => v.estado === 'con_cupon_generado').length || 0;

                setResumenMes({
                    totalVisitas,
                    totalAcumulado,
                    pendientes,
                    conCupon,
                });
            }
        } catch (err) {
            logger.error('Error al cargar resumen del mes:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        try {
            if (!fecha) {
                throw new Error('La fecha de visita es obligatoria');
            }

            if (cantidadVisitantes < 1) {
                throw new Error('La cantidad de visitantes debe ser mayor a 0');
            }

            const supabase = createClient();

            const { error: insertError } = await supabase.from('visitas').insert({
                socio_id: socio.id,
                fecha_visita: fecha,
                cantidad_visitantes: cantidadVisitantes,
                costo_unitario: costoUnitario,
                monto_total: montoTotal,
                estado: 'pendiente',
                observaciones: observaciones || null,
            });

            if (insertError) {
                throw insertError;
            }

            router.push(`/socios/${socio.id}`);
        } catch (err: any) {
            setError(err.message || 'Error al cargar la visita');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/socios/${socio.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={handleCancel}
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
                        Volver a Detalle del Socio
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Cargar Visita</h1>
                    <p className="text-gray-600 mt-1">Registrar nueva visita del socio</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Información del Socio */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información del Socio
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Socio:</p>
                                <p className="font-semibold text-gray-900">
                                    {getNombreCompleto(socio)}
                                </p>
                                <p className="text-sm text-gray-600">DNI: {socio.dni}</p>
                            </div>
                        </div>

                        {/* Detalles de la Visita */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Detalles de la Visita
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="fecha"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Fecha de Visita *
                                    </label>
                                    <input
                                        type="date"
                                        id="fecha"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cantidad_visitantes"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Cantidad de Visitantes *
                                    </label>
                                    <input
                                        type="number"
                                        id="cantidad_visitantes"
                                        min="1"
                                        value={cantidadVisitantes}
                                        onChange={(e) => setCantidadVisitantes(parseInt(e.target.value) || 1)}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="costo_unitario"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Costo Unitario *
                                    </label>
                                    <input
                                        type="number"
                                        id="costo_unitario"
                                        min="0"
                                        step="0.01"
                                        value={costoUnitario}
                                        onChange={(e) => setCostoUnitario(parseFloat(e.target.value) || 0)}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Valor obtenido de la configuración del sistema
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="monto_total"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Monto Total
                                    </label>
                                    <input
                                        type="text"
                                        id="monto_total"
                                        value={`$${montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        readOnly
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="observaciones"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Observaciones
                                    </label>
                                    <textarea
                                        id="observaciones"
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                                        placeholder="Observaciones adicionales sobre la visita..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Resumen del Mes */}
                        {resumenMes.totalVisitas > 0 && (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Resumen del Mes
                                </h3>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Total de visitas del mes:</span>
                                            <span className="font-semibold text-gray-900 ml-2">{resumenMes.totalVisitas}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Total acumulado:</span>
                                            <span className="font-semibold text-gray-900 ml-2">
                                                ${resumenMes.totalAcumulado.toLocaleString('es-AR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Visitas pendientes:</span>
                                            <span className="font-semibold text-yellow-700 ml-2">{resumenMes.pendientes}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Con cupón generado:</span>
                                            <span className="font-semibold text-green-700 ml-2">{resumenMes.conCupon}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
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
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {loading ? 'Cargando...' : 'Cargar Visita'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
