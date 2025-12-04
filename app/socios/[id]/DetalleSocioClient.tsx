'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Socio } from '@/app/types/socios';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';
import { ItemCupon } from '@/app/types/cupones';
import { getMetodoPagoLabel } from '@/app/types/pagos';

interface DetalleSocioClientProps {
    socio: Socio;
}

export default function DetalleSocioClient({ socio }: DetalleSocioClientProps) {
    const router = useRouter();
    const [resumenCuenta, setResumenCuenta] = useState({
        saldo: 0,
        cuponesPendientes: 0,
        proximoVencimiento: null as { fecha: string; monto: number; diasRestantes: number } | null,
    });
    const [historialMovimientos, setHistorialMovimientos] = useState<any[]>([]);
    const [filtroHistorial, setFiltroHistorial] = useState<'todos' | 'cupones' | 'pagos'>('todos');
    const [embarcaciones, setEmbarcaciones] = useState<Embarcacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingEmbarcaciones, setLoadingEmbarcaciones] = useState(false);
    
    // Estado para sección colapsable de información del usuario
    const [infoUsuarioColapsada, setInfoUsuarioColapsada] = useState(false);
    
    // Estados para movimientos expandidos
    const [movimientosExpandidos, setMovimientosExpandidos] = useState<Set<string>>(new Set());
    const [itemsCupones, setItemsCupones] = useState<Map<number, ItemCupon[]>>(new Map());
    const [cuponesPagos, setCuponesPagos] = useState<Map<number, any[]>>(new Map());
    const [cargandoItems, setCargandoItems] = useState<Set<number>>(new Set());
    // Estado para información del cupón colapsada
    const [infoCuponColapsada, setInfoCuponColapsada] = useState<Map<number, boolean>>(new Map());

    useEffect(() => {
        // Cargar todas las secciones en paralelo para mejor rendimiento
        Promise.all([
            cargarResumenCuenta(),
            cargarHistorialMovimientos(),
            cargarEmbarcaciones(),
        ]);
    }, [socio]);

    const cargarResumenCuenta = async () => {
        try {
            const supabase = createClient();

            // Obtener todos los cupones pendientes (no solo vencidos)
            const { data: cuponesPendientes, error: errorCupones } = await supabase
                .from('cupones')
                .select('monto_total, estado, fecha_vencimiento')
                .eq('socio_id', socio.id)
                .eq('estado', 'pendiente')
                .order('fecha_vencimiento', { ascending: true });

            if (errorCupones) {
                console.error('Error al cargar cupones:', errorCupones);
            }

            // Obtener total pagado
            const { data: pagos, error: errorPagos } = await supabase
                .from('pagos')
                .select('monto')
                .eq('socio_id', socio.id);

            if (errorPagos) {
                console.error('Error al cargar pagos:', errorPagos);
            }

            const deudaTotal = cuponesPendientes?.reduce((sum, c) => sum + (parseFloat(c.monto_total) || 0), 0) || 0;
            const totalPagado = pagos?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0;
            const saldo = totalPagado - deudaTotal; // Positivo = a favor, Negativo = debe
            const cuponesPendientesCount = cuponesPendientes?.length || 0;

            // Calcular próximo vencimiento
            let proximoVencimiento = null;
            if (cuponesPendientes && cuponesPendientes.length > 0) {
                const proximoCupon = cuponesPendientes[0]; // Ya está ordenado por fecha_vencimiento ascendente
                const fechaVencimiento = new Date(proximoCupon.fecha_vencimiento);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                fechaVencimiento.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                
                proximoVencimiento = {
                    fecha: proximoCupon.fecha_vencimiento,
                    monto: parseFloat(proximoCupon.monto_total),
                    diasRestantes: diasRestantes,
                };
            }

            setResumenCuenta({
                saldo,
                cuponesPendientes: cuponesPendientesCount,
                proximoVencimiento,
            });
        } catch (err) {
            console.error('Error al cargar resumen de cuenta:', err);
        }
    };

    const cargarHistorialMovimientos = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const movimientos: any[] = [];

            // Cargar cupones y pagos en paralelo (visitas no se muestran, están incluidas en cupones)
            const [
                { data: cupones, error: errorCupones },
                { data: pagos, error: errorPagos }
            ] = await Promise.all([
                supabase
                    .from('cupones')
                    .select('*')
                    .eq('socio_id', socio.id)
                    .order('fecha_emision', { ascending: false })
                    .limit(50),
                supabase
                    .from('pagos')
                    .select('*')
                    .eq('socio_id', socio.id)
                    .order('fecha_pago', { ascending: false })
                    .limit(50)
            ]);

            if (!errorCupones && cupones) {
                cupones.forEach(cupon => {
                    // Crear fecha del día 1 del mes del período para ordenamiento
                    const fechaPeriodo = new Date(cupon.periodo_anio, cupon.periodo_mes - 1, 1);
                    movimientos.push({
                        tipo: 'cupon',
                        fecha: cupon.fecha_emision, // Fecha real de emisión (para referencia)
                        fechaPeriodo: fechaPeriodo.toISOString(), // Fecha del período (día 1) para ordenamiento
                        concepto: `Cupón ${cupon.numero_cupon}`,
                        monto: cupon.monto_total,
                        estado: cupon.estado,
                        detalle: cupon,
                    });
                });
            }

            if (!errorPagos && pagos) {
                pagos.forEach(pago => {
                    // Crear fecha del día 1 del mes del pago para agrupar por período
                    const fechaPago = new Date(pago.fecha_pago);
                    const fechaPeriodoPago = new Date(fechaPago.getFullYear(), fechaPago.getMonth(), 1);
                    movimientos.push({
                        tipo: 'pago',
                        fecha: pago.fecha_pago,
                        fechaPeriodo: fechaPeriodoPago.toISOString(), // Fecha del período (día 1) para ordenamiento
                        concepto: `Pago - ${pago.metodo_pago}`,
                        monto: pago.monto,
                        estado: pago.estado_conciliacion,
                        detalle: pago,
                    });
                });
            }

            // Las visitas no se muestran en el historial porque están incluidas en la generación del cupón

            // Ordenar por período (día 1 del mes), luego por tipo (cupones primero), luego por fecha específica
            movimientos.sort((a, b) => {
                // Primero ordenar por período (día 1 del mes) descendente
                const fechaPeriodoA = a.fechaPeriodo ? new Date(a.fechaPeriodo).getTime() : new Date(a.fecha).getTime();
                const fechaPeriodoB = b.fechaPeriodo ? new Date(b.fechaPeriodo).getTime() : new Date(b.fecha).getTime();
                
                if (fechaPeriodoB !== fechaPeriodoA) {
                    return fechaPeriodoB - fechaPeriodoA; // Períodos más recientes primero
                }
                
                // Si están en el mismo período, cupones primero, luego pagos
                if (a.tipo === 'cupon' && b.tipo === 'pago') {
                    return -1; // Cupón antes que pago
                }
                if (a.tipo === 'pago' && b.tipo === 'cupon') {
                    return 1; // Pago después de cupón
                }
                
                // Si son del mismo tipo y mismo período:
                if (a.tipo === 'cupon' && b.tipo === 'cupon') {
                    // Ordenar cupones por fecha de vencimiento descendente
                    const fechaVencA = new Date(a.detalle.fecha_vencimiento).getTime();
                    const fechaVencB = new Date(b.detalle.fecha_vencimiento).getTime();
                    return fechaVencB - fechaVencA;
                }
                
                if (a.tipo === 'pago' && b.tipo === 'pago') {
                    // Ordenar pagos por fecha de pago descendente
                    const fechaPagoA = new Date(a.fecha).getTime();
                    const fechaPagoB = new Date(b.fecha).getTime();
                    return fechaPagoB - fechaPagoA;
                }
                
                return 0;
            });

            setHistorialMovimientos(movimientos);
        } catch (err) {
            console.error('Error al cargar historial:', err);
        } finally {
            setLoading(false);
        }
    };

    const cargarEmbarcaciones = async () => {
        setLoadingEmbarcaciones(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('embarcaciones')
                .select('*')
                .eq('socio_id', socio.id)
                .order('nombre', { ascending: true });

            if (error) {
                console.error('Error al cargar embarcaciones:', error);
            } else {
                setEmbarcaciones((data as Embarcacion[]) || []);
            }
        } catch (err) {
            console.error('Error al cargar embarcaciones:', err);
        } finally {
            setLoadingEmbarcaciones(false);
        }
    };

    const getTipoLabel = (tipo: string) => {
        const tipoObj = TIPOS_EMBARCACION.find((t) => t.value === tipo);
        return tipoObj?.label || tipo;
    };

    const movimientosFiltrados = historialMovimientos.filter(mov => {
        if (filtroHistorial === 'todos') return true;
        return mov.tipo === filtroHistorial;
    });

    const getEstadoBadgeClass = (estado: string) => {
        switch (estado) {
            case 'activo':
                return 'bg-green-100 text-green-800';
            case 'inactivo':
                return 'bg-red-100 text-red-800';
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatEstado = (estado: string) => {
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const getMovimientoKey = (mov: any, index: number) => {
        if (mov.tipo === 'cupon') return `cupon-${mov.detalle.id}`;
        if (mov.tipo === 'pago') return `pago-${mov.detalle.id}`;
        if (mov.tipo === 'visita') return `visita-${mov.detalle.id}`;
        return `mov-${index}`;
    };

    const toggleMovimiento = async (mov: any, index: number) => {
        const key = getMovimientoKey(mov, index);
        const nuevoExpandidos = new Set(movimientosExpandidos);
        
        if (nuevoExpandidos.has(key)) {
            nuevoExpandidos.delete(key);
        } else {
            nuevoExpandidos.add(key);
            
            // Cargar items si es un cupón
            if (mov.tipo === 'cupon' && mov.detalle.id) {
                const cuponId = mov.detalle.id;
                if (!itemsCupones.has(cuponId) && !cargandoItems.has(cuponId)) {
                    setCargandoItems(prev => new Set(prev).add(cuponId));
                    try {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('items_cupon')
                            .select('*')
                            .eq('cupon_id', cuponId)
                            .order('id', { ascending: true });
                        
                        if (!error && data) {
                            setItemsCupones(prev => new Map(prev).set(cuponId, data as ItemCupon[]));
                        }
                    } catch (err) {
                        console.error('Error al cargar items del cupón:', err);
                    } finally {
                        setCargandoItems(prev => {
                            const nuevo = new Set(prev);
                            nuevo.delete(cuponId);
                            return nuevo;
                        });
                    }
                }
            }
            
            // Cargar cupones asociados si es un pago
            if (mov.tipo === 'pago' && mov.detalle.id) {
                const pagoId = mov.detalle.id;
                if (!cuponesPagos.has(pagoId) && !cargandoItems.has(pagoId)) {
                    setCargandoItems(prev => new Set(prev).add(pagoId));
                    try {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('pagos_cupones')
                            .select(`
                                *,
                                cupon:cupones (
                                    id,
                                    numero_cupon,
                                    monto_total,
                                    estado,
                                    fecha_vencimiento,
                                    fecha_pago
                                )
                            `)
                            .eq('pago_id', pagoId);
                        
                        if (!error && data) {
                            setCuponesPagos(prev => new Map(prev).set(pagoId, data));
                        }
                    } catch (err) {
                        console.error('Error al cargar cupones del pago:', err);
                    } finally {
                        setCargandoItems(prev => {
                            const nuevo = new Set(prev);
                            nuevo.delete(pagoId);
                            return nuevo;
                        });
                    }
                }
            }
        }
        
        setMovimientosExpandidos(nuevoExpandidos);
    };

    const isMovimientoExpandido = (mov: any, index: number) => {
        const key = getMovimientoKey(mov, index);
        return movimientosExpandidos.has(key);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/socios')}
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {socio.apellido}, {socio.nombre}
                            </h1>
                            <p className="text-gray-600 mt-1">Socio N° {socio.numero_socio}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push(`/socios/${socio.id}/visita`)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Cargar Visita
                            </button>
                            <button
                                onClick={() => router.push(`/socios/${socio.id}/editar`)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => router.push(`/socios/${socio.id}/eliminar`)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="space-y-6">
                        {/* Información del Usuario - Sección Expandible */}
                        <div className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => setInfoUsuarioColapsada(!infoUsuarioColapsada)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <h3 className="text-base font-semibold text-gray-900">
                                    Información del Usuario
                                </h3>
                                <svg
                                    className={`w-5 h-5 text-gray-500 transition-transform ${infoUsuarioColapsada ? '' : 'rotate-180'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {!infoUsuarioColapsada && (
                                <div className="p-4 pt-0 border-t border-gray-200 space-y-6">
                        {/* Información Personal */}
                        <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                Información Personal
                                        </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de Socio
                                    </label>
                                    <p className="text-sm text-gray-900 font-medium">
                                        {socio.numero_socio}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Apellido
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {socio.apellido}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {socio.nombre}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        DNI
                                    </label>
                                    <p className="text-sm text-gray-900">{socio.dni}</p>
                                </div>
                            </div>
                        </div>

                        {/* Información de Contacto */}
                        <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                Información de Contacto
                                        </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {socio.email || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {socio.telefono || '-'}
                                    </p>
                                </div>
                                {socio.direccion && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dirección
                                        </label>
                                        <p className="text-sm text-gray-900">
                                            {socio.direccion}
                                        </p>
                                    </div>
                                )}
                                {socio.localidad && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Localidad
                                        </label>
                                        <p className="text-sm text-gray-900">
                                            {socio.localidad}
                                        </p>
                                    </div>
                                )}
                                {socio.cuit_cuil && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CUIT/CUIL
                                        </label>
                                        <p className="text-sm text-gray-900">
                                            {socio.cuit_cuil}
                                        </p>
                                    </div>
                                )}
                                {socio.fecha_nacimiento && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha de Nacimiento
                                        </label>
                                        <p className="text-sm text-gray-900">
                                            {formatDate(socio.fecha_nacimiento)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Embarcaciones del Socio */}
                        <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                Embarcaciones
                                        </h4>
                            {loadingEmbarcaciones ? (
                                <p className="text-sm text-gray-500">Cargando embarcaciones...</p>
                            ) : embarcaciones.length === 0 ? (
                                <p className="text-sm text-gray-500">El socio no tiene embarcaciones registradas</p>
                            ) : (
                                <div className="space-y-3">
                                    {embarcaciones.map((emb) => (
                                        <div
                                            key={emb.id}
                                            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{emb.nombre}</p>
                                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                                                        {emb.matricula && (
                                                            <span>Matrícula: <span className="font-medium">{emb.matricula}</span></span>
                                                        )}
                                                        <span>Tipo: <span className="font-medium">{getTipoLabel(emb.tipo)}</span></span>
                                                        <span>Eslora: <span className="font-medium">{emb.eslora_pies} pies</span></span>
                                                        {emb.eslora_metros && (
                                                            <span>Eslora: <span className="font-medium">{emb.eslora_metros} m</span></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Información de Membresía */}
                        <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                Estado y Membresía
                                        </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadgeClass(
                                            socio.estado
                                        )}`}
                                    >
                                        {formatEstado(socio.estado)}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Ingreso
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {socio.fecha_ingreso ? formatDate(socio.fecha_ingreso) : '-'}
                                    </p>
                                </div>
                            </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resumen de Cuenta - Siempre Visible */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                Resumen de Cuenta
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Saldo */}
                                <div className={`border-2 rounded-lg p-6 ${resumenCuenta.saldo >= 0 
                                    ? 'bg-green-50 border-green-300' 
                                    : 'bg-red-50 border-red-300'
                                }`}>
                                    <p className={`text-base font-medium mb-2 ${resumenCuenta.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        Saldo
                                    </p>
                                    <p className={`text-4xl font-bold ${resumenCuenta.saldo >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                        {resumenCuenta.saldo >= 0 ? '+' : ''}${Math.abs(resumenCuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className={`text-sm mt-2 ${resumenCuenta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {resumenCuenta.saldo >= 0 ? 'A favor' : 'Debe'}
                                    </p>
                                </div>
                                
                                {/* Cupones Pendientes */}
                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                                    <p className="text-base font-medium text-yellow-700 mb-2">Cupones Pendientes</p>
                                    <p className="text-4xl font-bold text-yellow-900">
                                        {resumenCuenta.cuponesPendientes}
                                    </p>
                                    <p className="text-sm text-yellow-600 mt-2">
                                        {resumenCuenta.cuponesPendientes === 1 ? 'cupón' : 'cupones'} por pagar
                                    </p>
                                </div>
                                
                                {/* Próximo Vencimiento */}
                                <div className={`border-2 rounded-lg p-6 ${resumenCuenta.proximoVencimiento && resumenCuenta.proximoVencimiento.diasRestantes <= 7
                                    ? 'bg-red-50 border-red-300'
                                    : resumenCuenta.proximoVencimiento && resumenCuenta.proximoVencimiento.diasRestantes <= 15
                                    ? 'bg-orange-50 border-orange-300'
                                    : 'bg-blue-50 border-blue-300'
                                }`}>
                                    <p className={`text-base font-medium mb-2 ${resumenCuenta.proximoVencimiento && resumenCuenta.proximoVencimiento.diasRestantes <= 7
                                        ? 'text-red-700'
                                        : resumenCuenta.proximoVencimiento && resumenCuenta.proximoVencimiento.diasRestantes <= 15
                                        ? 'text-orange-700'
                                        : 'text-blue-700'
                                    }`}>
                                        Próximo Vencimiento
                                    </p>
                                    {resumenCuenta.proximoVencimiento ? (
                                        <>
                                            <p className={`text-2xl font-bold mb-1 ${resumenCuenta.proximoVencimiento.diasRestantes <= 7
                                                ? 'text-red-900'
                                                : resumenCuenta.proximoVencimiento.diasRestantes <= 15
                                                ? 'text-orange-900'
                                                : 'text-blue-900'
                                            }`}>
                                                ${resumenCuenta.proximoVencimiento.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className={`text-sm ${resumenCuenta.proximoVencimiento.diasRestantes <= 7
                                                ? 'text-red-600'
                                                : resumenCuenta.proximoVencimiento.diasRestantes <= 15
                                                ? 'text-orange-600'
                                                : 'text-blue-600'
                                            }`}>
                                                {formatDate(resumenCuenta.proximoVencimiento.fecha)}
                                            </p>
                                            <p className={`text-sm font-medium mt-1 ${resumenCuenta.proximoVencimiento.diasRestantes <= 7
                                                ? 'text-red-700'
                                                : resumenCuenta.proximoVencimiento.diasRestantes <= 15
                                                ? 'text-orange-700'
                                                : 'text-blue-700'
                                            }`}>
                                                {resumenCuenta.proximoVencimiento.diasRestantes < 0 
                                                    ? `Vencido hace ${Math.abs(resumenCuenta.proximoVencimiento.diasRestantes)} ${Math.abs(resumenCuenta.proximoVencimiento.diasRestantes) === 1 ? 'día' : 'días'}`
                                                    : resumenCuenta.proximoVencimiento.diasRestantes === 0
                                                    ? 'Vence hoy'
                                                    : `${resumenCuenta.proximoVencimiento.diasRestantes} ${resumenCuenta.proximoVencimiento.diasRestantes === 1 ? 'día' : 'días'} restantes`
                                                }
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No hay cupones pendientes</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Historial Unificado de Movimientos */}
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Historial de Movimientos
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFiltroHistorial('todos')}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${filtroHistorial === 'todos'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setFiltroHistorial('cupones')}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${filtroHistorial === 'cupones'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Cupones
                                    </button>
                                    <button
                                        onClick={() => setFiltroHistorial('pagos')}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${filtroHistorial === 'pagos'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Pagos
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                            ) : movimientosFiltrados.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No hay movimientos registrados
                                </div>
                            ) : (
                                <div className="space-y-2" style={{ maxHeight: '42rem', overflowY: 'auto' }}>
                                    {movimientosFiltrados.map((mov, index) => {
                                        const expandido = isMovimientoExpandido(mov, index);
                                        const cupon = mov.tipo === 'cupon' ? mov.detalle : null;
                                        const pago = mov.tipo === 'pago' ? mov.detalle : null;
                                        
                                        return (
                                        <div
                                            key={index}
                                                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => toggleMovimiento(mov, index)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex-1 flex items-center gap-3">
                                                        <svg
                                                            className={`w-4 h-4 text-gray-400 transition-transform ${expandido ? 'rotate-90' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                <div className="flex items-center gap-2">
                                                            <span
                                                                className={`px-2 py-1 text-xs rounded font-medium ${mov.tipo === 'cupon'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-green-100 text-green-800'
                                                                    }`}
                                                            >
                                                                {mov.tipo === 'cupon' ? 'Cupón' : 'Pago'}
                                                            </span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {mov.concepto}
                                                    </span>
                                                </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="font-medium">
                                                                {mov.tipo === 'cupon' && cupon 
                                                                    ? `${String(cupon.periodo_mes).padStart(2, '0')}/${cupon.periodo_anio}`
                                                                    : formatDate(mov.fecha)
                                                                }
                                                            </span>
                                                        </div>
                                            </div>
                                                    <div className="text-right ml-4">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    ${parseFloat(mov.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs text-gray-500 capitalize">{mov.estado}</p>
                                                    </div>
                                                </button>
                                                
                                                {expandido && (
                                                    <div className="border-t border-gray-200 bg-white p-4">
                                                        {mov.tipo === 'cupon' && cupon && (
                                                            <div className="space-y-4">
                                                                {/* Información del Cupón - Colapsable */}
                                                                <div className="border border-gray-200 rounded-lg">
                                                                    <button
                                                                        onClick={() => {
                                                                            const nuevo = new Map(infoCuponColapsada);
                                                                            nuevo.set(cupon.id, !nuevo.get(cupon.id));
                                                                            setInfoCuponColapsada(nuevo);
                                                                        }}
                                                                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        <h4 className="text-sm font-semibold text-gray-900">
                                                                            Información del Cupón
                                                                        </h4>
                                                                        <svg
                                                                            className={`w-4 h-4 text-gray-500 transition-transform ${infoCuponColapsada.get(cupon.id) === false ? 'rotate-180' : ''}`}
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </button>
                                                                    {infoCuponColapsada.get(cupon.id) === false && (
                                                                        <div className="p-3 pt-0 border-t border-gray-200">
                                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Número</label>
                                                                                    <p className="text-gray-900 font-medium text-xs">{cupon.numero_cupon}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Estado</label>
                                                                                    <span className={`inline-block px-1.5 py-0.5 text-xs rounded-full font-medium ${
                                                                                        cupon.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                                                                                        cupon.estado === 'vencido' ? 'bg-red-100 text-red-800' :
                                                                                        'bg-yellow-100 text-yellow-800'
                                                                                    }`}>
                                                                                        {formatEstado(cupon.estado)}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Período</label>
                                                                                    <p className="text-gray-900 text-xs">{cupon.periodo_mes}/{cupon.periodo_anio}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Emisión</label>
                                                                                    <p className="text-gray-900 text-xs">{formatDate(cupon.fecha_emision)}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Vencimiento</label>
                                                                                    <p className="text-gray-900 text-xs">{formatDate(cupon.fecha_vencimiento)}</p>
                                                                                </div>
                                                                                {cupon.fecha_pago && (
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-500 mb-0.5">Pago</label>
                                                                                        <p className="text-gray-900 text-xs">{formatDate(cupon.fecha_pago)}</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Items del Cupón */}
                                                                {cargandoItems.has(cupon.id) ? (
                                                                    <div className="text-center py-4 text-sm text-gray-500">Cargando items...</div>
                                                                ) : itemsCupones.has(cupon.id) && itemsCupones.get(cupon.id)!.length > 0 ? (
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                                                            Items del Cupón
                                                                        </h4>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {itemsCupones.get(cupon.id)!.map((item) => (
                                                                                        <tr key={item.id}>
                                                                                            <td className="px-3 py-2 text-gray-900">{item.descripcion}</td>
                                                                                            <td className="px-3 py-2 text-right text-gray-900">{item.cantidad}</td>
                                                                                            <td className="px-3 py-2 text-right text-gray-900">
                                                                                                {item.precio_unitario ? formatCurrency(parseFloat(item.precio_unitario.toString())) : '-'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                                                                {formatCurrency(parseFloat(item.subtotal.toString()))}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                                
                                                                {cupon.observaciones && (
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Observaciones</h4>
                                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{cupon.observaciones}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {mov.tipo === 'pago' && pago && (
                                                            <div className="space-y-4">
                                                                {/* Información del Pago */}
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                                                        Información del Pago
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Pago</label>
                                                                            <p className="text-gray-900">{formatDate(pago.fecha_pago)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                                                                            <p className="text-gray-900 font-semibold">{formatCurrency(parseFloat(pago.monto.toString()))}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Método de Pago</label>
                                                                            <p className="text-gray-900">{getMetodoPagoLabel(pago.metodo_pago)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Estado de Conciliación</label>
                                                                            <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                                                                                pago.estado_conciliacion === 'conciliado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                                {pago.estado_conciliacion === 'conciliado' ? 'Conciliado' : 'Pendiente'}
                                                                            </span>
                                                                        </div>
                                                                        {pago.numero_comprobante && (
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Número de Comprobante</label>
                                                                                <p className="text-gray-900">{pago.numero_comprobante}</p>
                                                                            </div>
                                                                        )}
                                                                        {pago.referencia_bancaria && (
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Referencia Bancaria</label>
                                                                                <p className="text-gray-900 font-medium text-blue-600">{pago.referencia_bancaria}</p>
                                                                            </div>
                                                                        )}
                                                                        {pago.fecha_conciliacion && (
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Conciliación</label>
                                                                                <p className="text-gray-900">{formatDate(pago.fecha_conciliacion)}</p>
                                                                            </div>
                                                                        )}
                                            </div>
                                        </div>
                                                                
                                                                {/* Cupones Asociados */}
                                                                {cargandoItems.has(pago.id) ? (
                                                                    <div className="text-center py-4 text-sm text-gray-500">Cargando cupones asociados...</div>
                                                                ) : cuponesPagos.has(pago.id) && cuponesPagos.get(pago.id)!.length > 0 ? (
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                                                            Cupones Asociados ({cuponesPagos.get(pago.id)!.length})
                                                                        </h4>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cupón</th>
                                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Aplicado</th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {cuponesPagos.get(pago.id)!.map((pagoCupon: any, idx: number) => (
                                                                                        <tr key={idx}>
                                                                                            <td className="px-3 py-2 text-gray-900 font-medium">
                                                                                                {pagoCupon.cupon?.numero_cupon || `Cupón #${pagoCupon.cupon_id}`}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-right text-gray-900">
                                                                                                {formatCurrency(parseFloat(pagoCupon.cupon?.monto_total?.toString() || '0'))}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                                {formatCurrency(parseFloat(pagoCupon.monto_aplicado.toString()))}
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                                                                                                    pagoCupon.cupon?.estado === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                                                }`}>
                                                                                                    {pagoCupon.cupon?.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm text-gray-500 text-center py-2">
                                                                        No hay cupones asociados a este pago
                                                                    </div>
                                                                )}
                                                                
                                                                {pago.observaciones && (
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Observaciones</h4>
                                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{pago.observaciones}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
