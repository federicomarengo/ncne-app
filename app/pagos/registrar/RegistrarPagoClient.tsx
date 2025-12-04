'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { Cupon } from '@/app/types/cupones';
import { MetodoPago, METODOS_PAGO } from '@/app/types/pagos';
import { createClient } from '@/utils/supabase/client';
import { verificarDuplicadoPago } from '@/app/utils/verificarDuplicadoPago';

export default function RegistrarPagoClient() {
    const router = useRouter();
    const [socios, setSocios] = useState<Socio[]>([]);
    const [cupones, setCupones] = useState<Cupon[]>([]);
    const [socioId, setSocioId] = useState('');
    const [cuponId, setCuponId] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia_bancaria');
    const [monto, setMonto] = useState('');
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
    const [numeroComprobante, setNumeroComprobante] = useState('');
    const [referenciaBancaria, setReferenciaBancaria] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingSocios, setLoadingSocios] = useState(false);
    const [loadingCupones, setLoadingCupones] = useState(false);
    const [montoMaximo, setMontoMaximo] = useState(0);
    const [advertenciaDuplicado, setAdvertenciaDuplicado] = useState<{
        mostrar: boolean;
        mensaje: string;
        pagoId: number | null;
    }>({ mostrar: false, mensaje: '', pagoId: null });

    useEffect(() => {
        cargarSocios();
    }, []);

    useEffect(() => {
        if (socioId) {
            cargarCuponesPendientes(parseInt(socioId));
        } else {
            setCupones([]);
            setCuponId('');
            setMontoMaximo(0);
        }
    }, [socioId]);

    useEffect(() => {
        if (cuponId) {
            const cupon = cupones.find((c) => c.id === parseInt(cuponId));
            if (cupon) {
                setMontoMaximo(parseFloat(cupon.monto_total.toString()));
                setMonto(cupon.monto_total.toString());
            }
        } else {
            setMontoMaximo(0);
            setMonto('');
        }
    }, [cuponId, cupones]);

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

    const cargarCuponesPendientes = async (socioIdNum: number) => {
        setLoadingCupones(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('cupones')
                .select('*')
                .eq('socio_id', socioIdNum)
                .eq('estado', 'pendiente')
                .order('fecha_vencimiento', { ascending: true });

            if (error) {
                console.error('Error al cargar cupones:', error);
                setCupones([]);
            } else {
                setCupones((data as Cupon[]) || []);
            }
        } catch (err) {
            console.error('Error al cargar cupones:', err);
            setCupones([]);
        } finally {
            setLoadingCupones(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!socioId) {
            setError('Debe seleccionar un socio');
            return;
        }

        if (!cuponId) {
            setError('Debe seleccionar un cupón');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        const montoNum = parseFloat(monto);
        if (montoNum > montoMaximo) {
            setError(`El monto no puede exceder ${montoMaximo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`);
            return;
        }

        const fechaPagoDate = new Date(fechaPago);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        if (fechaPagoDate > hoy) {
            setError('La fecha de pago no puede ser futura');
            return;
        }

        setLoading(true);
        setAdvertenciaDuplicado({ mostrar: false, mensaje: '', pagoId: null });

        try {
            const supabase = createClient();

            // Verificar duplicados antes de crear el pago
            const verificacion = await verificarDuplicadoPago(
                {
                    socio_id: parseInt(socioId),
                    fecha_pago: fechaPago,
                    monto: montoNum,
                    metodo_pago: metodoPago,
                    numero_comprobante: numeroComprobante || null,
                    referencia_bancaria: referenciaBancaria || null,
                    movimiento_bancario_id: null, // No viene de conciliación
                },
                supabase
            );

            if (verificacion.esDuplicado) {
                // Si es duplicado de alta confianza, bloquear
                if (verificacion.nivelConfianza === 'alto') {
                    setError(`No se puede registrar el pago: ${verificacion.razon}`);
                    setLoading(false);
                    return;
                }
                
                // Si es duplicado de confianza media/baja, mostrar advertencia pero permitir continuar
                setAdvertenciaDuplicado({
                    mostrar: true,
                    mensaje: verificacion.razon,
                    pagoId: verificacion.pagoDuplicadoId,
                });
                
                // Preguntar al usuario si desea continuar
                const continuar = window.confirm(
                    `ADVERTENCIA: ${verificacion.razon}\n\n¿Desea continuar de todas formas?`
                );
                
                if (!continuar) {
                    setLoading(false);
                    return;
                }
            }

            const { data: pago, error: errorPago } = await supabase
                .from('pagos')
                .insert({
                    socio_id: parseInt(socioId),
                    fecha_pago: fechaPago,
                    monto: montoNum,
                    metodo_pago: metodoPago,
                    numero_comprobante: numeroComprobante || null,
                    referencia_bancaria: referenciaBancaria || null,
                    observaciones: observaciones || null,
                    estado_conciliacion: 'pendiente',
                })
                .select()
                .single();

            if (errorPago) {
                throw new Error(errorPago.message || 'Error al crear el pago');
            }

            const { error: errorPagoCupon } = await supabase
                .from('pagos_cupones')
                .insert({
                    pago_id: pago.id,
                    cupon_id: parseInt(cuponId),
                    monto_aplicado: montoNum,
                });

            if (errorPagoCupon) {
                console.error('Error al crear relación pago-cupón:', errorPagoCupon);
            }

            const { error: errorCupon } = await supabase
                .from('cupones')
                .update({
                    estado: 'pagado',
                    fecha_pago: fechaPago,
                })
                .eq('id', parseInt(cuponId));

            if (errorCupon) {
                console.error('Error al actualizar cupón:', errorCupon);
            }

            router.push('/pagos');
        } catch (err: any) {
            setError(err.message || 'Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleCancel = () => {
        router.push('/pagos');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
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
                        Volver a Pagos
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Registrar Pago</h1>
                    <p className="text-gray-600 mt-1">Registrar un nuevo pago</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Socio <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={socioId}
                                onChange={(e) => setSocioId(e.target.value)}
                                disabled={loadingSocios}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                                <option value="">Seleccione un socio</option>
                                {socios.map((socio) => (
                                    <option key={socio.id} value={socio.id}>
                                        {getNombreCompleto(socio)} (Socio #{socio.numero_socio})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cupón a Pagar <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={cuponId}
                                onChange={(e) => setCuponId(e.target.value)}
                                disabled={!socioId || loadingCupones}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                                <option value="">
                                    {!socioId
                                        ? 'Seleccione un socio primero'
                                        : loadingCupones
                                        ? 'Cargando cupones...'
                                        : cupones.length === 0
                                        ? 'No hay cupones pendientes'
                                        : 'Seleccione un cupón'}
                                </option>
                                {cupones.map((cupon) => (
                                    <option key={cupon.id} value={cupon.id}>
                                        {cupon.numero_cupon} - Vence: {new Date(cupon.fecha_vencimiento).toLocaleDateString('es-AR')} -{' '}
                                        {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                                    </option>
                                ))}
                            </select>
                            {cuponId && montoMaximo > 0 && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Monto máximo: {formatCurrency(montoMaximo)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de Pago <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {METODOS_PAGO.map((metodo) => (
                                    <option key={metodo.value} value={metodo.value}>
                                        {metodo.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={montoMaximo}
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                disabled={!cuponId}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Pago <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Comprobante
                            </label>
                            <input
                                type="text"
                                value={numeroComprobante}
                                onChange={(e) => setNumeroComprobante(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Opcional"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Referencia Bancaria
                            </label>
                            <input
                                type="text"
                                value={referenciaBancaria}
                                onChange={(e) => setReferenciaBancaria(e.target.value)}
                                placeholder="Número de referencia del banco (opcional)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Útil para detectar pagos duplicados desde extractos bancarios
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observaciones
                            </label>
                            <textarea
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Opcional"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {advertenciaDuplicado.mostrar && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800">Advertencia: Posible Pago Duplicado</p>
                                        <p className="text-sm text-yellow-700 mt-1">{advertenciaDuplicado.mensaje}</p>
                                        {advertenciaDuplicado.pagoId && (
                                            <a
                                                href={`/pagos`}
                                                className="text-sm text-yellow-600 underline mt-1 inline-block"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Ver pago existente (ID: {advertenciaDuplicado.pagoId})
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Registrando...' : 'Registrar Pago'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

