'use client';

import React, { useState, useEffect } from 'react';
import { TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { getMetodoPagoLabel } from '@/app/types/pagos';
import { logger } from '@/app/utils/logger';

interface DashboardSocioProps {
  socio: any;
  onLogout: () => void;
}

export default function DashboardSocio({ socio, onLogout }: DashboardSocioProps) {
  const [configuracion, setConfiguracion] = useState<any>(null);
  const [embarcaciones, setEmbarcaciones] = useState<any[]>([]);
  const [cupones, setCupones] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroHistorial, setFiltroHistorial] = useState<'todos' | 'cupones' | 'pagos'>('todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('todos'); // 'todos' o año específico
  const [movimientosExpandidos, setMovimientosExpandidos] = useState<Set<string>>(new Set());
  const [itemsCupones, setItemsCupones] = useState<Map<number, any[]>>(new Map());
  const [cargandoItems, setCargandoItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarDatos();
  }, [socio]);

  const cargarDatos = async () => {
    try {
      // Cargar todas las APIs en paralelo
      const [configResponse, embarcacionesResponse, cuponesResponse, pagosResponse] = await Promise.all([
        fetch('/api/portal/configuracion'),
        fetch('/api/portal/embarcaciones'),
        fetch('/api/portal/cupones'),
        fetch('/api/portal/pagos'),
      ]);

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfiguracion(configData.configuracion);
      }

      if (embarcacionesResponse.ok) {
        const embarcacionesData = await embarcacionesResponse.json();
        setEmbarcaciones(embarcacionesData.embarcaciones || []);
      }

      if (cuponesResponse.ok) {
        const cuponesData = await cuponesResponse.json();
        setCupones(cuponesData.cupones || []);
      }

      if (pagosResponse.ok) {
        const pagosData = await pagosResponse.json();
        setPagos(pagosData.pagos || []);
      }
    } catch (error) {
      logger.error('Error al cargar datos:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const copiarAlPortapapeles = async (texto: string, label: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      // Mostrar feedback visual (podría mejorarse con un toast)
      const button = document.activeElement as HTMLElement;
      const originalText = button.textContent;
      button.textContent = '✓ Copiado';
      button.classList.add('bg-green-100', 'text-green-700');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-100', 'text-green-700');
      }, 2000);
    } catch (err) {
      logger.error('Error al copiar:', err);
    }
  };

  // Calcular resumen de cuenta
  // Obtener cupones pendientes para mostrar información
  const cuponesPendientes = cupones.filter(c => c.estado === 'pendiente' || c.estado === 'vencido');
  const cuponesPendientesOrdenados = [...cuponesPendientes].sort((a, b) => 
    new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
  );
  
  // Calcular saldo (total pagado - todos los cupones)
  // Negativo = debe, Positivo = a favor
  const totalCupones = cupones.reduce((sum, c) => sum + parseFloat(c.monto_total.toString()), 0);
  const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0);
  const saldo = totalPagado - totalCupones;

  // Último pago
  const ultimoPago = pagos.length > 0 ? pagos[0] : null;

  // Historial unificado
  const historialMovimientos: any[] = [];
  
  cupones.forEach(cupon => {
    // Usar el día 1 del mes del período como fecha para el cupón (igual que el admin)
    let fechaCupon: string;
    if (cupon.periodo_mes && cupon.periodo_anio) {
      const month = String(cupon.periodo_mes).padStart(2, '0');
      const year = cupon.periodo_anio;
      fechaCupon = `${year}-${month}-01`; // Formato YYYY-MM-DD
    } else {
      fechaCupon = cupon.fecha_emision; // Fallback a fecha de emisión si no hay período
    }
    
    historialMovimientos.push({
      tipo: 'cupon',
      fecha: fechaCupon, // Usar día 1 del período para ordenar
      fechaVencimiento: cupon.fecha_vencimiento, // Guardar fecha de vencimiento para mostrar
      fechaOrden: new Date(fechaCupon).getTime(),
      concepto: `Cupón ${cupon.numero_cupon}`,
      periodo: `${String(cupon.periodo_mes).padStart(2, '0')}/${cupon.periodo_anio}`,
      monto: parseFloat(cupon.monto_total.toString()),
      estado: cupon.estado,
      detalle: cupon,
    });
  });

  pagos.forEach(pago => {
    historialMovimientos.push({
      tipo: 'pago',
      fecha: pago.fecha_pago,
      fechaOrden: new Date(pago.fecha_pago).getTime(),
      concepto: `Pago - ${getMetodoPagoLabel(pago.metodo_pago)}`,
      monto: parseFloat(pago.monto.toString()),
      estado: pago.estado_conciliacion,
      detalle: pago,
    });
  });

  historialMovimientos.sort((a, b) => b.fechaOrden - a.fechaOrden);

  // Extraer años disponibles del historial
  const aniosSet = new Set<number>();
  historialMovimientos.forEach(mov => {
    const fecha = new Date(mov.fecha);
    aniosSet.add(fecha.getFullYear());
  });
  const aniosDisponibles = Array.from(aniosSet).sort((a, b) => b - a); // Más reciente primero

  const movimientosFiltrados = historialMovimientos.filter(mov => {
    // Filtro por tipo
    if (filtroHistorial !== 'todos') {
      if (filtroHistorial === 'cupones' && mov.tipo !== 'cupon') return false;
      if (filtroHistorial === 'pagos' && mov.tipo !== 'pago') return false;
    }
    
    // Filtro por año
    if (filtroAnio !== 'todos') {
      const anioMovimiento = new Date(mov.fecha).getFullYear();
      if (anioMovimiento !== parseInt(filtroAnio)) return false;
    }
    
    return true;
  });

  const getMovimientoKey = (mov: any, index: number) => {
    if (mov.tipo === 'cupon') return `cupon-${mov.detalle.id}`;
    if (mov.tipo === 'pago') return `pago-${mov.detalle.id}`;
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
        const itemKey = `items-${cuponId}`;
        if (!itemsCupones.has(cuponId) && !cargandoItems.has(itemKey)) {
          setCargandoItems(prev => new Set(prev).add(itemKey));
          try {
            const response = await fetch(`/api/portal/cupones/${cuponId}/items`);
            if (response.ok) {
              const data = await response.json();
              setItemsCupones(prev => new Map(prev).set(cuponId, data.items || []));
            }
          } catch (err) {
            logger.error('Error al cargar items del cupón:', err);
          } finally {
            setCargandoItems(prev => {
              const nuevo = new Set(prev);
              nuevo.delete(itemKey);
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

  const getTipoLabel = (tipo: string) => {
    const tipoObj = TIPOS_EMBARCACION.find((t) => t.value === tipo);
    return tipoObj?.label || tipo;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Mi Cuenta
              </h1>
              <p className="text-sm sm:text-base text-gray-600 truncate">
                {socio.apellido}, {socio.nombre}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="ml-4 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Información Personal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Información Personal
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Número de Socio</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">#{socio.numero_socio}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Nombre Completo</p>
                <p className="text-base sm:text-lg font-medium text-gray-900">
                  {socio.apellido}, {socio.nombre}
                </p>
              </div>
            </div>

            {embarcaciones.length > 0 && (
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">Embarcaciones</p>
                <div className="space-y-2">
                  {embarcaciones.map((emb) => (
                    <div
                      key={emb.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{emb.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm text-gray-600">
                          {getTipoLabel(emb.tipo)}
                        </span>
                        {emb.matricula && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              Matrícula: {emb.matricula}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de Cuenta */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-medium text-gray-700 mb-3">
            Resumen de Cuenta
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Saldo</p>
                <p className={`text-xl font-semibold ${
                  saldo > 0 
                    ? 'text-green-600' 
                    : saldo < 0 
                    ? 'text-red-600' 
                    : 'text-gray-900'
                }`}>
                  {saldo < 0 ? '-' : saldo > 0 ? '+' : ''}${Math.abs(saldo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className={`text-sm font-normal ml-2 ${
                    saldo > 0 
                      ? 'text-green-600' 
                      : saldo < 0 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                  }`}>
                    {saldo < 0 ? '(Debe)' : saldo > 0 ? '(A favor)' : '(Al día)'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Cupones Pendientes</p>
                <p className="text-xl font-semibold text-gray-900">
                  {cuponesPendientes.length}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    {cuponesPendientes.length === 1 ? 'cupón' : 'cupones'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Cupones por Vencer */}
          {cuponesPendientes.length > 0 && (
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
                Cupones por Vencer
              </h3>
              <div className="space-y-2">
                {cuponesPendientesOrdenados.slice(0, 5).map((cupon) => {
                  const fechaVenc = new Date(cupon.fecha_vencimiento);
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  fechaVenc.setHours(0, 0, 0, 0);
                  const dias = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={cupon.id}
                      className={`p-3 rounded-lg border ${
                        dias < 0
                          ? 'bg-red-50 border-red-200'
                          : dias <= 7
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">
                            Cupón {cupon.numero_cupon}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-600">
                              {String(cupon.periodo_mes).padStart(2, '0')}/{cupon.periodo_anio}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-600">
                              Vence: {formatDate(cupon.fecha_vencimiento)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">
                            {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            cupon.estado === 'vencido'
                              ? 'bg-red-100 text-red-800'
                              : dias <= 7
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cupon.estado === 'vencido' ? 'Vencido' : dias <= 7 ? 'Por vencer' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cuponesPendientes.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Y {cuponesPendientes.length - 5} cupón{cuponesPendientes.length - 5 !== 1 ? 'es' : ''} más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Último Pago */}
        {ultimoPago && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Último Pago
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Fecha</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">
                  {formatDate(ultimoPago.fecha_pago)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Monto</p>
                <p className="text-sm sm:text-base font-semibold text-green-700">
                  {formatCurrency(parseFloat(ultimoPago.monto.toString()))}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Método</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">
                  {getMetodoPagoLabel(ultimoPago.metodo_pago)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Estado</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                  ultimoPago.estado_conciliacion === 'conciliado'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {ultimoPago.estado_conciliacion === 'conciliado' ? 'Conciliado' : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Pagos y Movimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Historial
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Filtro por tipo */}
                <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 flex-1 sm:flex-initial">
                  <button
                    onClick={() => setFiltroHistorial('todos')}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors flex-1 sm:flex-initial ${
                      filtroHistorial === 'todos'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroHistorial('cupones')}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors flex-1 sm:flex-initial ${
                      filtroHistorial === 'cupones'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Cupones
                  </button>
                  <button
                    onClick={() => setFiltroHistorial('pagos')}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors flex-1 sm:flex-initial ${
                      filtroHistorial === 'pagos'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Pagos
                  </button>
                </div>
                
                {/* Filtro por año */}
                {aniosDisponibles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Año:</label>
                    <select
                      value={filtroAnio}
                      onChange={(e) => setFiltroAnio(e.target.value)}
                      className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todos</option>
                      {aniosDisponibles.map(anio => (
                        <option key={anio} value={anio}>{anio}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {movimientosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="space-y-3">
              {movimientosFiltrados.map((mov, index) => {
                const expandido = isMovimientoExpandido(mov, index);
                const cupon = mov.tipo === 'cupon' ? mov.detalle : null;
                const pago = mov.tipo === 'pago' ? mov.detalle : null;
                const itemKey = mov.tipo === 'cupon' ? `items-${cupon?.id}` : '';
                const cargando = mov.tipo === 'cupon' ? cargandoItems.has(itemKey) : false;

                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleMovimiento(mov, index)}
                      className="w-full p-3 sm:p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                                expandido ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {mov.tipo === 'cupon' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                                </svg>
                                Cupón
                              </span>
                            ) : pago?.metodo_pago === 'saldo_a_favor' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                                </svg>
                                Crédito Auto
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                                </svg>
                                Pago
                              </span>
                            )}
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              {mov.concepto}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap ml-6">
                            {mov.tipo === 'cupon' && mov.fechaVencimiento ? (
                              <span>Vence: {formatDate(mov.fechaVencimiento)}</span>
                            ) : (
                              <span>{formatDate(mov.fecha)}</span>
                            )}
                            {mov.periodo && (
                              <>
                                <span>•</span>
                                <span>Período: {mov.periodo}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-semibold text-sm sm:text-base ${
                            mov.tipo === 'cupon' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {mov.tipo === 'cupon' ? '-' : '+'}{formatCurrency(mov.monto)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                            mov.estado === 'pagado' || mov.estado === 'conciliado'
                              ? 'bg-green-100 text-green-800'
                              : mov.estado === 'vencido'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {mov.estado === 'conciliado' ? 'Conciliado' : 
                             mov.estado === 'pagado' ? 'Pagado' :
                             mov.estado === 'vencido' ? 'Vencido' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </button>

                    {expandido && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                        {mov.tipo === 'cupon' && cupon && (
                          <>
                            {/* Items del Cupón */}
                            {cargando ? (
                              <div className="text-center py-4 text-sm text-gray-500">
                                Cargando items...
                              </div>
                            ) : itemsCupones.has(cupon.id) && itemsCupones.get(cupon.id)!.length > 0 ? (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                  Items del Cupón
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-100">
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
                                          <td className="px-3 py-2 text-gray-900 text-xs sm:text-sm">{item.descripcion}</td>
                                          <td className="px-3 py-2 text-right text-gray-900 text-xs sm:text-sm">{item.cantidad}</td>
                                          <td className="px-3 py-2 text-right text-gray-900 text-xs sm:text-sm">
                                            {item.precio_unitario ? formatCurrency(parseFloat(item.precio_unitario.toString())) : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-gray-900 text-xs sm:text-sm">
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
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                                  {cupon.observaciones}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {mov.tipo === 'pago' && pago && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                              <p className="text-gray-900">{formatDate(pago.fecha_pago)}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                              <p className="text-gray-900 font-semibold">{formatCurrency(parseFloat(pago.monto.toString()))}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Método</label>
                              <p className="text-gray-900">{getMetodoPagoLabel(pago.metodo_pago)}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                                pago.estado_conciliacion === 'conciliado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {pago.estado_conciliacion === 'conciliado' ? 'Conciliado' : 'Pendiente'}
                              </span>
                            </div>
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

        {/* Sección Cómo Pagar */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border-2 border-blue-200 p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                Cómo Pagar
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Datos bancarios para realizar transferencias
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Datos Bancarios */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-blue-200 space-y-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Banco</p>
                <p className="text-sm sm:text-base text-gray-900">BANCO SANTANDER RIO (Sucursal Santa Rosa)</p>
              </div>
              
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Cuenta Corriente</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">278/5 Sucursal 453</p>
              </div>

              {/* CBU */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700">CBU</p>
                  <button
                    onClick={() => copiarAlPortapapeles('0720453520000000027854', 'CBU')}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar
                  </button>
                </div>
                <p className="text-base sm:text-lg font-mono text-gray-900 break-all bg-gray-50 p-2 rounded">
                  0720453520000000027854
                </p>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de la Cuenta</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">NUEVO CLUB NAUTICO EMBALSE</p>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">CUIT</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-mono text-gray-900">30708583029</p>
                  <button
                    onClick={() => copiarAlPortapapeles('30708583029', 'CUIT')}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    title="Copiar CUIT"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mensaje Importante sobre Comprobante */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-yellow-900 mb-2">
                    Es IMPRESCINDIBLE enviar el comprobante
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-800 mb-3">
                    Para que se acredite el pago, debe enviar el comprobante del mismo vía:
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-yellow-800">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-medium">WhatsApp:</span>
                      <a 
                        href="https://wa.me/543512350673" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-mono"
                      >
                        351-2350673
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Email:</span>
                      <a 
                        href="mailto:ingenia.controldeacceso@gmail.com"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        ingenia.controldeacceso@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-xs sm:text-sm text-yellow-800">
                      <span className="font-semibold">→ SI ES NECESARIO:</span> Cuando son cuentas de terceros o empresas y no se puede identificar al socio
                    </p>
                    <p className="text-xs sm:text-sm text-yellow-800 mt-1">
                      <span className="font-semibold">→ NO ES NECESARIO:</span> Cuando son cuentas personales a nombre del socio
                    </p>
                    <p className="text-xs sm:text-sm text-yellow-900 font-medium mt-2">
                      Ya hay varios casos de transferencias de MONTOS IMPORTANTES sin poder acreditar al Socio correspondiente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instrucciones de Pago */}
            <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Instrucciones para realizar el pago:</p>
              <ol className="text-xs sm:text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Realice la transferencia bancaria por el monto total de sus cupones pendientes</li>
                <li>Use el CBU y los datos bancarios mostrados arriba</li>
                <li>Envíe el comprobante de pago vía WhatsApp o Email (ver información arriba)</li>
                <li>Una vez recibido y verificado, su pago será conciliado</li>
                <li>Puede verificar el estado de su pago en la sección "Historial"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
