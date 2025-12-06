'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { VistaPreviaCupon, ItemPrevia } from '@/app/types/cupones';
import { calcularVistaPreviaCupones, Configuracion } from '@/app/utils/calcularVistaPreviaCupones';
import { filterVistaPreviaCupones } from '@/app/utils/filterVistaPreviaCupones';
import { createClient } from '@/utils/supabase/client';
import VistaPreviaCuponesTable from './VistaPreviaCuponesTable';
import ProgressBar from '@/app/components/ProgressBar';
import { aplicarSaldoAFavorACupon } from '@/app/utils/aplicarSaldoAFavorACupon';
import { logger } from '@/app/utils/logger';

export default function GenerarCuponesPage() {
  const router = useRouter();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [enviarEmails, setEnviarEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaCupon[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [generando, setGenerando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCupones, setSelectedCupones] = useState<Set<number>>(new Set());
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [progresoGeneracion, setProgresoGeneracion] = useState<{
    current: number;
    total: number;
    mensaje: string;
  } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
    // Establecer fecha de vencimiento por defecto (día 15 del mes seleccionado)
    const fechaVenc = new Date(anio, mes, 15);
    setFechaVencimiento(fechaVenc.toISOString().split('T')[0]);
  }, []);

  // Actualizar fecha de vencimiento cuando cambia el mes o año
  useEffect(() => {
    if (mes && anio) {
      const fechaVenc = new Date(anio, mes, 15);
      setFechaVencimiento(fechaVenc.toISOString().split('T')[0]);
    }
  }, [mes, anio]);

  // Sincronizar selección cuando cambia la vista previa
  useEffect(() => {
    if (vistaPrevia.length > 0) {
      const nuevosSeleccionados = new Set<number>();
      vistaPrevia.forEach((cupon) => {
        if (cupon.seleccionado !== false) {
          nuevosSeleccionados.add(cupon.socio.id);
        }
      });
      setSelectedCupones(nuevosSeleccionados);
    }
  }, [vistaPrevia]);

  const cargarConfiguracion = async () => {
    try {
      setLoadingConfig(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('configuracion')
        .select('cuota_social_base, amarra_valor_por_pie, costo_visita, tasa_interes_mora, dia_vencimiento, dias_gracia')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        logger.error('Error al cargar configuración:', error);
        setConfiguracion({
          cuota_social_base: 28000,
          amarra_valor_por_pie: 2800,
          costo_visita: 4200,
          tasa_interes_mora: 0.045,
          dia_vencimiento: 15,
          dias_gracia: 5,
        });
      } else if (data) {
        setConfiguracion({
          cuota_social_base: parseFloat(data.cuota_social_base?.toString() || '28000'),
          amarra_valor_por_pie: parseFloat(data.amarra_valor_por_pie?.toString() || '2800'),
          costo_visita: parseFloat(data.costo_visita?.toString() || '4200'),
          tasa_interes_mora: parseFloat(data.tasa_interes_mora?.toString() || '0.045'),
          dia_vencimiento: parseInt(data.dia_vencimiento?.toString() || '15'),
          dias_gracia: parseInt(data.dias_gracia?.toString() || '5'),
        });
      } else {
        setConfiguracion({
          cuota_social_base: 28000,
          amarra_valor_por_pie: 2800,
          costo_visita: 4200,
          tasa_interes_mora: 0.045,
          dia_vencimiento: 15,
          dias_gracia: 5,
        });
      }
    } catch (err) {
      logger.error('Error al cargar configuración:', err);
      setConfiguracion({
        cuota_social_base: 28000,
        amarra_valor_por_pie: 2800,
        costo_visita: 4200,
        tasa_interes_mora: 0.045,
        dia_vencimiento: 15,
        dias_gracia: 5,
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  const calcularVistaPrevia = async () => {
    if (!configuracion) {
      setError('Error: No se pudo cargar la configuración del sistema. Por favor intente nuevamente.');
      return;
    }
    
    if (!fechaVencimiento) {
      setError('Por favor seleccione una fecha de vencimiento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await calcularVistaPreviaCupones({
        mes,
        anio,
        fechaVencimiento,
        configuracion,
      });

      setVistaPrevia(resultado);
    } catch (err: any) {
      setError(err.message || 'Error al calcular vista previa');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeleccionCupon = (socioId: number) => {
    const nuevos = new Set(selectedCupones);
    if (nuevos.has(socioId)) {
      nuevos.delete(socioId);
    } else {
      nuevos.add(socioId);
    }
    setSelectedCupones(nuevos);
    
    // Actualizar estado en vistaPrevia
    setVistaPrevia(prev => prev.map(cupon => 
      cupon.socio.id === socioId 
        ? { ...cupon, seleccionado: nuevos.has(socioId) }
        : cupon
    ));
  };

  const seleccionarTodos = () => {
    const cuponesFiltrados = filteredCupones;
    const nuevos = new Set(selectedCupones);
    cuponesFiltrados.forEach(cupon => {
      nuevos.add(cupon.socio.id);
    });
    setSelectedCupones(nuevos);
    
    // Actualizar estado en vistaPrevia
    setVistaPrevia(prev => prev.map(cupon => 
      cuponesFiltrados.some(c => c.socio.id === cupon.socio.id)
        ? { ...cupon, seleccionado: true }
        : cupon
    ));
  };

  const deseleccionarTodos = () => {
    const cuponesFiltrados = filteredCupones;
    const nuevos = new Set(selectedCupones);
    cuponesFiltrados.forEach(cupon => {
      nuevos.delete(cupon.socio.id);
    });
    setSelectedCupones(nuevos);
    
    // Actualizar estado en vistaPrevia
    setVistaPrevia(prev => prev.map(cupon => 
      cuponesFiltrados.some(c => c.socio.id === cupon.socio.id)
        ? { ...cupon, seleccionado: false }
        : cupon
    ));
  };

  const generarCupones = async () => {
    if (!configuracion || !fechaVencimiento || selectedCupones.size === 0) {
      setError('Por favor seleccione al menos un cupón para generar');
      return;
    }

    setGenerando(true);
    setError(null);

    try {
      const supabase = createClient();
      const fechaEmision = new Date().toISOString().split('T')[0];

      // Filtrar solo los cupones seleccionados
      const cuponesAGenerar = vistaPrevia.filter(cupon => selectedCupones.has(cupon.socio.id));

      const total = cuponesAGenerar.length;
      setProgresoGeneracion({ current: 0, total, mensaje: 'Iniciando generación...' });

      // Arrays para acumular actualizaciones batch
      const visitasParaActualizar: Array<{id: number; cupon_id: number; fechaEmision: string}> = [];

      // Generar cupones para cada socio seleccionado
      for (let i = 0; i < cuponesAGenerar.length; i++) {
        const item = cuponesAGenerar[i];
        
        // Actualizar progreso
        setProgresoGeneracion({
          current: i + 1,
          total,
          mensaje: `Generando cupón ${i + 1} de ${total} (Socio #${item.socio.numero_socio})...`
        });
        // Generar número de cupón único
        const numeroCupon = `${anio}${String(mes).padStart(2, '0')}-${String(item.socio.numero_socio).padStart(4, '0')}`;

        // Crear cupón
        const { data: cupon, error: errorCupon } = await supabase
          .from('cupones')
          .insert({
            numero_cupon: numeroCupon,
            socio_id: item.socio.id,
            periodo_mes: mes,
            periodo_anio: anio,
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            monto_cuota_social: item.montoCuotaSocial,
            monto_amarra: item.montoAmarra,
            monto_visitas: item.montoVisitas,
            monto_otros_cargos: item.montoCuotasPlanes,
            monto_intereses: item.montoIntereses,
            monto_total: item.montoTotal,
            estado: 'pendiente',
          })
          .select()
          .single();

        if (errorCupon) {
          logger.error(`Error al crear cupón para socio ${item.socio.numero_socio}:`, errorCupon);
          continue;
        }

        // Aplicar saldo a favor automáticamente al cupón recién generado
        try {
          const resultadoSaldo = await aplicarSaldoAFavorACupon(
            cupon.id,
            item.socio.id,
            supabase
          );
          
          if (resultadoSaldo.montoAplicado > 0) {
            logger.log(`Saldo a favor aplicado: $${resultadoSaldo.montoAplicado.toLocaleString('es-AR')} al cupón ${numeroCupon}`);
            
            // Si el cupón quedó completamente pagado, actualizar el estado
            if (resultadoSaldo.cuponQuedoPagado) {
              await supabase
                .from('cupones')
                .update({
                  estado: 'pagado',
                  fecha_pago: fechaEmision,
                })
                .eq('id', cupon.id);
            }
          }
        } catch (errorSaldo: any) {
          // No fallar la generación si hay error con saldo a favor, solo loggear
          logger.error(`Error al aplicar saldo a favor al cupón ${numeroCupon}:`, errorSaldo);
        }

        // Crear items del cupón
        const items: Array<{ cupon_id: number; descripcion: string; cantidad: number; precio_unitario: number | null; subtotal: number }> = [];

        for (const itemPrevia of item.items) {
          if (itemPrevia.tipo === 'cuota_social') {
            items.push({
              cupon_id: cupon.id,
              descripcion: itemPrevia.descripcion,
              cantidad: 1,
              precio_unitario: itemPrevia.monto,
              subtotal: itemPrevia.monto,
            });
          } else if (itemPrevia.tipo === 'amarra') {
            items.push({
              cupon_id: cupon.id,
              descripcion: itemPrevia.descripcion,
              cantidad: 1,
              precio_unitario: itemPrevia.monto,
              subtotal: itemPrevia.monto,
            });
          } else if (itemPrevia.tipo === 'visita') {
            const visita = item.visitas.find(v => {
              const fechaVisita = new Date(v.fecha_visita).toLocaleDateString('es-AR');
              return itemPrevia.descripcion.includes(fechaVisita);
            });
            
            if (visita) {
              items.push({
                cupon_id: cupon.id,
                descripcion: itemPrevia.descripcion,
                cantidad: visita.cantidad_visitantes,
                precio_unitario: visita.costo_unitario,
                subtotal: itemPrevia.monto,
              });

              // Acumular actualización de visita para batch update
              visitasParaActualizar.push({
                id: visita.id,
                cupon_id: cupon.id,
                fechaEmision: fechaEmision,
              });
            }
          } else if (itemPrevia.tipo === 'interes') {
            items.push({
              cupon_id: cupon.id,
              descripcion: itemPrevia.descripcion,
              cantidad: 1,
              precio_unitario: itemPrevia.monto,
              subtotal: itemPrevia.monto,
            });
          }
        }

        // Insertar items
        if (items.length > 0) {
          await supabase.from('items_cupon').insert(items);
        }

        // TODO: Enviar email si está habilitado
        if (enviarEmails) {
          logger.log(`Enviar email a ${item.socio.email}`);
        }
      }

      // Ejecutar batch updates para visitas
      if (visitasParaActualizar.length > 0) {
        setProgresoGeneracion({
          current: total,
          total,
          mensaje: `Actualizando ${visitasParaActualizar.length} visitas...`
        });
        
        await Promise.all(
          visitasParaActualizar.map(v => 
            supabase
              .from('visitas')
              .update({
                estado: 'con_cupon_generado',
                cupon_id: v.cupon_id,
                fecha_generacion_cupon: v.fechaEmision,
              })
              .eq('id', v.id)
          )
        );
      }

      router.push('/cupones');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al generar cupones');
    } finally {
      setGenerando(false);
      setProgresoGeneracion(null);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredCupones = useMemo(() => {
    return filterVistaPreviaCupones(vistaPrevia, searchTerm);
  }, [vistaPrevia, searchTerm]);

  const cuponesSeleccionadosFiltrados = useMemo(() => {
    return filteredCupones.filter(cupon => selectedCupones.has(cupon.socio.id));
  }, [filteredCupones, selectedCupones]);

  const totalEstimado = useMemo(() => {
    return cuponesSeleccionadosFiltrados.reduce((sum, item) => sum + item.montoTotal, 0);
  }, [cuponesSeleccionadosFiltrados]);

  const isFormValid = configuracion && fechaVencimiento && mes && anio;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Generar Cupones Mensuales</h1>
          <p className="text-sm text-gray-600 mt-1">Genere cupones mensuales para todos los socios activos</p>
        </div>

        {/* Barra de progreso durante generación */}
        {progresoGeneracion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Generando Cupones...
            </h3>
            <ProgressBar
              current={progresoGeneracion.current}
              total={progresoGeneracion.total}
              message={progresoGeneracion.mensaje}
              color="blue"
            />
          </div>
        )}

        {/* Sección Superior: Formulario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros de Generación</h2>
          
          {loadingConfig && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                Cargando configuración del sistema...
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes <span className="text-red-500">*</span>
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(anio, m - 1).toLocaleString('es-AR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                min={2020}
                max={2100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enviarEmails}
                  onChange={(e) => setEnviarEmails(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Enviar cupones por email automáticamente
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/cupones')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={calcularVistaPrevia}
              disabled={loading || !isFormValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isFormValid ? 'Por favor complete todos los campos' : ''}
            >
              {loading ? 'Calculando...' : 'Calcular Vista Previa'}
            </button>
          </div>
        </div>

        {/* Sección Central: Vista Previa */}
        {vistaPrevia.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h2>
            
            {/* Métricas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cupones seleccionados</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {cuponesSeleccionadosFiltrados.length} de {filteredCupones.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total estimado</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(totalEstimado)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Período</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {mes}/{anio}
                  </p>
                </div>
              </div>
            </div>

            {/* Búsqueda y controles de selección */}
            <div className="mb-4 space-y-3">
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, apellido, número de socio, DNI..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={seleccionarTodos}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Seleccionar Todo
                </button>
                <button
                  onClick={deseleccionarTodos}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Deseleccionar Todo
                </button>
              </div>
            </div>

            {/* Tabla */}
            <VistaPreviaCuponesTable
              cupones={filteredCupones}
              cuponesSeleccionados={selectedCupones}
              onToggleSeleccion={toggleSeleccionCupon}
            />
          </div>
        )}

        {/* Sección Inferior: Botón de Generación */}
        {vistaPrevia.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setVistaPrevia([]);
                  setSelectedCupones(new Set());
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={generarCupones}
                disabled={generando || selectedCupones.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generando ? 'Generando...' : `Generar ${selectedCupones.size} Cupones`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

