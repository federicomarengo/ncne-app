'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Configuracion } from '@/app/types/configuracion';

interface DashboardSocioProps {
  socio: any;
  onLogout: () => void;
}

export default function DashboardSocio({ socio, onLogout }: DashboardSocioProps) {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [deudaTotal, setDeudaTotal] = useState(0);
  const [cuponesPendientes, setCuponesPendientes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [socio]);

  const cargarDatos = async () => {
    try {
      const supabase = createClient();

      // Cargar configuración (para CBU)
      const { data: config } = await supabase
        .from('configuracion')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (config) {
        setConfiguracion(config as Configuracion);
      }

      // Cargar cupones pendientes
      const { data: cupones } = await supabase
        .from('cupones')
        .select('*')
        .eq('socio_id', socio.id)
        .in('estado', ['pendiente', 'vencido'])
        .order('fecha_vencimiento', { ascending: true });

      setCuponesPendientes(cupones || []);

      // Calcular deuda total
      const total = cupones?.reduce((sum, c) => sum + parseFloat(c.monto_total.toString()), 0) || 0;
      setDeudaTotal(total);

      // Cargar últimos pagos
      const { data: pagosData } = await supabase
        .from('pagos')
        .select('*')
        .eq('socio_id', socio.id)
        .order('fecha_pago', { ascending: false })
        .limit(10);

      setPagos(pagosData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert('Copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
            <p className="text-gray-600 mt-1">
              {socio.apellido}, {socio.nombre} - Socio #{socio.numero_socio}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Resumen de Cuenta */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen de Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Deuda Total</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(deudaTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cupones Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{cuponesPendientes.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Último Pago</p>
              <p className="text-lg font-semibold text-gray-900">
                {pagos.length > 0 ? formatCurrency(parseFloat(pagos[0].monto.toString())) : '-'}
              </p>
              {pagos.length > 0 && (
                <p className="text-sm text-gray-500">{formatDate(pagos[0].fecha_pago)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Datos Bancarios */}
        {configuracion?.banco_cbu && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos para Transferencia</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">CBU/CVU</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-mono">{configuracion.banco_cbu}</p>
                  <button
                    onClick={() => copiarAlPortapapeles(configuracion.banco_cbu || '')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Código de Referencia</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-mono">SOCIO-{socio.numero_socio}</p>
                  <button
                    onClick={() => copiarAlPortapapeles(`SOCIO-${socio.numero_socio}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cupones Pendientes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cupones Pendientes</h2>
          {cuponesPendientes.length === 0 ? (
            <p className="text-gray-500">No tiene cupones pendientes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Número</th>
                    <th className="text-left py-3 px-4">Período</th>
                    <th className="text-left py-3 px-4">Vencimiento</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuponesPendientes.map((cupon) => (
                    <tr key={cupon.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{cupon.numero_cupon}</td>
                      <td className="py-3 px-4">
                        {cupon.periodo_mes}/{cupon.periodo_anio}
                      </td>
                      <td className="py-3 px-4">{formatDate(cupon.fecha_vencimiento)}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            cupon.estado === 'vencido'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {cupon.estado === 'vencido' ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Historial de Pagos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Pagos</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-500">No tiene pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Método</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{formatDate(pago.fecha_pago)}</td>
                      <td className="py-3 px-4">{pago.metodo_pago}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(parseFloat(pago.monto.toString()))}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            pago.estado_conciliacion === 'conciliado'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {pago.estado_conciliacion === 'conciliado' ? 'Conciliado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

