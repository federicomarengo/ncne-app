'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Socio } from '@/app/types/socios';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';
import { ItemCupon } from '@/app/types/cupones';
import { getMetodoPagoLabel } from '@/app/types/pagos';
import SocioKeywordsPanel from '@/app/components/panels/SocioKeywordsPanel';
import { generarHistorialCronologico, MovimientoCronologico } from '@/app/utils/generarHistorialCronologico';

interface DetalleSocioClientProps {
    socio: Socio;
}

export default function DetalleSocioClient({ socio }: DetalleSocioClientProps) {
    const router = useRouter();
    const [resumenCuenta, setResumenCuenta] = useState({
        saldo: 0,
        cuponesPendientes: 0,
    });
    const [historialMovimientos, setHistorialMovimientos] = useState<MovimientoCronologico[]>([]);
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

            // Obtener TODOS los cupones del socio (sin filtrar por estado) para calcular el saldo
            const { data: todosLosCupones, error: errorTodosCupones } = await supabase
                .from('cupones')
                .select('monto_total')
                .eq('socio_id', socio.id);

            if (errorTodosCupones) {
                console.error('Error al cargar todos los cupones:', errorTodosCupones);
            }

            // Obtener cupones pendientes para mostrar información (cantidad y próximo vencimiento)
            const { data: cuponesPendientes, error: errorCupones } = await supabase
                .from('cupones')
                .select('monto_total, estado, fecha_vencimiento')
                .eq('socio_id', socio.id)
                .eq('estado', 'pendiente')
                .order('fecha_vencimiento', { ascending: true });

            if (errorCupones) {
                console.error('Error al cargar cupones pendientes:', errorCupones);
            }

            // Obtener total pagado
            const { data: pagos, error: errorPagos } = await supabase
                .from('pagos')
                .select('id, monto')
                .eq('socio_id', socio.id);

            if (errorPagos) {
                console.error('Error al cargar pagos:', errorPagos);
            }

            // Calcular saldo: total cupones - total pagos aplicados
            // Saldo positivo = debe dinero, Saldo negativo = saldo a favor
            const totalCupones = todosLosCupones?.reduce((sum, c) => sum + (parseFloat(c.monto_total.toString()) || 0), 0) || 0;
            
            // Obtener todos los pagos_cupones para calcular total aplicado
            const pagosIds = pagos?.map(p => p.id) || [];
            let totalAplicado = 0;
            
            if (pagosIds.length > 0) {
                const { data: pagosCupones } = await supabase
                    .from('pagos_cupones')
                    .select('monto_aplicado')
                    .in('pago_id', pagosIds);
                
                totalAplicado = pagosCupones?.reduce(
                    (sum, pc) => sum + parseFloat(pc.monto_aplicado.toString()),
                    0
                ) || 0;
            }
            
            const saldo = totalAplicado - totalCupones; // Negativo = debe, Positivo = a favor
            const cuponesPendientesCount = cuponesPendientes?.length || 0;

            setResumenCuenta({
                saldo,
                cuponesPendientes: cuponesPendientesCount,
            });
        } catch (err) {
            console.error('Error al cargar resumen de cuenta:', err);
        }
    };

    const cargarHistorialMovimientos = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            
            // Usar la nueva función que genera historial cronológico con saldo acumulado
            const historial = await generarHistorialCronologico(socio.id, supabase);
            
            // Mantener orden cronológico (más antiguos primero) para la tabla tipo extracto bancario
            // El historial ya viene ordenado cronológicamente de generarHistorialCronologico
            
            setHistorialMovimientos(historial);
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

    const movimientosFiltrados = historialMovimientos
        .filter(mov => {
            if (filtroHistorial === 'todos') return true;
        // Mapear 'cupones' -> 'cupon' y 'pagos' -> 'pago'
        if (filtroHistorial === 'cupones') return mov.tipo === 'cupon';
        if (filtroHistorial === 'pagos') return mov.tipo === 'pago';
            return false;
        })
        .reverse(); // Invertir orden para mostrar más recientes primero

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

    // Helper para formatear fecha en formato DD/MM/YYYY
    const formatFechaTabla = (fecha: string, mov?: MovimientoCronologico) => {
        // Si es un cupón, usar el día 1 del período en lugar de la fecha de emisión
        if (mov && mov.tipo === 'cupon' && mov.detalle) {
            const cupon = mov.detalle;
            if (cupon.periodo_mes && cupon.periodo_anio) {
                const day = '01';
                const month = String(cupon.periodo_mes).padStart(2, '0');
                const year = cupon.periodo_anio;
                return `${day}/${month}/${year}`;
            }
        }
        
        // Para pagos o si no hay período, usar la fecha original
        const date = new Date(fecha);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Helper para generar descripción detallada de cupón
    const getDescripcionCupon = (mov: MovimientoCronologico): string => {
        const cupon = mov.detalle;
        if (!cupon) return mov.concepto || 'Cupón';

        let descripcion = '';
        
        // Agregar concepto principal si existe
        if (cupon.concepto) {
            descripcion = cupon.concepto;
        } else {
            // Si no hay concepto, intentar obtener del primer item si está cargado
            const items = itemsCupones.get(cupon.id);
            if (items && items.length > 0) {
                descripcion = items[0].descripcion;
            } else {
                // Si no hay items cargados, usar descripción genérica
                descripcion = 'Cuota social';
            }
        }

        // Agregar número de cupón y período
        if (cupon.numero_cupon) {
            descripcion = `Cupón ${cupon.numero_cupon} - ${descripcion}`;
        }
        
        // Agregar período si existe
        if (cupon.periodo_mes && cupon.periodo_anio) {
            descripcion += ` (${String(cupon.periodo_mes).padStart(2, '0')}/${cupon.periodo_anio})`;
        }

        // Agregar estado si es relevante
        if (cupon.estado === 'vencido') {
            descripcion += ' - Vencido';
        } else if (cupon.estado === 'parcialmente_pagado') {
            descripcion += ' - Parcialmente pagado';
        }

        return descripcion;
    };

    // Helper para generar descripción detallada de pago
    const getDescripcionPago = (mov: MovimientoCronologico): string => {
        const pago = mov.detalle;
        if (!pago) return mov.concepto || 'Pago';

        let descripcion = getMetodoPagoLabel(pago.metodo_pago);

        // Agregar referencia bancaria si existe
        if (pago.referencia_bancaria) {
            descripcion += ` - Ref: ${pago.referencia_bancaria}`;
        }

        // Agregar número de comprobante si existe
        if (pago.numero_comprobante) {
            descripcion += ` - Comp: ${pago.numero_comprobante}`;
        }

        // Agregar información del cupón aplicado si existe
        if (mov.cuponId && pago.id) {
            const cuponesDelPago = cuponesPagos.get(pago.id);
            if (cuponesDelPago && cuponesDelPago.length > 0) {
                const cuponesNums = cuponesDelPago.map((pc: any) => 
                    pc.cupon?.numero_cupon || `Cupón #${pc.cupon_id}`
                ).join(', ');
                if (cuponesDelPago.length === 1) {
                    descripcion += ` - Aplicado a ${cuponesNums}`;
                } else {
                    descripcion += ` - Aplicado a: ${cuponesNums}`;
                }
            }
        } else if (mov.esSaldoAFavor) {
            // Si el pago no tiene cupones asociados, indicar que quedó como saldo a favor
            descripcion += ' - Guardado como saldo a favor';
        }

        // Agregar observaciones si son relevantes y cortas
        if (pago.observaciones && pago.observaciones.length < 50) {
            descripcion += ` - ${pago.observaciones}`;
        }

        return descripcion;
    };

    // Helper para obtener el importe formateado (negativo para cupones, positivo para pagos)
    const getImporteFormateado = (mov: MovimientoCronologico): string => {
        const monto = mov.tipo === 'cupon' 
            ? -mov.monto  // Cupones como negativo
            : (mov.montoAplicado || mov.monto); // Pagos como positivo
        
        const signo = monto < 0 ? '-' : '';
        return `${signo}$ ${Math.abs(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getMovimientoKey = (mov: MovimientoCronologico, index: number) => {
        if (mov.tipo === 'cupon' && mov.cuponId) return `cupon-${mov.cuponId}`;
        if (mov.tipo === 'pago' && mov.pagoId) return `pago-${mov.pagoId}-${mov.cuponId || 'none'}`;
        return `mov-${index}`;
    };

    const toggleMovimiento = async (mov: MovimientoCronologico, index: number) => {
        const key = getMovimientoKey(mov, index);
        const nuevoExpandidos = new Set(movimientosExpandidos);
        
        if (nuevoExpandidos.has(key)) {
            nuevoExpandidos.delete(key);
        } else {
            nuevoExpandidos.add(key);
            
            // Cargar items si es un cupón
            if (mov.tipo === 'cupon' && (mov.cuponId || mov.detalle?.id)) {
                const cuponId = mov.cuponId || mov.detalle.id;
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
            if (mov.tipo === 'pago' && (mov.pagoId || mov.detalle?.id)) {
                const pagoId = mov.pagoId || mov.detalle.id;
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

    const isMovimientoExpandido = (mov: MovimientoCronologico, index: number) => {
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
                            <h3 className="text-base font-medium text-gray-700 mb-3">
                                Resumen de Cuenta
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Saldo</p>
                                        <p className={`text-xl font-semibold ${
                                            resumenCuenta.saldo > 0 
                                                ? 'text-green-600' 
                                                : resumenCuenta.saldo < 0 
                                                ? 'text-red-600' 
                                                : 'text-gray-900'
                                        }`}>
                                            {resumenCuenta.saldo < 0 ? '-' : resumenCuenta.saldo > 0 ? '+' : ''}${Math.abs(resumenCuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className={`text-sm font-normal ml-2 ${
                                                resumenCuenta.saldo > 0 
                                                    ? 'text-green-600' 
                                                    : resumenCuenta.saldo < 0 
                                                    ? 'text-red-600' 
                                                    : 'text-gray-600'
                                            }`}>
                                                {resumenCuenta.saldo < 0 ? '(Debe)' : resumenCuenta.saldo > 0 ? '(A favor)' : '(Al día)'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Cupones Pendientes</p>
                                        <p className="text-xl font-semibold text-gray-900">
                                            {resumenCuenta.cuponesPendientes}
                                            <span className="text-sm font-normal text-gray-600 ml-2">
                                                {resumenCuenta.cuponesPendientes === 1 ? 'cupón' : 'cupones'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Keywords Relacionadas */}
                        <div>
                            <SocioKeywordsPanel socioId={socio.id} />
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
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto" style={{ maxHeight: '42rem', overflowY: 'auto' }}>
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Fecha
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Tipo
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Descripción
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Importe
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Saldo
                                                    </th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                        Acciones
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {movimientosFiltrados.map((mov, index) => {
                                                    const cupon = mov.tipo === 'cupon' ? mov.detalle : null;
                                                    const pago = mov.tipo === 'pago' ? mov.detalle : null;
                                                    const descripcion = mov.tipo === 'cupon' 
                                                        ? getDescripcionCupon(mov)
                                                        : getDescripcionPago(mov);
                                                    const importe = getImporteFormateado(mov);
                                                    const saldo = mov.saldoAcumulado !== undefined 
                                                        ? mov.saldoAcumulado 
                                                        : 0;
                                                    const expandido = isMovimientoExpandido(mov, index);
                                                    const saldoPendiente = mov.saldoPendienteCupon;
                                                    
                                                    return (
                                                        <React.Fragment key={index}>
                                                            <tr 
                                                                className="hover:bg-gray-50 transition-colors"
                                                            >
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                    {formatFechaTabla(mov.fecha, mov)}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                                        {mov.tipo === 'cupon' ? 'Cupón' : 'Pago'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                    {descripcion}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                                    {importe}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                                                    $ {saldo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                                    <button
                                                                        onClick={() => toggleMovimiento(mov, index)}
                                                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                                        aria-label={expandido ? 'Colapsar detalles' : 'Expandir detalles'}
                                                                    >
                                                                        <svg
                                                                            className={`w-5 h-5 transition-transform ${expandido ? 'rotate-90' : ''}`}
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                        </svg>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {expandido && (
                                                                <tr className="bg-gray-50">
                                                                    <td colSpan={6} className="px-4 py-4">
                                                                        {mov.tipo === 'cupon' && cupon && (
                                                                            <div className="space-y-4">
                                                                                {/* Información del Cupón - Colapsable */}
                                                                                <div className="border border-gray-200 rounded-lg bg-white">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const nuevo = new Map(infoCuponColapsada);
                                                                                            nuevo.set(cupon.id, !nuevo.get(cupon.id));
                                                                                            setInfoCuponColapsada(nuevo);
                                                                                        }}
                                                                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
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
                                                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                                                                                                    <p className="text-gray-900 font-medium">{cupon.numero_cupon}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                                                                                                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                                                                                                        cupon.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                                                                                                        cupon.estado === 'vencido' ? 'bg-red-100 text-red-800' :
                                                                                                        'bg-yellow-100 text-yellow-800'
                                                                                                    }`}>
                                                                                                        {formatEstado(cupon.estado)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
                                                                                                    <p className="text-gray-900">{cupon.periodo_mes}/{cupon.periodo_anio}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Emisión</label>
                                                                                                    <p className="text-gray-900">{formatDate(cupon.fecha_emision)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento</label>
                                                                                                    <p className="text-gray-900">{formatDate(cupon.fecha_vencimiento)}</p>
                                                                                                </div>
                                                                                                {cupon.fecha_pago && (
                                                                                                    <div>
                                                                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Pago</label>
                                                                                                        <p className="text-gray-900">{formatDate(cupon.fecha_pago)}</p>
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
                                                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Monto Aplicado</label>
                                                                                            <p className="text-gray-900 font-semibold">
                                                                                                {mov.montoAplicado 
                                                                                                    ? formatCurrency(mov.montoAplicado)
                                                                                                    : formatCurrency(parseFloat(pago.monto.toString()))
                                                                                                }
                                                                                            </p>
                                                                                            {mov.montoAplicado && mov.montoAplicado !== parseFloat(pago.monto.toString()) && (
                                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                                    (Pago total: {formatCurrency(parseFloat(pago.monto.toString()))})
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                        {saldoPendiente !== undefined && (
                                                                                            <div>
                                                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Saldo Pendiente del Cupón</label>
                                                                                                <p className={`font-semibold ${
                                                                                                    saldoPendiente === 0 ? 'text-green-600' : 'text-orange-600'
                                                                                                }`}>
                                                                                                    {saldoPendiente === 0 
                                                                                                        ? '✅ PAGADO COMPLETAMENTE' 
                                                                                                        : formatCurrency(saldoPendiente)
                                                                                                    }
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
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
                                                                                
                                                                                {/* Nota de Saldo a Favor si no tiene cupones asociados */}
                                                                                {mov.esSaldoAFavor && (!cuponesPagos.has(pago.id) || cuponesPagos.get(pago.id)!.length === 0) && (
                                                                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                                                        <p className="text-xs text-purple-800">
                                                                                            <strong>⚠️ Este pago no tiene cupones asociados.</strong> El monto completo se guardó como saldo a favor y se aplicará automáticamente al próximo cupón generado.
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                                
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
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
