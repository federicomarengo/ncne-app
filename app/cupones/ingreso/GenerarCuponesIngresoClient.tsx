'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SelectorSocio from '@/app/components/SelectorSocio';
import { TipoIngreso, CuotaIngreso } from '@/app/types/cupones_ingreso';
import { Embarcacion } from '@/app/types/embarcaciones';
import { formatDate } from '@/app/utils/formatDate';
import { logger } from '@/app/utils/logger';

export default function GenerarCuponesIngresoClient() {
  const router = useRouter();
  const [socioId, setSocioId] = useState<number>(0);
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso | ''>('');
  const [embarcacionId, setEmbarcacionId] = useState<number | null>(null);
  const [embarcaciones, setEmbarcaciones] = useState<Embarcacion[]>([]);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [montoTotalEditado, setMontoTotalEditado] = useState<string>('');
  const [cantidadCuotas, setCantidadCuotas] = useState<number>(1);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [cuotas, setCuotas] = useState<CuotaIngreso[]>([]);
  
  const [configuracion, setConfiguracion] = useState<{ cuota_social_base: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingEmbarcaciones, setLoadingEmbarcaciones] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
    // Establecer fecha de inicio por defecto (próximo día 15 del mes actual o siguiente)
    const hoy = new Date();
    const dia15 = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    if (hoy > dia15) {
      // Si ya pasó el 15, usar el 15 del próximo mes
      dia15.setMonth(dia15.getMonth() + 1);
    }
    setFechaInicio(dia15.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (socioId > 0 && tipoIngreso === 'derecho_embarcacion') {
      cargarEmbarcaciones();
    } else {
      setEmbarcaciones([]);
      setEmbarcacionId(null);
    }
  }, [socioId, tipoIngreso]);

  useEffect(() => {
    if (tipoIngreso && configuracion) {
      calcularMonto();
    }
  }, [tipoIngreso, embarcacionId, embarcaciones, configuracion]);

  useEffect(() => {
    if (montoTotal > 0 && cantidadCuotas > 0 && fechaInicio) {
      calcularCuotas();
    }
  }, [montoTotal, cantidadCuotas, fechaInicio]);

  const cargarConfiguracion = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('configuracion')
        .select('cuota_social_base')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        logger.error('Error al cargar configuración:', error);
        setConfiguracion({ cuota_social_base: 28000 });
      } else if (data) {
        setConfiguracion({
          cuota_social_base: parseFloat(data.cuota_social_base?.toString() || '28000'),
        });
      } else {
        setConfiguracion({ cuota_social_base: 28000 });
      }
    } catch (err) {
      logger.error('Error al cargar configuración:', err);
      setConfiguracion({ cuota_social_base: 28000 });
    }
  };

  const cargarEmbarcaciones = async () => {
    if (!socioId) return;
    
    setLoadingEmbarcaciones(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('embarcaciones')
        .select('*')
        .eq('socio_id', socioId)
        .order('nombre', { ascending: true });

      if (error) {
        logger.error('Error al cargar embarcaciones:', error);
        setError('Error al cargar embarcaciones del socio');
      } else {
        setEmbarcaciones((data as Embarcacion[]) || []);
        if (data && data.length === 1) {
          // Si solo hay una embarcación, seleccionarla automáticamente
          setEmbarcacionId(data[0].id);
        }
      }
    } catch (err) {
      logger.error('Error al cargar embarcaciones:', err);
      setError('Error al cargar embarcaciones del socio');
    } finally {
      setLoadingEmbarcaciones(false);
    }
  };

  const calcularMonto = () => {
    if (!configuracion || !tipoIngreso) {
      setMontoTotal(0);
      setMontoTotalEditado('');
      return;
    }

    let monto = 0;

    if (tipoIngreso === 'membresia') {
      // Membresía de Ingreso: 8 × Cuota Social
      monto = configuracion.cuota_social_base * 8;
    } else if (tipoIngreso === 'derecho_embarcacion' && embarcacionId) {
      const embarcacion = embarcaciones.find(e => e.id === embarcacionId);
      if (embarcacion) {
        const esloraPies = parseFloat(embarcacion.eslora_pies?.toString() || '0');
        const esloraMetros = parseFloat(embarcacion.eslora_metros?.toString() || '0');
        
        // Convertir a metros si está en pies (1 pie ≈ 0.3048 metros)
        const esloraEnMetros = esloraMetros > 0 ? esloraMetros : esloraPies * 0.3048;
        
        if (esloraEnMetros <= 5.5) {
          // Embarcación menor o igual a 5.5m: 35 × Cuota Social
          monto = configuracion.cuota_social_base * 35;
        } else {
          // Embarcación mayor a 5.5m: 3 × Cuota Social × Eslora (pies)
          monto = configuracion.cuota_social_base * 3 * esloraPies;
        }
      }
    }

    setMontoTotal(monto);
    setMontoTotalEditado(monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const calcularCuotas = () => {
    if (!fechaInicio || cantidadCuotas < 1 || montoTotal <= 0) {
      setCuotas([]);
      return;
    }

    const montoPorCuota = montoTotal / cantidadCuotas;
    const fechaBase = new Date(fechaInicio);
    const nuevasCuotas: CuotaIngreso[] = [];

    for (let i = 0; i < cantidadCuotas; i++) {
      const fechaVencimiento = new Date(fechaBase);
      fechaVencimiento.setMonth(fechaBase.getMonth() + i);

      nuevasCuotas.push({
        numero: i + 1,
        fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
        monto: montoPorCuota,
        estado: 'pendiente',
      });
    }

    setCuotas(nuevasCuotas);
  };

  const handleMontoTotalChange = (value: string) => {
    setMontoTotalEditado(value);
    // Remover caracteres no numéricos excepto punto y coma
    const numeroLimpio = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const numero = parseFloat(numeroLimpio);
    
    if (!isNaN(numero) && numero >= 0) {
      setMontoTotal(numero);
    }
  };


  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const validarFormulario = (): boolean => {
    if (socioId === 0) {
      setError('Debe seleccionar un socio');
      return false;
    }
    if (!tipoIngreso) {
      setError('Debe seleccionar un tipo de ingreso');
      return false;
    }
    if (tipoIngreso === 'derecho_embarcacion' && !embarcacionId) {
      setError('Debe seleccionar una embarcación');
      return false;
    }
    if (montoTotal <= 0) {
      setError('El monto total debe ser mayor a cero');
      return false;
    }
    if (!fechaInicio) {
      setError('Debe seleccionar una fecha de inicio');
      return false;
    }
    if (cantidadCuotas < 1 || cantidadCuotas > 12) {
      setError('La cantidad de cuotas debe estar entre 1 y 12');
      return false;
    }
    if (cuotas.length === 0) {
      setError('Error al calcular las cuotas');
      return false;
    }
    return true;
  };

  const generarCupones = async () => {
    if (!validarFormulario()) {
      return;
    }

    setGenerando(true);
    setError(null);

    try {
      const supabase = createClient();
      const fechaEmision = new Date().toISOString().split('T')[0];
      const anio = new Date().getFullYear();
      const mes = String(new Date().getMonth() + 1).padStart(2, '0');

      // Obtener número de socio para el número de cupón
      const { data: socioData } = await supabase
        .from('socios')
        .select('numero_socio')
        .eq('id', socioId)
        .single();

      const numeroSocio = socioData?.numero_socio || 0;
      const embarcacionSeleccionada = embarcaciones.find(e => e.id === embarcacionId);

      // Generar cada cupón
      for (const cuota of cuotas) {
        // Generar número de cupón único según el tipo de ingreso
        let numeroCupon = '';
        if (tipoIngreso === 'membresia') {
          // Formato: ING-MEM-YYYYMM-SOCIO-CUOTA
          numeroCupon = `ING-MEM-${anio}${mes}-${String(numeroSocio).padStart(4, '0')}-${String(cuota.numero).padStart(2, '0')}`;
        } else if (tipoIngreso === 'derecho_embarcacion' && embarcacionId) {
          // Formato: ING-EMB-EMBARCADIONID-YYYYMM-SOCIO-CUOTA
          numeroCupon = `ING-EMB-${embarcacionId}-${anio}${mes}-${String(numeroSocio).padStart(4, '0')}-${String(cuota.numero).padStart(2, '0')}`;
        } else {
          // Fallback (no debería llegar aquí si la validación funciona)
          numeroCupon = `ING-${anio}${mes}-${String(numeroSocio).padStart(4, '0')}-${String(cuota.numero).padStart(2, '0')}-${Date.now()}`;
        }
        
        // Crear descripción del item
        let descripcionItem = '';
        if (tipoIngreso === 'membresia') {
          descripcionItem = `Membresía de Ingreso de Socio - Cuota ${cuota.numero} de ${cantidadCuotas}`;
        } else if (tipoIngreso === 'derecho_embarcacion' && embarcacionSeleccionada) {
          descripcionItem = `Derecho de Ingreso de Embarcación ${embarcacionSeleccionada.nombre} - Cuota ${cuota.numero} de ${cantidadCuotas}`;
        }

        // IMPORTANTE: La migración 009_modificar_constraint_cupones_ingreso.sql debe ejecutarse
        // para permitir múltiples cupones de ingreso en el mismo período.
        // Mientras tanto, usamos el mes de vencimiento de cada cuota como período.
        // Si múltiples cuotas vencen en el mismo mes, habrá conflicto hasta ejecutar la migración.
        const fechaVencimiento = new Date(cuota.fechaVencimiento);
        const periodoMes = fechaVencimiento.getMonth() + 1;
        const periodoAnio = fechaVencimiento.getFullYear();

        // Crear cupón
        const { data: cupon, error: errorCupon } = await supabase
          .from('cupones')
          .insert({
            numero_cupon: numeroCupon,
            socio_id: socioId,
            periodo_mes: periodoMes,
            periodo_anio: periodoAnio,
            fecha_emision: fechaEmision,
            fecha_vencimiento: cuota.fechaVencimiento,
            monto_cuota_social: 0,
            monto_amarra: 0,
            monto_visitas: 0,
            monto_otros_cargos: cuota.monto,
            monto_intereses: 0,
            monto_total: cuota.monto,
            estado: 'pendiente',
          })
          .select()
          .single();

        if (errorCupon) {
          let mensajeError = `Error al crear cupón ${numeroCupon}: ${errorCupon.message}`;
          
          // Si es un error de restricción única, sugerir ejecutar la migración
          if (errorCupon.message?.includes('unique_cupon_socio_periodo')) {
            mensajeError += '\n\nSolución: Ejecute la migración 009_modificar_constraint_cupones_ingreso.sql para permitir múltiples cupones de ingreso en el mismo período.';
          }
          
          throw new Error(mensajeError);
        }

        // Crear item del cupón
        if (cupon && descripcionItem) {
          await supabase.from('items_cupon').insert({
            cupon_id: cupon.id,
            descripcion: descripcionItem,
            cantidad: 1,
            precio_unitario: cuota.monto,
            subtotal: cuota.monto,
          });
        }
      }

      router.push('/cupones');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al generar los cupones');
    } finally {
      setGenerando(false);
    }
  };

  const embarcacionSeleccionada = useMemo(() => {
    return embarcaciones.find(e => e.id === embarcacionId);
  }, [embarcaciones, embarcacionId]);

  const totalCuotas = useMemo(() => {
    return cuotas.reduce((sum, c) => sum + c.monto, 0);
  }, [cuotas]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Generar Cupones de Ingreso</h1>
          <p className="text-sm text-gray-600 mt-1">
            Genere cupones de ingreso para nuevos socios o embarcaciones
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Ingreso</h2>

          <div className="space-y-6">
            {/* Selector de Socio */}
            <SelectorSocio
              onSocioSeleccionado={setSocioId}
              className="mb-4"
            />

            {/* Tipo de Ingreso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ingreso <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoIngreso"
                    value="membresia"
                    checked={tipoIngreso === 'membresia'}
                    onChange={(e) => setTipoIngreso(e.target.value as TipoIngreso)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Membresía de Ingreso de Socio</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoIngreso"
                    value="derecho_embarcacion"
                    checked={tipoIngreso === 'derecho_embarcacion'}
                    onChange={(e) => setTipoIngreso(e.target.value as TipoIngreso)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Derecho de Ingreso de Embarcación</span>
                </label>
              </div>
            </div>

            {/* Selección de Embarcación */}
            {tipoIngreso === 'derecho_embarcacion' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Embarcación <span className="text-red-500">*</span>
                </label>
                {loadingEmbarcaciones ? (
                  <p className="text-sm text-gray-500">Cargando embarcaciones...</p>
                ) : embarcaciones.length === 0 ? (
                  <p className="text-sm text-red-600">El socio no tiene embarcaciones registradas</p>
                ) : (
                  <select
                    value={embarcacionId || ''}
                    onChange={(e) => setEmbarcacionId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccione una embarcación</option>
                    {embarcaciones.map((emb) => (
                      <option key={emb.id} value={emb.id}>
                        {emb.nombre} - {emb.tipo} ({emb.eslora_pies} pies / {emb.eslora_metros || (emb.eslora_pies * 0.3048).toFixed(2)} m)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Monto Total */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Total <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={montoTotalEditado}
                onChange={(e) => handleMontoTotalChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {montoTotal > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(montoTotal)}
                </p>
              )}
            </div>

            {/* Fecha de Inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Cantidad de Cuotas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad de Cuotas <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={cantidadCuotas}
                onChange={(e) => setCantidadCuotas(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Entre 1 y 12 cuotas</p>
            </div>

            {/* Resumen */}
            {montoTotal > 0 && cantidadCuotas > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Resumen</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Monto Total:</span>
                    <span className="ml-2 font-semibold text-gray-900">{formatCurrency(montoTotal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cantidad de Cuotas:</span>
                    <span className="ml-2 font-semibold text-gray-900">{cantidadCuotas}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Monto por Cuota:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(montoTotal / cantidadCuotas)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vista Previa */}
        {cuotas.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa de Cuotas</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuota #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha de Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cuotas.map((cuota) => (
                    <tr key={cuota.numero} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{cuota.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(cuota.fechaVencimiento)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cuota.monto}
                            onChange={(e) => {
                              const nuevoMonto = parseFloat(e.target.value) || 0;
                              setCuotas(prev => prev.map(c => 
                                c.numero === cuota.numero ? { ...c, monto: nuevoMonto } : c
                              ));
                            }}
                            className="text-right w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-500">
                            {formatCurrency(cuota.monto)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">Pendiente</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(totalCuotas)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Mensajes de Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push('/cupones')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={generarCupones}
              disabled={generando || cuotas.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generando ? 'Generando...' : `Generar ${cuotas.length} Cupones`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

