'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { getNombreCompleto } from '@/app/types/socios';

interface DetalleEmbarcacionClientProps {
    embarcacion: Embarcacion;
}

export default function DetalleEmbarcacionClient({ embarcacion }: DetalleEmbarcacionClientProps) {
    const router = useRouter();

    const getTipoLabel = (tipo: string) => {
        const tipoObj = TIPOS_EMBARCACION.find((t) => t.value === tipo);
        return tipoObj?.label || tipo;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/embarcaciones')}
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
                        Volver a Embarcaciones
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{embarcacion.nombre}</h1>
                            {embarcacion.matricula && (
                                <p className="text-gray-600 mt-1">Matrícula: {embarcacion.matricula}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push(`/embarcaciones/${embarcacion.id}/editar`)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => router.push(`/embarcaciones/${embarcacion.id}/eliminar`)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="space-y-6">
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
                    </div>
                </div>
            </div>
        </div>
    );
}





