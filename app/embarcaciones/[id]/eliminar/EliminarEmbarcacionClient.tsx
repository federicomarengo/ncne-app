'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Embarcacion } from '@/app/types/embarcaciones';
import { createClient } from '@/utils/supabase/client';
import { getNombreCompleto } from '@/app/types/socios';

interface EliminarEmbarcacionClientProps {
    embarcacion: Embarcacion;
}

export default function EliminarEmbarcacionClient({ embarcacion }: EliminarEmbarcacionClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: deleteError } = await supabase
                .from('embarcaciones')
                .delete()
                .eq('id', embarcacion.id);

            if (deleteError) {
                throw deleteError;
            }

            router.push('/embarcaciones');
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la embarcación');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/embarcaciones/${embarcacion.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
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
                        Volver al Detalle
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Eliminar Embarcación</h1>
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
                                        ¿Estás seguro de que deseas eliminar esta embarcación?
                                    </p>
                                    <p className="text-sm text-red-700">
                                        Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a la embarcación.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información de la Embarcación
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Embarcación:</p>
                                <p className="font-semibold text-gray-900">
                                    {embarcacion.nombre}
                                </p>
                                {embarcacion.matricula && (
                                    <p className="text-sm text-gray-600">Matrícula: {embarcacion.matricula}</p>
                                )}
                                {embarcacion.socio && (
                                    <p className="text-sm text-gray-600">
                                        Socio: {embarcacion.socio.numero_socio} - {getNombreCompleto(embarcacion.socio as any)}
                                    </p>
                                )}
                            </div>
                        </div>

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
                                {loading ? 'Eliminando...' : 'Eliminar Embarcación'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}





