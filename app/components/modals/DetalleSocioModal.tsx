'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Socio } from '@/app/types/socios';
import { Embarcacion, TIPOS_EMBARCACION } from '@/app/types/embarcaciones';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';

interface DetalleSocioModalProps {
  isOpen: boolean;
  onClose: () => void;
  socio: Socio | null;
}

export default function DetalleSocioModal({
  isOpen,
  onClose,
  socio,
}: DetalleSocioModalProps) {
  const [resumenCuenta, setResumenCuenta] = useState({
    deudaTotal: 0,
    totalPagado: 0,
    itemsPendientes: 0,
  });
  const [historialMovimientos, setHistorialMovimientos] = useState<any[]>([]);
  const [filtroHistorial, setFiltroHistorial] = useState<'todos' | 'cupones' | 'pagos' | 'visitas'>('todos');
  const [embarcaciones, setEmbarcaciones] = useState<Embarcacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmbarcaciones, setLoadingEmbarcaciones] = useState(false);

  useEffect(() => {
    if (isOpen && socio) {
      cargarResumenCuenta();
      cargarHistorialMovimientos();
      cargarEmbarcaciones();
    }
  }, [isOpen, socio]);

  const cargarResumenCuenta = async () => {
    if (!socio) return;
    
    try {
      const supabase = createClient();
      
      // Obtener cupones pendientes
      const { data: cuponesPendientes, error: errorCupones } = await supabase
        .from('cupones')
        .select('monto_total, estado')
        .eq('socio_id', socio.id)
        .in('estado', ['pendiente', 'vencido']);

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
      const itemsPendientes = cuponesPendientes?.length || 0;

      setResumenCuenta({
        deudaTotal,
        totalPagado,
        itemsPendientes,
      });
    } catch (err) {
      console.error('Error al cargar resumen de cuenta:', err);
    }
  };

  const cargarHistorialMovimientos = async () => {
    if (!socio) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      const movimientos: any[] = [];

      // Cargar cupones
      const { data: cupones, error: errorCupones } = await supabase
        .from('cupones')
        .select('*')
        .eq('socio_id', socio.id)
        .order('fecha_emision', { ascending: false })
        .limit(50);

      if (!errorCupones && cupones) {
        cupones.forEach(cupon => {
          movimientos.push({
            tipo: 'cupon',
            fecha: cupon.fecha_emision,
            concepto: `Cupón ${cupon.numero_cupon}`,
            monto: cupon.monto_total,
            estado: cupon.estado,
            detalle: cupon,
          });
        });
      }

      // Cargar pagos
      const { data: pagos, error: errorPagos } = await supabase
        .from('pagos')
        .select('*')
        .eq('socio_id', socio.id)
        .order('fecha_pago', { ascending: false })
        .limit(50);

      if (!errorPagos && pagos) {
        pagos.forEach(pago => {
          movimientos.push({
            tipo: 'pago',
            fecha: pago.fecha_pago,
            concepto: `Pago - ${pago.metodo_pago}`,
            monto: pago.monto,
            estado: pago.estado_conciliacion,
            detalle: pago,
          });
        });
      }

      // Cargar visitas
      const { data: visitas, error: errorVisitas } = await supabase
        .from('visitas')
        .select('*')
        .eq('socio_id', socio.id)
        .order('fecha_visita', { ascending: false })
        .limit(50);

      if (!errorVisitas && visitas) {
        visitas.forEach(visita => {
          movimientos.push({
            tipo: 'visita',
            fecha: visita.fecha_visita,
            concepto: `Visita - ${visita.cantidad_visitantes} visitante(s)`,
            monto: visita.monto_total,
            estado: visita.estado,
            detalle: visita,
          });
        });
      }

      // Ordenar por fecha descendente
      movimientos.sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();
        const fechaB = new Date(b.fecha).getTime();
        return fechaB - fechaA;
      });

      setHistorialMovimientos(movimientos);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarEmbarcaciones = async () => {
    if (!socio) return;
    
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

  if (!socio) return null;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Socio" size="lg">
      <div className="space-y-6">
        {/* Información Personal */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información Personal
          </h3>
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
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Información de Contacto
          </h3>
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
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Embarcaciones
          </h3>
          {loadingEmbarcaciones ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
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
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Estado y Membresía
          </h3>
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

        {/* Resumen de Cuenta */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Resumen de Cuenta
          </h3>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700 mb-1">Deuda Total</p>
                <p className="text-2xl font-bold text-red-900">
                  ${resumenCuenta.deudaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700 mb-1">Total Pagado</p>
                <p className="text-2xl font-bold text-green-900">
                  ${resumenCuenta.totalPagado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-700 mb-1">Items Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {resumenCuenta.itemsPendientes}
                </p>
              </div>
            </div>
          )}
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
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filtroHistorial === 'todos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroHistorial('cupones')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filtroHistorial === 'cupones'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cupones
              </button>
              <button
                onClick={() => setFiltroHistorial('pagos')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filtroHistorial === 'pagos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pagos
              </button>
              <button
                onClick={() => setFiltroHistorial('visitas')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filtroHistorial === 'visitas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Visitas
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movimientosFiltrados.map((mov, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          mov.tipo === 'cupon'
                            ? 'bg-blue-100 text-blue-800'
                            : mov.tipo === 'pago'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {mov.tipo === 'cupon' ? 'Cupón' : mov.tipo === 'pago' ? 'Pago' : 'Visita'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {mov.concepto}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(mov.fecha)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${parseFloat(mov.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{mov.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón de Cerrar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

