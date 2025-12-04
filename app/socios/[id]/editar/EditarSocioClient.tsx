'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Socio, EstadoSocio } from '@/app/types/socios';
import { createClient } from '@/utils/supabase/client';
import SocioKeywordsPanel from '@/app/components/panels/SocioKeywordsPanel';

interface EditarSocioClientProps {
    socio: Socio;
}

export default function EditarSocioClient({ socio }: EditarSocioClientProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        numero_socio: '',
        apellido: '',
        nombre: '',
        dni: '',
        cuit_cuil: '',
        email: '',
        telefono: '',
        direccion: '',
        localidad: '',
        fecha_nacimiento: '',
        estado: 'activo' as EstadoSocio,
        fecha_ingreso: '',
        observaciones: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData({
            numero_socio: socio.numero_socio?.toString() || '',
            apellido: socio.apellido || '',
            nombre: socio.nombre || '',
            dni: socio.dni || '',
            cuit_cuil: socio.cuit_cuil || '',
            email: socio.email || '',
            telefono: socio.telefono || '',
            direccion: socio.direccion || '',
            localidad: socio.localidad || '',
            fecha_nacimiento:
                socio.fecha_nacimiento && typeof socio.fecha_nacimiento === 'string'
                    ? socio.fecha_nacimiento.split('T')[0]
                    : socio.fecha_nacimiento
                        ? new Date(socio.fecha_nacimiento).toISOString().split('T')[0]
                        : '',
            estado: socio.estado || 'activo',
            fecha_ingreso:
                socio.fecha_ingreso && typeof socio.fecha_ingreso === 'string'
                    ? socio.fecha_ingreso.split('T')[0]
                    : socio.fecha_ingreso
                        ? new Date(socio.fecha_ingreso).toISOString().split('T')[0]
                        : '',
            observaciones: socio.observaciones || '',
        });
    }, [socio]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const updateData: any = {
                numero_socio: parseInt(formData.numero_socio),
                apellido: formData.apellido.trim(),
                nombre: formData.nombre.trim(),
                dni: formData.dni,
                email: formData.email || null,
                telefono: formData.telefono || null,
                direccion: formData.direccion || null,
                localidad: formData.localidad || null,
                estado: formData.estado,
                cuit_cuil: formData.cuit_cuil || null,
                observaciones: formData.observaciones || null,
            };

            if (formData.fecha_ingreso) {
                updateData.fecha_ingreso = formData.fecha_ingreso;
            }

            if (formData.fecha_nacimiento) {
                updateData.fecha_nacimiento = formData.fecha_nacimiento;
            }

            const { error: updateError } = await supabase
                .from('socios')
                .update(updateData)
                .eq('id', socio.id);

            if (updateError) {
                throw updateError;
            }

            router.push(`/socios/${socio.id}`);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el socio');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/socios/${socio.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
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
                    <h1 className="text-3xl font-bold text-gray-900">Editar Socio</h1>
                    <p className="text-gray-600 mt-1">Modificar información del socio</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Sección 1: Información Personal */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="numero_socio"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Número de Socio *
                                    </label>
                                    <input
                                        type="number"
                                        id="numero_socio"
                                        name="numero_socio"
                                        value={formData.numero_socio}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="apellido"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Apellido *
                                    </label>
                                    <input
                                        type="text"
                                        id="apellido"
                                        name="apellido"
                                        value={formData.apellido}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="nombre"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="dni"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        DNI *
                                    </label>
                                    <input
                                        type="text"
                                        id="dni"
                                        name="dni"
                                        value={formData.dni}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cuit_cuil"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        CUIT/CUIL
                                    </label>
                                    <input
                                        type="text"
                                        id="cuit_cuil"
                                        name="cuit_cuil"
                                        value={formData.cuit_cuil}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 2: Información de Contacto */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información de Contacto
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="telefono"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        id="telefono"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="direccion"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        id="direccion"
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="localidad"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Localidad
                                    </label>
                                    <input
                                        type="text"
                                        id="localidad"
                                        name="localidad"
                                        value={formData.localidad}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                        placeholder="Ciudad, Provincia"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 3: Estado y Membresía */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Estado y Membresía
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="estado"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Estado *
                                    </label>
                                    <select
                                        id="estado"
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="pendiente">Pendiente</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="fecha_ingreso"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Fecha de Ingreso
                                    </label>
                                    <input
                                        type="date"
                                        id="fecha_ingreso"
                                        name="fecha_ingreso"
                                        value={formData.fecha_ingreso}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="fecha_nacimiento"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Fecha de Nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        id="fecha_nacimiento"
                                        name="fecha_nacimiento"
                                        value={formData.fecha_nacimiento}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 4: Observaciones */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Observaciones
                            </h3>
                            <div>
                                <label
                                    htmlFor="observaciones"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Observaciones
                                </label>
                                <textarea
                                    id="observaciones"
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                                    placeholder="Observaciones adicionales sobre el socio..."
                                />
                            </div>
                        </div>

                        {/* Keywords Panel */}
                        <div className="mt-6">
                            <SocioKeywordsPanel socioId={socio.id} />
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
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
