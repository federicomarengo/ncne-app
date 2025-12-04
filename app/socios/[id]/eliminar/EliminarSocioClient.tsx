'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Socio } from '@/app/types/socios';
import { createClient } from '@/utils/supabase/client';

interface EliminarSocioClientProps {
    socio: Socio;
}

export default function EliminarSocioClient({ socio }: EliminarSocioClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: deleteError } = await supabase
                .from('socios')
                .delete()
                .eq('id', socio.id);

            if (deleteError) {
                throw deleteError;
            }

            router.push('/socios');
        } catch (err: any) {
            setError(err.message || 'Error al eliminar el socio');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/socios/${socio.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
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
                    <h1 className="text-3xl font-bold text-gray-900">Eliminar Socio</h1>
                    <p className="text-gray-600 mt-1">Confirmar eliminación del socio</p>
                </div>

                {/* Confirmation Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="space-y-6">
                        {/* Warning */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-semibold text-red-900 mb-1">
                                        ¡Advertencia! Esta acción no se puede deshacer
                                    </h3>
                                    <p className="text-sm text-red-700">
                                        Está a punto de eliminar permanentemente este socio. Todos los datos asociados se perderán.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Socio Info */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4">
                                Información del Socio a Eliminar
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Número de Socio:</span>
                                    <span className="text-sm text-gray-900">{socio.numero_socio}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Nombre Completo:</span>
                                    <span className="text-sm text-gray-900">{socio.apellido}, {socio.nombre}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">DNI:</span>
                                    <span className="text-sm text-gray-900">{socio.dni}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Email:</span>
                                    <span className="text-sm text-gray-900">{socio.email || '-'}</span>
                                </div>
                            </div>
                        </div>

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
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {loading ? 'Eliminando...' : 'Confirmar Eliminación'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
