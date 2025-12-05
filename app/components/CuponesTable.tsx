'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cupon, EstadoCupon } from '@/app/types/cupones';
import { filterCupones } from '@/app/utils/filterCupones';
import { formatDate } from '@/app/utils/formatDate';
import { createClient } from '@/utils/supabase/client';

interface Periodo {
  mes: number;
  anio: number;
  label: string;
}

export default function CuponesTable() {
  const router = useRouter();
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<{ mes: number; anio: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCupon | 'Todos'>('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Cargar períodos disponibles
  useEffect(() => {
    const cargarPeriodos = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cupones')
          .select('periodo_mes, periodo_anio')
          .order('periodo_anio', { ascending: false })
          .order('periodo_mes', { ascending: false });

        if (error) {
          console.error('Error al cargar períodos:', error);
          return;
        }

        // Obtener períodos únicos
        const periodosUnicos = new Map<string, Periodo>();
        data?.forEach((item) => {
          const key = `${item.periodo_mes}-${item.periodo_anio}`;
          if (!periodosUnicos.has(key)) {
            const mes = item.periodo_mes;
            const anio = item.periodo_anio;
            periodosUnicos.set(key, {
              mes,
              anio,
              label: `${String(mes).padStart(2, '0')}/${anio}`,
            });
          }
        });

        const periodosArray = Array.from(periodosUnicos.values());
        setPeriodos(periodosArray);

        // Establecer período por defecto (el más reciente o el actual)
        if (periodosArray.length > 0) {
          setPeriodoSeleccionado({
            mes: periodosArray[0].mes,
            anio: periodosArray[0].anio,
          });
        }
      } catch (err) {
        console.error('Error al cargar períodos:', err);
      }
    };

    cargarPeriodos();
  }, []);

  // Cargar cupones del período seleccionado
  useEffect(() => {
    const cargarCupones = async () => {
      if (!periodoSeleccionado) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cupones')
          .select(`
            id,
            numero_cupon,
            socio_id,
            periodo_mes,
            periodo_anio,
            fecha_emision,
            fecha_vencimiento,
            monto_cuota_social,
            monto_amarra,
            monto_visitas,
            monto_otros_cargos,
            monto_intereses,
            monto_total,
            estado,
            fecha_pago,
            socio:socios (
              id,
              numero_socio,
              apellido,
              nombre
            )
          `)
          .eq('periodo_mes', periodoSeleccionado.mes)
          .eq('periodo_anio', periodoSeleccionado.anio)
          .order('numero_cupon', { ascending: true });

        if (error) {
          console.error('Error al cargar cupones:', error);
          setCupones([]);
          return;
        }

        // Transformar los datos para que socio sea un objeto único en lugar de array
        const cuponesTransformados: Cupon[] = (data || []).map((item: any) => ({
          ...item,
          socio: Array.isArray(item.socio) && item.socio.length > 0 
            ? item.socio[0] 
            : item.socio || undefined,
        }));

        setCupones(cuponesTransformados);
      } catch (err) {
        console.error('Error al cargar cupones:', err);
        setCupones([]);
      } finally {
        setLoading(false);
      }
    };

    cargarCupones();
  }, [periodoSeleccionado]);

  const filteredCupones = useMemo(
    () => filterCupones(cupones, searchTerm, estadoFilter, fechaDesde, fechaHasta),
    [cupones, searchTerm, estadoFilter, fechaDesde, fechaHasta]
  );

  const getEstadoBadgeClass = (estado: EstadoCupon) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: EstadoCupon) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'pagado':
        return 'Pagado';
      case 'vencido':
        return 'Vencido';
      default:
        return estado;
    }
  };


  const limpiarFiltros = () => {
    setSearchTerm('');
    setEstadoFilter('Todos');
    setFechaDesde('');
    setFechaHasta('');
  };

  const handlePeriodoChange = (value: string) => {
    if (value === '') {
      setPeriodoSeleccionado(null);
      return;
    }
    const [mes, anio] = value.split('-').map(Number);
    setPeriodoSeleccionado({ mes, anio });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Header con botón Generar Cupones */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupones</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los cupones mensuales</p>
        </div>
        <button
          onClick={() => router.push('/cupones/generar')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generar Cupones Mensuales
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período <span className="text-red-500">*</span>
            </label>
            <select
              value={periodoSeleccionado ? `${periodoSeleccionado.mes}-${periodoSeleccionado.anio}` : ''}
              onChange={(e) => handlePeriodoChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar período...</option>
              {periodos.map((periodo) => (
                <option key={`${periodo.mes}-${periodo.anio}`} value={`${periodo.mes}-${periodo.anio}`}>
                  {periodo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Búsqueda
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cupón o socio..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!periodoSeleccionado}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as EstadoCupon | 'Todos')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!periodoSeleccionado}
            >
              <option value="Todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!periodoSeleccionado}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!periodoSeleccionado}
            />
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="mb-4 flex items-center justify-between">
        {loading ? (
          <p className="text-sm text-gray-600">Cargando cupones...</p>
        ) : periodoSeleccionado ? (
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{filteredCupones.length}</span> de{' '}
            <span className="font-medium">{cupones.length}</span> cupones del período{' '}
            <span className="font-medium">
              {String(periodoSeleccionado.mes).padStart(2, '0')}/{periodoSeleccionado.anio}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-600">Seleccione un período para ver los cupones</p>
        )}
        {(searchTerm || estadoFilter !== 'Todos' || fechaDesde || fechaHasta) && (
          <button
            onClick={limpiarFiltros}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando cupones...</div>
        ) : !periodoSeleccionado ? (
          <div className="p-8 text-center text-gray-500">
            Por favor, seleccione un período para ver los cupones
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Socio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCupones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron cupones
                  </td>
                </tr>
              ) : (
                filteredCupones.map((cupon) => (
                  <tr key={cupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cupon.numero_cupon}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cupon.socio ? `${cupon.socio.apellido}, ${cupon.socio.nombre}` : 'N/A'}
                      </div>
                      {cupon.socio && (
                        <div className="text-xs text-gray-500">
                          Socio #{cupon.socio.numero_socio}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cupon.periodo_mes}/{cupon.periodo_anio}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(cupon.fecha_vencimiento)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(parseFloat(cupon.monto_total.toString()))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(
                          cupon.estado
                        )}`}
                      >
                        {formatEstado(cupon.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/cupones/${cupon.id}`)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Ver detalle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/cupones/${cupon.id}/editar`)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Editar cupón"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

    </div>
  );
}

