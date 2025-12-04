'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/app/utils/formatDate';

interface SocioDeuda {
    id: number;
    numero_socio: number;
    apellido: string;
    nombre: string;
    deuda_total: number;
}

interface CuponVencido {
    id: number;
    numero_cupon: string;
    socio_id: number;
    socio_nombre: string;
    socio_apellido: string;
    monto_total: number;
    fecha_vencimiento: string;
    dias_vencidos: number;
}

interface IngresoMensual {
    mes: string;
    anio: number;
    mes_numero: number;
    total: number;
}

export default function ReportesClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sociosDeuda, setSociosDeuda] = useState<SocioDeuda[]>([]);
    const [cuponesVencidos, setCuponesVencidos] = useState<CuponVencido[]>([]);
    const [ingresosMensuales, setIngresosMensuales] = useState<IngresoMensual[]>([]);
    const [comparacionAnio, setComparacionAnio] = useState<{
        mesActual: number;
        anioActual: number;
        mesAnterior: number;
        anioAnterior: number;
        ingresosActual: number;
        ingresosAnterior: number;
        diferencia: number;
        porcentaje: number;
    } | null>(null);

    useEffect(() => {
        cargarReportes();
    }, []);

    const cargarReportes = async () => {
        setLoading(true);
        try {
            await Promise.all([
                cargarSociosDeuda(),
                cargarCuponesVencidos(),
                cargarIngresosMensuales(),
                cargarComparacionAnio(),
            ]);
        } catch (err) {
            console.error('Error al cargar reportes:', err);
        } finally {
            setLoading(false);
        }
    };

    const cargarSociosDeuda = async () => {
        try {
            const supabase = createClient();
            
            // Obtener todos los cupones pendientes
            const { data: cupones, error } = await supabase
                .from('cupones')
                .select(`
                    id,
                    socio_id,
                    monto_total,
                    socio:socios (
                        id,
                        numero_socio,
                        apellido,
                        nombre
                    )
                `)
                .eq('estado', 'pendiente');

            if (error) {
                console.error('Error al cargar cupones:', error);
                return;
            }

            // Agrupar por socio y calcular deuda total
            const deudaPorSocio = new Map<number, {
                socio: any;
                deuda: number;
            }>();

            cupones?.forEach((cupon: any) => {
                if (cupon.socio) {
                    const socioId = cupon.socio.id;
                    const monto = parseFloat(cupon.monto_total.toString()) || 0;
                    
                    if (deudaPorSocio.has(socioId)) {
                        const actual = deudaPorSocio.get(socioId)!;
                        actual.deuda += monto;
                    } else {
                        deudaPorSocio.set(socioId, {
                            socio: cupon.socio,
                            deuda: monto,
                        });
                    }
                }
            });

            // Convertir a array y ordenar
            const socios: SocioDeuda[] = Array.from(deudaPorSocio.values())
                .map(item => ({
                    id: item.socio.id,
                    numero_socio: item.socio.numero_socio,
                    apellido: item.socio.apellido,
                    nombre: item.socio.nombre,
                    deuda_total: item.deuda,
                }))
                .sort((a, b) => {
                    // Primero por deuda (descendente)
                    if (b.deuda_total !== a.deuda_total) {
                        return b.deuda_total - a.deuda_total;
                    }
                    // Luego por apellido (ascendente)
                    return a.apellido.localeCompare(b.apellido);
                });

            setSociosDeuda(socios);
        } catch (err) {
            console.error('Error al cargar socios con deuda:', err);
        }
    };

    const cargarCuponesVencidos = async () => {
        try {
            const supabase = createClient();
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const { data: cupones, error } = await supabase
                .from('cupones')
                .select(`
                    id,
                    numero_cupon,
                    socio_id,
                    monto_total,
                    fecha_vencimiento,
                    socio:socios (
                        apellido,
                        nombre
                    )
                `)
                .eq('estado', 'vencido')
                .order('fecha_vencimiento', { ascending: true })
                .limit(20);

            if (error) {
                console.error('Error al cargar cupones vencidos:', error);
                return;
            }

            const cuponesVencidos: CuponVencido[] = (cupones || []).map((cupon: any) => {
                const fechaVenc = new Date(cupon.fecha_vencimiento);
                fechaVenc.setHours(0, 0, 0, 0);
                const diasVencidos = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    id: cupon.id,
                    numero_cupon: cupon.numero_cupon,
                    socio_id: cupon.socio_id,
                    socio_nombre: cupon.socio?.nombre || 'N/A',
                    socio_apellido: cupon.socio?.apellido || 'N/A',
                    monto_total: parseFloat(cupon.monto_total.toString()) || 0,
                    fecha_vencimiento: cupon.fecha_vencimiento,
                    dias_vencidos: diasVencidos,
                };
            });

            setCuponesVencidos(cuponesVencidos);
        } catch (err) {
            console.error('Error al cargar cupones vencidos:', err);
        }
    };

    const cargarIngresosMensuales = async () => {
        try {
            const supabase = createClient();
            const hoy = new Date();
            const hace6Meses = new Date();
            hace6Meses.setMonth(hace6Meses.getMonth() - 6);
            hace6Meses.setDate(1); // Primer día del mes

            const { data: pagos, error } = await supabase
                .from('pagos')
                .select('fecha_pago, monto')
                .gte('fecha_pago', hace6Meses.toISOString().split('T')[0])
                .lte('fecha_pago', hoy.toISOString().split('T')[0]);

            if (error) {
                console.error('Error al cargar pagos:', error);
                return;
            }

            // Agrupar por mes
            const ingresosPorMes = new Map<string, number>();

            pagos?.forEach((pago: any) => {
                const fecha = new Date(pago.fecha_pago);
                const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                const monto = parseFloat(pago.monto.toString()) || 0;
                
                if (ingresosPorMes.has(clave)) {
                    ingresosPorMes.set(clave, ingresosPorMes.get(clave)! + monto);
                } else {
                    ingresosPorMes.set(clave, monto);
                }
            });

            // Convertir a array y ordenar
            const meses: IngresoMensual[] = Array.from(ingresosPorMes.entries())
                .map(([clave, total]) => {
                    const [anio, mes] = clave.split('-');
                    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    return {
                        mes: mesesNombres[parseInt(mes) - 1],
                        anio: parseInt(anio),
                        mes_numero: parseInt(mes),
                        total,
                    };
                })
                .sort((a, b) => {
                    if (a.anio !== b.anio) return b.anio - a.anio;
                    return b.mes_numero - a.mes_numero;
                });

            setIngresosMensuales(meses);
        } catch (err) {
            console.error('Error al cargar ingresos mensuales:', err);
        }
    };

    const cargarComparacionAnio = async () => {
        try {
            const supabase = createClient();
            const hoy = new Date();
            const mesActual = hoy.getMonth() + 1;
            const anioActual = hoy.getFullYear();
            const anioAnterior = anioActual - 1;

            // Primer y último día del mes actual
            const inicioMesActual = new Date(anioActual, mesActual - 1, 1);
            const finMesActual = new Date(anioActual, mesActual, 0);

            // Primer y último día del mismo mes del año anterior
            const inicioMesAnterior = new Date(anioAnterior, mesActual - 1, 1);
            const finMesAnterior = new Date(anioAnterior, mesActual, 0);

            const [pagosActual, pagosAnterior] = await Promise.all([
                supabase
                    .from('pagos')
                    .select('monto')
                    .gte('fecha_pago', inicioMesActual.toISOString().split('T')[0])
                    .lte('fecha_pago', finMesActual.toISOString().split('T')[0]),
                supabase
                    .from('pagos')
                    .select('monto')
                    .gte('fecha_pago', inicioMesAnterior.toISOString().split('T')[0])
                    .lte('fecha_pago', finMesAnterior.toISOString().split('T')[0]),
            ]);

            const ingresosActual = pagosActual.data?.reduce((sum, p) => sum + (parseFloat(p.monto.toString()) || 0), 0) || 0;
            const ingresosAnterior = pagosAnterior.data?.reduce((sum, p) => sum + (parseFloat(p.monto.toString()) || 0), 0) || 0;
            const diferencia = ingresosActual - ingresosAnterior;
            const porcentaje = ingresosAnterior > 0 ? (diferencia / ingresosAnterior) * 100 : 0;

            setComparacionAnio({
                mesActual,
                anioActual,
                mesAnterior: mesActual,
                anioAnterior,
                ingresosActual,
                ingresosAnterior,
                diferencia,
                porcentaje,
            });
        } catch (err) {
            console.error('Error al cargar comparación:', err);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-gray-500">Cargando reportes...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
                    <p className="text-gray-600 mt-1">Resumen de información clave del sistema</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Widget: Socios con Mayor Deuda */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Socios con Mayor Deuda</h2>
                        </div>
                        
                        {sociosDeuda.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No hay socios con deuda</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sociosDeuda.map((socio) => (
                                    <div
                                        key={socio.id}
                                        onClick={() => router.push(`/socios/${socio.id}`)}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {socio.apellido}, {socio.nombre}
                                            </p>
                                            <p className="text-xs text-gray-500">Socio #{socio.numero_socio}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-red-600">
                                                {formatCurrency(socio.deuda_total)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Widget: Cupones Vencidos */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Cupones Vencidos</h2>
                        </div>
                        
                        {cuponesVencidos.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No hay cupones vencidos</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {cuponesVencidos.map((cupon) => (
                                    <div
                                        key={cupon.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">
                                                {cupon.numero_cupon}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {cupon.socio_apellido}, {cupon.socio_nombre}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(cupon.fecha_vencimiento)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-orange-600 text-sm">
                                                {formatCurrency(cupon.monto_total)}
                                            </p>
                                            <p className="text-xs text-red-600 font-medium">
                                                {cupon.dias_vencidos} {cupon.dias_vencidos === 1 ? 'día' : 'días'} vencido
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Widget: Ingresos por Mes */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Ingresos por Mes</h2>
                        </div>
                        
                        {ingresosMensuales.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No hay ingresos registrados</p>
                        ) : (
                            <div className="space-y-2">
                                {ingresosMensuales.map((ingreso, index) => (
                                    <div
                                        key={`${ingreso.anio}-${ingreso.mes_numero}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">
                                                {ingreso.mes} {ingreso.anio}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-600">
                                                {formatCurrency(ingreso.total)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-2 mt-2 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-gray-900">Total (6 meses)</p>
                                        <p className="font-bold text-green-700">
                                            {formatCurrency(ingresosMensuales.reduce((sum, ing) => sum + ing.total, 0))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Widget: Comparación con Año Anterior */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Comparación con Año Anterior</h2>
                        </div>
                        
                        {comparacionAnio ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">
                                        {mesesNombres[comparacionAnio.mesActual - 1]} {comparacionAnio.anioActual}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(comparacionAnio.ingresosActual)}
                                    </p>
                                </div>
                                
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">
                                        {mesesNombres[comparacionAnio.mesAnterior - 1]} {comparacionAnio.anioAnterior}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-600">
                                        {formatCurrency(comparacionAnio.ingresosAnterior)}
                                    </p>
                                </div>
                                
                                <div className={`p-4 rounded-lg border-2 ${
                                    comparacionAnio.diferencia >= 0
                                        ? 'bg-green-50 border-green-300'
                                        : 'bg-red-50 border-red-300'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={`font-semibold ${
                                            comparacionAnio.diferencia >= 0 ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            Diferencia
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {comparacionAnio.diferencia >= 0 ? (
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                                </svg>
                                            )}
                                            <p className={`text-xl font-bold ${
                                                comparacionAnio.diferencia >= 0 ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {comparacionAnio.diferencia >= 0 ? '+' : ''}{formatCurrency(comparacionAnio.diferencia)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-medium ${
                                        comparacionAnio.diferencia >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {comparacionAnio.porcentaje >= 0 ? '+' : ''}{comparacionAnio.porcentaje.toFixed(1)}% vs año anterior
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay datos para comparar</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

