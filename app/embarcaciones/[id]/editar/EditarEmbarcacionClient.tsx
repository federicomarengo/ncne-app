'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Embarcacion, TipoEmbarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { createClient } from '@/utils/supabase/client';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { logger } from '@/app/utils/logger';

interface EditarEmbarcacionClientProps {
    embarcacion: Embarcacion;
}

export default function EditarEmbarcacionClient({ embarcacion }: EditarEmbarcacionClientProps) {
    const router = useRouter();
    const [socios, setSocios] = useState<Socio[]>([]);
    const [formData, setFormData] = useState({
        socio_id: '',
        matricula: '',
        nombre: '',
        tipo: 'velero' as TipoEmbarcacion,
        astillero: '',
        modelo: '',
        eslora_pies: '',
        eslora_metros: '',
        manga_metros: '',
        puntal_metros: '',
        calado: '',
        tonelaje: '',
        anio_construccion: '',
        motor_info: '',
        hp: '',
        observaciones: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingSocios, setLoadingSocios] = useState(false);
    const [socioIdOriginal, setSocioIdOriginal] = useState<number | null>(null);
    const [cambioPropietarioDetectado, setCambioPropietarioDetectado] = useState(false);
    const [confirmacionCambio, setConfirmacionCambio] = useState('');
    const [validandoCupones, setValidandoCupones] = useState(false);
    const [hayCuponesPendientes, setHayCuponesPendientes] = useState(false);

    useEffect(() => {
        cargarSocios();
    }, []);

    useEffect(() => {
        if (embarcacion) {
            const socioIdStr = embarcacion.socio_id.toString();
            setFormData({
                socio_id: socioIdStr,
                matricula: embarcacion.matricula || '',
                nombre: embarcacion.nombre || '',
                tipo: (embarcacion.tipo as TipoEmbarcacion) || 'velero',
                astillero: embarcacion.astillero || '',
                modelo: embarcacion.modelo || '',
                eslora_pies: embarcacion.eslora_pies?.toString() || '',
                eslora_metros: embarcacion.eslora_metros?.toString() || '',
                manga_metros: embarcacion.manga_metros?.toString() || '',
                puntal_metros: embarcacion.puntal_metros?.toString() || '',
                calado: embarcacion.calado?.toString() || '',
                tonelaje: embarcacion.tonelaje?.toString() || '',
                anio_construccion: embarcacion.anio_construccion?.toString() || '',
                motor_info: embarcacion.motor_info || '',
                hp: embarcacion.hp?.toString() || '',
                observaciones: embarcacion.observaciones || '',
            });
            setSocioIdOriginal(embarcacion.socio_id);
            setCambioPropietarioDetectado(false);
            setConfirmacionCambio('');
            setHayCuponesPendientes(false);
            setError(null);
        }
    }, [embarcacion]);

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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        
        // Detectar cambio de propietario
        if (name === 'socio_id' && embarcacion && socioIdOriginal) {
            const nuevoSocioId = parseInt(value);
            if (nuevoSocioId !== socioIdOriginal) {
                setCambioPropietarioDetectado(true);
                setConfirmacionCambio('');
                validarCuponesPendientes(socioIdOriginal);
            } else {
                setCambioPropietarioDetectado(false);
                setConfirmacionCambio('');
                setHayCuponesPendientes(false);
            }
        }
        
        if (error) {
            setError(null);
        }
    };

    const validarCuponesPendientes = async (socioId: number) => {
        setValidandoCupones(true);
        try {
            const supabase = createClient();
            const { data: cupones, error: cuponesError } = await supabase
                .from('cupones')
                .select('id')
                .eq('socio_id', socioId)
                .in('estado', ['pendiente', 'vencido'])
                .limit(1);

            if (cuponesError) {
                logger.error('Error al validar cupones:', cuponesError);
                setHayCuponesPendientes(false);
            } else {
                setHayCuponesPendientes(cupones && cupones.length > 0);
            }
        } catch (err) {
            logger.error('Error al validar cupones:', err);
            setHayCuponesPendientes(false);
        } finally {
            setValidandoCupones(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!embarcacion) return;

        setLoading(true);
        setError(null);

        try {
            // Validar cambio de propietario
            if (cambioPropietarioDetectado) {
                // Validar que no haya cupones pendientes
                if (hayCuponesPendientes) {
                    throw new Error('No se puede cambiar el propietario si hay cupones pendientes de pago asociados al propietario actual');
                }

                // Validar confirmación
                const nuevoSocioId = parseInt(formData.socio_id);
                const nuevoSocio = socios.find(s => s.id === nuevoSocioId);
                const nombreNuevoPropietario = nuevoSocio ? getNombreCompleto(nuevoSocio).toUpperCase() : '';
                const confirmacionUpper = confirmacionCambio.trim().toUpperCase();

                if (confirmacionUpper !== 'CONFIRMAR' && confirmacionUpper !== nombreNuevoPropietario) {
                    throw new Error('Debe escribir "CONFIRMAR" o el nombre completo del nuevo propietario para confirmar el cambio');
                }
            }

            if (!formData.nombre || formData.nombre.trim().length === 0) {
                throw new Error('El nombre de la embarcación es obligatorio');
            }

            if (!formData.eslora_pies || parseFloat(formData.eslora_pies) <= 0) {
                throw new Error('La eslora en pies es obligatoria y debe ser mayor a 0');
            }

            // Validar matrícula única si se proporciona y cambió
            if (formData.matricula.trim() && formData.matricula !== embarcacion.matricula) {
                const supabase = createClient();
                const { data: existing, error: checkError } = await supabase
                    .from('embarcaciones')
                    .select('id')
                    .eq('matricula', formData.matricula.trim())
                    .neq('id', embarcacion.id)
                    .limit(1);

                if (checkError) {
                    logger.error('Error al verificar matrícula:', checkError);
                } else if (existing && existing.length > 0) {
                    throw new Error('Ya existe otra embarcación con esta matrícula');
                }
            }

            const supabase = createClient();
            
            // Preparar observaciones con registro de cambio de propietario si aplica
            let observacionesFinal = formData.observaciones.trim() || '';
            
            if (cambioPropietarioDetectado && socioIdOriginal) {
                const socioAnterior = socios.find(s => s.id === socioIdOriginal);
                const nuevoSocioId = parseInt(formData.socio_id);
                const nuevoSocio = socios.find(s => s.id === nuevoSocioId);
                
                if (socioAnterior && nuevoSocio) {
                    const fechaHora = new Date().toLocaleString('es-AR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const registroCambio = `\n\n[${fechaHora}] - Cambio de propietario\nPropietario anterior: ${getNombreCompleto(socioAnterior)} (Socio #${socioAnterior.numero_socio})\nPropietario nuevo: ${getNombreCompleto(nuevoSocio)} (Socio #${nuevoSocio.numero_socio})`;
                    
                    observacionesFinal = observacionesFinal ? observacionesFinal + registroCambio : registroCambio.trim();
                }
            }
            
            const updateData: any = {
                socio_id: parseInt(formData.socio_id),
                nombre: formData.nombre.trim(),
                tipo: formData.tipo,
                eslora_pies: parseFloat(formData.eslora_pies),
                matricula: formData.matricula.trim() || null,
                astillero: formData.astillero.trim() || null,
                modelo: formData.modelo.trim() || null,
                eslora_metros: formData.eslora_metros ? parseFloat(formData.eslora_metros) : null,
                manga_metros: formData.manga_metros ? parseFloat(formData.manga_metros) : null,
                puntal_metros: formData.puntal_metros ? parseFloat(formData.puntal_metros) : null,
                calado: formData.calado ? parseFloat(formData.calado) : null,
                tonelaje: formData.tonelaje ? parseFloat(formData.tonelaje) : null,
                anio_construccion: formData.anio_construccion ? parseInt(formData.anio_construccion) : null,
                motor_info: formData.motor_info.trim() || null,
                hp: formData.hp ? parseFloat(formData.hp) : null,
                observaciones: observacionesFinal || null,
            };

            const { error: updateError } = await supabase
                .from('embarcaciones')
                .update(updateData)
                .eq('id', embarcacion.id);

            if (updateError) {
                if (updateError.code === '23505' && updateError.message.includes('matricula')) {
                    throw new Error('Ya existe otra embarcación con esta matrícula');
                }
                throw updateError;
            }

            router.push(`/embarcaciones/${embarcacion.id}`);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la embarcación');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push(`/embarcaciones/${embarcacion.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
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
                        Volver a Detalle de Embarcación
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Editar Embarcación</h1>
                    <p className="text-gray-600 mt-1">Modificar información de la embarcación</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Sección 1: Información Básica */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información Básica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="socio_id"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Socio Propietario *
                                    </label>
                                    <select
                                        id="socio_id"
                                        name="socio_id"
                                        value={formData.socio_id}
                                        onChange={handleChange}
                                        required
                                        disabled={loadingSocios}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:bg-gray-100"
                                    >
                                        <option value="">Seleccionar socio...</option>
                                        {socios.map((socio) => (
                                            <option key={socio.id} value={socio.id}>
                                                {getNombreCompleto(socio)} (Socio #{socio.numero_socio})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Advertencia de Cambio de Propietario */}
                                {cambioPropietarioDetectado && (
                                    <div className="md:col-span-2">
                                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                                                        ⚠️ ADVERTENCIA: Está a punto de cambiar el propietario de esta embarcación.
                                                    </h3>
                                                    <div className="text-sm text-yellow-700 space-y-1">
                                                        {socioIdOriginal && (
                                                            <p>
                                                                <span className="font-medium">Propietario actual:</span>{' '}
                                                                {(() => {
                                                                    const socioActual = socios.find(s => s.id === socioIdOriginal);
                                                                    return socioActual ? `${getNombreCompleto(socioActual)} (Socio #${socioActual.numero_socio})` : 'N/A';
                                                                })()}
                                                            </p>
                                                        )}
                                                        <p>
                                                            <span className="font-medium">Nuevo propietario:</span>{' '}
                                                            {(() => {
                                                                const nuevoSocioId = parseInt(formData.socio_id);
                                                                const nuevoSocio = socios.find(s => s.id === nuevoSocioId);
                                                                return nuevoSocio ? `${getNombreCompleto(nuevoSocio)} (Socio #${nuevoSocio.numero_socio})` : 'N/A';
                                                            })()}
                                                        </p>
                                                        <p className="mt-2">
                                                            Esta acción registrará una transacción de cambio de propietario.
                                                        </p>
                                                        {validandoCupones && (
                                                            <p className="text-xs text-yellow-600 mt-2">Validando cupones pendientes...</p>
                                                        )}
                                                        {hayCuponesPendientes && (
                                                            <p className="text-red-700 font-semibold mt-2">
                                                                ❌ No se puede cambiar el propietario: hay cupones pendientes de pago asociados al propietario actual.
                                                            </p>
                                                        )}
                                                    </div>
                                                    {!hayCuponesPendientes && (
                                                        <div className="mt-4">
                                                            <label
                                                                htmlFor="confirmacion_cambio"
                                                                className="block text-sm font-medium text-yellow-800 mb-2"
                                                            >
                                                                Para confirmar el cambio, escriba "CONFIRMAR" o el nombre completo del nuevo propietario:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="confirmacion_cambio"
                                                                name="confirmacion_cambio"
                                                                value={confirmacionCambio}
                                                                onChange={(e) => setConfirmacionCambio(e.target.value)}
                                                                placeholder='Escriba "CONFIRMAR" o el nombre del nuevo propietario'
                                                                className="w-full px-4 py-2.5 border-2 border-yellow-400 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200"
                                                            />
                                                            <p className="text-xs text-yellow-600 mt-1">
                                                                Nuevo propietario: {(() => {
                                                                    const nuevoSocioId = parseInt(formData.socio_id);
                                                                    const nuevoSocio = socios.find(s => s.id === nuevoSocioId);
                                                                    return nuevoSocio ? getNombreCompleto(nuevoSocio) : '';
                                                                })()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="matricula"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Matrícula
                                    </label>
                                    <input
                                        type="text"
                                        id="matricula"
                                        name="matricula"
                                        value={formData.matricula}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                        placeholder="Matrícula única"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="nombre"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Nombre de la Embarcación *
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
                                        htmlFor="tipo"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Tipo de Embarcación *
                                    </label>
                                    <select
                                        id="tipo"
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    >
                                        {TIPOS_EMBARCACION.map((tipo) => (
                                            <option key={tipo.value} value={tipo.value}>
                                                {tipo.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="eslora_pies"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Eslora (Pies) *
                                    </label>
                                    <input
                                        type="number"
                                        id="eslora_pies"
                                        name="eslora_pies"
                                        value={formData.eslora_pies}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="eslora_metros"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Eslora (Metros)
                                    </label>
                                    <input
                                        type="number"
                                        id="eslora_metros"
                                        name="eslora_metros"
                                        value={formData.eslora_metros}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 2: Información Adicional */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información Adicional
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="astillero"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Astillero
                                    </label>
                                    <input
                                        type="text"
                                        id="astillero"
                                        name="astillero"
                                        value={formData.astillero}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="modelo"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        id="modelo"
                                        name="modelo"
                                        value={formData.modelo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="manga_metros"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Manga (Metros)
                                    </label>
                                    <input
                                        type="number"
                                        id="manga_metros"
                                        name="manga_metros"
                                        value={formData.manga_metros}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="puntal_metros"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Puntal (Metros)
                                    </label>
                                    <input
                                        type="number"
                                        id="puntal_metros"
                                        name="puntal_metros"
                                        value={formData.puntal_metros}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="calado"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Calado (Metros)
                                    </label>
                                    <input
                                        type="number"
                                        id="calado"
                                        name="calado"
                                        value={formData.calado}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="tonelaje"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Tonelaje
                                    </label>
                                    <input
                                        type="number"
                                        id="tonelaje"
                                        name="tonelaje"
                                        value={formData.tonelaje}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="anio_construccion"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Año de Construcción
                                    </label>
                                    <input
                                        type="number"
                                        id="anio_construccion"
                                        name="anio_construccion"
                                        value={formData.anio_construccion}
                                        onChange={handleChange}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 3: Información del Motor */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Información del Motor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="motor_info"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Información del Motor
                                    </label>
                                    <input
                                        type="text"
                                        id="motor_info"
                                        name="motor_info"
                                        value={formData.motor_info}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="hp"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Potencia (HP)
                                    </label>
                                    <input
                                        type="number"
                                        id="hp"
                                        name="hp"
                                        value={formData.hp}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
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
                                disabled={loading || (cambioPropietarioDetectado && (!confirmacionCambio.trim() || hayCuponesPendientes))}
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




