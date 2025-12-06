'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoSocio } from '@/app/types/socios';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';

export default function NuevoSocioPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
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
        fecha_ingreso: new Date().toISOString().split('T')[0],
        observaciones: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validating, setValidating] = useState(false);
    const [numeroSocio, setNumeroSocio] = useState<number | null>(null);

    // Obtener siguiente número de socio disponible
    useEffect(() => {
        obtenerSiguienteNumeroSocio();
    }, []);

    const obtenerSiguienteNumeroSocio = async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('socios')
                .select('numero_socio')
                .order('numero_socio', { ascending: false })
                .limit(1);

            if (error) {
                logger.error('Error al obtener número de socio:', error);
                setNumeroSocio(1);
                return;
            }

            if (data && data.length > 0) {
                setNumeroSocio(data[0].numero_socio + 1);
            } else {
                setNumeroSocio(1);
            }
        } catch (err) {
            logger.error('Error al obtener número de socio:', err);
            setNumeroSocio(1);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Limpiar error cuando el usuario empieza a escribir
        if (error) {
            setError(null);
        }
    };

    // Validar DNI: 7-8 dígitos numéricos
    const validarDNI = (dni: string): boolean => {
        const dniLimpio = dni.replace(/\D/g, '');
        return dniLimpio.length >= 7 && dniLimpio.length <= 8;
    };

    // Validar email: formato válido
    const validarEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Validar que DNI sea único
    const validarDNIUnico = async (dni: string): Promise<boolean> => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('socios')
                .select('id')
                .eq('dni', dni.replace(/\D/g, ''))
                .limit(1);

            if (error) {
                logger.error('Error al validar DNI:', error);
                return false;
            }

            return !data || data.length === 0;
        } catch (err) {
            logger.error('Error al validar DNI:', err);
            return false;
        }
    };

    // Validar que email sea único
    const validarEmailUnico = async (email: string): Promise<boolean> => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('socios')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .limit(1);

            if (error) {
                logger.error('Error al validar email:', error);
                return false;
            }

            return !data || data.length === 0;
        } catch (err) {
            logger.error('Error al validar email:', err);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);
        setValidating(true);

        try {
            // Validaciones según especificación
            const dniLimpio = formData.dni.replace(/\D/g, '');

            // 1. Validar DNI: obligatorio, numérico, 7-8 dígitos
            if (!formData.dni || !validarDNI(formData.dni)) {
                throw new Error('El DNI debe tener entre 7 y 8 dígitos numéricos');
            }

            // 2. Validar que DNI sea único
            const dniUnico = await validarDNIUnico(formData.dni);
            if (!dniUnico) {
                throw new Error('Ya existe un socio con este DNI');
            }

            // 3. Validar apellido: obligatorio
            if (!formData.apellido || formData.apellido.trim().length === 0) {
                throw new Error('El apellido es obligatorio');
            }

            // 4. Validar nombre: obligatorio
            if (!formData.nombre || formData.nombre.trim().length === 0) {
                throw new Error('El nombre es obligatorio');
            }

            // 5. Validar email: obligatorio, formato válido
            if (!formData.email || !validarEmail(formData.email)) {
                throw new Error('El email debe tener un formato válido');
            }

            // 6. Validar que email sea único
            const emailUnico = await validarEmailUnico(formData.email);
            if (!emailUnico) {
                throw new Error('Ya existe un socio con este email');
            }

            // 7. Validar teléfono: obligatorio
            if (!formData.telefono || formData.telefono.trim().length === 0) {
                throw new Error('El teléfono es obligatorio');
            }

            setValidating(false);

            // Crear el socio
            const supabase = createClient();
            const insertData: any = {
                numero_socio: numeroSocio || 1,
                apellido: formData.apellido.trim(),
                nombre: formData.nombre.trim(),
                dni: dniLimpio,
                email: formData.email.toLowerCase().trim(),
                telefono: formData.telefono.trim(),
                direccion: formData.direccion.trim() || null,
                localidad: formData.localidad.trim() || null,
                estado: formData.estado,
                cuit_cuil: formData.cuit_cuil.trim() || null,
                observaciones: formData.observaciones.trim() || null,
            };

            if (formData.fecha_ingreso) {
                insertData.fecha_ingreso = formData.fecha_ingreso;
            }

            if (formData.fecha_nacimiento) {
                insertData.fecha_nacimiento = formData.fecha_nacimiento;
            }

            const { error: insertError } = await supabase
                .from('socios')
                .insert(insertData);

            if (insertError) {
                // Manejar errores específicos de Supabase
                if (insertError.code === '23505') {
                    // Violación de constraint único
                    if (insertError.message.includes('dni')) {
                        throw new Error('Ya existe un socio con este DNI');
                    } else if (insertError.message.includes('email')) {
                        throw new Error('Ya existe un socio con este email');
                    } else if (insertError.message.includes('numero_socio')) {
                        throw new Error('Error: El número de socio ya existe. Por favor, intente nuevamente.');
                    }
                }
                throw insertError;
            }

            // Redirigir a la lista de socios
            router.push('/socios');
        } catch (err: any) {
            setError(err.message || 'Error al crear el socio');
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    const handleCancel = () => {
        router.push('/socios');
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
                        Volver a Socios
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Nuevo Socio</h1>
                    <p className="text-gray-600 mt-1">Complete los datos del nuevo socio</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Información del Número de Socio */}
                        {numeroSocio && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <span className="font-semibold">Número de Socio asignado:</span>{' '}
                                    {numeroSocio}
                                </p>
                            </div>
                        )}

                        {/* Sección 1: Información Personal */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        placeholder="Ej: Pérez"
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
                                        placeholder="Ej: Juan"
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
                                        pattern="[0-9]{7,8}"
                                        maxLength={8}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                        placeholder="12345678"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">7-8 dígitos numéricos</p>
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
                                        placeholder="20-12345678-9"
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
                                        placeholder="ejemplo@email.com"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="telefono"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Teléfono *
                                    </label>
                                    <input
                                        type="tel"
                                        id="telefono"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                        placeholder="351-1234567"
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
                                        placeholder="Calle y número"
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
                                        Fecha de Ingreso *
                                    </label>
                                    <input
                                        type="date"
                                        id="fecha_ingreso"
                                        name="fecha_ingreso"
                                        value={formData.fecha_ingreso}
                                        onChange={handleChange}
                                        required
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
                                disabled={loading || validating}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {loading
                                    ? validating
                                        ? 'Validando...'
                                        : 'Creando...'
                                    : 'Crear Socio'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
