'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TipoEmbarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { createClient } from '@/utils/supabase/client';
import { Socio, getNombreCompleto } from '@/app/types/socios';

export default function NuevaEmbarcacionPage() {
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

    useEffect(() => {
        cargarSocios();
    }, []);

    const cargarSocios = async () => {
        setLoadingSocios(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('socios')
                .select('id, numero_socio, apellido, nombre')
                .eq('estado', 'activo')
                .order('numero_socio', { ascending: true });

            if (error) {
                console.error('Error al cargar socios:', error);
            } else {
                setSocios((data as Socio[]) || []);
            }
        } catch (err) {
            console.error('Error al cargar socios:', err);
        } finally {
            setLoadingSocios(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        
        if (error) {
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        try {
            if (!formData.socio_id) {
                throw new Error('El socio propietario es obligatorio');
            }

            if (!formData.nombre || formData.nombre.trim().length === 0) {
                throw new Error('El nombre de la embarcación es obligatorio');
            }

            if (!formData.tipo) {
                throw new Error('El tipo de embarcación es obligatorio');
            }

            if (!formData.eslora_pies || parseFloat(formData.eslora_pies) <= 0) {
                throw new Error('La eslora en pies es obligatoria y debe ser mayor a 0');
            }

            if (formData.matricula.trim()) {
                const supabase = createClient();
                const { data: existing, error: checkError } = await supabase
                    .from('embarcaciones')
                    .select('id')
                    .eq('matricula', formData.matricula.trim())
                    .limit(1);

                if (checkError) {
                    console.error('Error al verificar matrícula:', checkError);
                } else if (existing && existing.length > 0) {
                    throw new Error('Ya existe una embarcación con esta matrícula');
                }
            }

            const supabase = createClient();
            const insertData: any = {
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
                observaciones: formData.observaciones.trim() || null,
            };

            const { error: insertError } = await supabase
                .from('embarcaciones')
                .insert(insertData);

            if (insertError) {
                if (insertError.code === '23505') {
                    if (insertError.message.includes('matricula')) {
                        throw new Error('Ya existe una embarcación con esta matrícula');
                    }
                }
                throw insertError;
            }

            router.push('/embarcaciones');
        } catch (err: any) {
            setError(err.message || 'Error al crear la embarcación');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/embarcaciones');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
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
                        Volver a Embarcaciones
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Nueva Embarcación</h1>
                    <p className="text-gray-600 mt-1">Complete los datos de la nueva embarcación</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                                {socio.numero_socio} - {getNombreCompleto(socio)}
                                            </option>
                                        ))}
                                    </select>
                                    {loadingSocios && (
                                        <p className="text-xs text-gray-500 mt-1">Cargando socios...</p>
                                    )}
                                </div>

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
                                    <p className="text-xs text-gray-500 mt-1">Opcional, debe ser única</p>
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
                                        placeholder="Nombre de la embarcación"
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
                                        placeholder="0.00"
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
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

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
                                        placeholder="0.00"
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
                                        placeholder="0.00"
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
                                        placeholder="0.00"
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
                                        placeholder="0.00"
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
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>
                        </div>

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
                                        placeholder="Marca, modelo, etc."
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
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

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
                                    placeholder="Observaciones adicionales sobre la embarcación..."
                                />
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
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {loading ? 'Creando...' : 'Crear Embarcación'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}




