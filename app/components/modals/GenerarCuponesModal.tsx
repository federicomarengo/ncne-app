'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Socio, getNombreCompleto } from '@/app/types/socios';
import { Embarcacion } from '@/app/types/embarcaciones';
import { Visita } from '@/app/types/visitas';
import { createClient } from '@/utils/supabase/client';
import ProgressBar from '@/app/components/ProgressBar';
import { logger } from '@/app/utils/logger';

interface GenerarCuponesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface VistaPreviaCupon {
  socio: Socio;
  montoCuotaSocial: number;
  montoAmarra: number;
  montoVisitas: number;
  montoCuotasPlanes: number;
  montoIntereses: number;
  montoTotal: number;
  visitas: Visita[];
  embarcaciones: Embarcacion[];
  cuponesVencidos: Array<{ cupon: CuponVencido; diasMora: number; interes: number }>;
  items: ItemPrevia[];
}

interface Configuracion {
  cuota_social_base: number;
  amarra_valor_por_pie: number;
  costo_visita: number;
  tasa_interes_mora: number;
  dia_vencimiento: number;
  dias_gracia: number;
}

interface CuponVencido {
  id: number;
  numero_cupon: string;
  socio_id: number;
  fecha_vencimiento: string;
  monto_total: number;
}

interface ItemPrevia {
  tipo: 'cuota_social' | 'amarra' | 'visita' | 'interes' | 'muelle_seco' | 'rampa';
  descripcion: string;
  monto: number;
}

export default function GenerarCuponesModal({
  isOpen,
  onClose,
  onSuccess,
}: GenerarCuponesModalProps) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [enviarEmails, setEnviarEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaCupon[]>([]);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [generando, setGenerando] = useState(false);
  const [sociosExpandidos, setSociosExpandidos] = useState<Set<number>>(new Set());
  const [progresoGeneracion, setProgresoGeneracion] = useState<{
    current: number;
    total: number;
    mensaje: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarConfiguracion();
      // Establecer fecha de vencimiento por defecto (día 15 del mes seleccionado)
      const fechaVenc = new Date(anio, mes, 15);
      setFechaVencimiento(fechaVenc.toISOString().split('T')[0]);
      // Resetear estado
      setMostrarVistaPrevia(false);
      setVistaPrevia([]);
      setError(null);
    }
  }, [isOpen]);

  // Actualizar fecha de vencimiento cuando cambia el mes o año (solo si el modal está abierto)
  useEffect(() => {
    if (isOpen && mes && anio) {
      const fechaVenc = new Date(anio, mes, 15);
      setFechaVencimiento(fechaVenc.toISOString().split('T')[0]);
    }
  }, [mes, anio]);

  // Cálculo automático de vista previa cuando cambian los parámetros
  useEffect(() => {
    if (isOpen && configuracion && fechaVencimiento && mes && anio) {
      // Solo calcular automáticamente si no hay vista previa mostrada (evitar recalcular mientras el usuario revisa)
      if (!mostrarVistaPrevia) {
        const timeoutId = setTimeout(() => {
          calcularVistaPrevia();
        }, 800); // Debounce de 800ms para evitar cálculos excesivos
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio, fechaVencimiento, configuracion]);

  const cargarConfiguracion = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('configuracion')
        .select('cuota_social_base, amarra_valor_por_pie, costo_visita, tasa_interes_mora, dia_vencimiento, dias_gracia')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        logger.error('Error al cargar configuración:', error);
        // Valores por defecto según esquema SQL
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
        // Si no hay datos pero tampoco hay error, usar valores por defecto
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
      const supabase = createClient();

      // Verificar si ya existen cupones para este período
      const { data: cuponesExistentes } = await supabase
        .from('cupones')
        .select('id')
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio)
        .limit(1);

      if (cuponesExistentes && cuponesExistentes.length > 0) {
        setError('Ya existen cupones generados para este período');
        setLoading(false);
        return;
      }

      // Obtener todos los socios activos
      const { data: socios, error: errorSocios } = await supabase
        .from('socios')
        .select('*')
        .eq('estado', 'activo')
        .order('numero_socio', { ascending: true });

      if (errorSocios) {
        throw new Error('Error al cargar socios');
      }

      // Obtener todas las embarcaciones
      const { data: embarcaciones, error: errorEmbarcaciones } = await supabase
        .from('embarcaciones')
        .select('*');

      if (errorEmbarcaciones) {
        logger.error('Error al cargar embarcaciones:', errorEmbarcaciones);
      }

      // Obtener visitas pendientes del mes
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

      const { data: visitas, error: errorVisitas } = await supabase
        .from('visitas')
        .select('*')
        .eq('estado', 'pendiente')
        .gte('fecha_visita', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_visita', fechaFin.toISOString().split('T')[0]);

      if (errorVisitas) {
        logger.error('Error al cargar visitas:', errorVisitas);
      }

      // Obtener cupones pendientes o vencidos cuya fecha de vencimiento ya pasó para calcular intereses
      const fechaActualStr = new Date().toISOString().split('T')[0];
      const { data: cuponesVencidos, error: errorCuponesVencidos } = await supabase
        .from('cupones')
        .select('id, numero_cupon, socio_id, fecha_vencimiento, monto_total')
        .in('estado', ['pendiente', 'vencido'])
        .lt('fecha_vencimiento', fechaActualStr);

      if (errorCuponesVencidos) {
        logger.error('Error al cargar cupones vencidos:', errorCuponesVencidos);
      }


      // Calcular vista previa para cada socio
      const vistaPreviaCalculada: VistaPreviaCupon[] = [];
      const fechaActual = new Date();

      for (const socio of socios || []) {
        const itemsPrevia: ItemPrevia[] = [];
        
        // Cuota social base
        const montoCuotaSocial = configuracion.cuota_social_base;
        itemsPrevia.push({
          tipo: 'cuota_social',
          descripcion: `Cuota Social - ${mes}/${anio} - ${formatCurrency(montoCuotaSocial)}`,
          monto: montoCuotaSocial,
        });

        // Cargo por amarra (una por cada embarcación)
        let montoAmarra = 0;
        const embarcacionesSocio = (embarcaciones || []).filter(
          (e: Embarcacion) => e.socio_id === socio.id
        );
        
        for (const embarcacion of embarcacionesSocio) {
          const costoAmarra = calcularCostoAmarra(embarcacion, configuracion);
          montoAmarra += costoAmarra;
          itemsPrevia.push({
            tipo: 'amarra',
            descripcion: obtenerDescripcionAmarra(embarcacion, configuracion),
            monto: costoAmarra,
          });
        }

        // Visitas del mes (una por cada visita)
        const visitasSocio = (visitas || []).filter(
          (v: Visita) => v.socio_id === socio.id
        );
        let montoVisitas = 0;
        for (const visita of visitasSocio) {
          const montoVisita = parseFloat(visita.monto_total?.toString() || '0');
          montoVisitas += montoVisita;
          const fechaVisita = new Date(visita.fecha_visita).toLocaleDateString('es-AR');
          itemsPrevia.push({
            tipo: 'visita',
            descripcion: `Visita ${fechaVisita} - ${visita.cantidad_visitantes} persona(s) × ${formatCurrency(visita.costo_unitario)} - ${formatCurrency(montoVisita)}`,
            monto: montoVisita,
          });
        }

        // Cuotas de planes de financiación - FUNCIONALIDAD REMOVIDA
        const montoCuotasPlanes = 0;

        // Intereses por deuda vencida (uno por cada cupón vencido)
        const cuponesVencidosSocio = (cuponesVencidos || []).filter(
          (c: CuponVencido) => c.socio_id === socio.id
        );
        let montoIntereses = 0;
        const cuponesVencidosConInteres: Array<{ cupon: CuponVencido; diasMora: number; interes: number }> = [];

        for (const cuponVencido of cuponesVencidosSocio) {
          const fechaVencimiento = new Date(cuponVencido.fecha_vencimiento);
          const diasTranscurridos = Math.floor(
            (fechaActual.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
          );
          const diasMora = Math.max(0, diasTranscurridos - configuracion.dias_gracia);

          if (diasMora > 0) {
            const saldoVencido = parseFloat(cuponVencido.monto_total?.toString() || '0');
            const interesDiario = (saldoVencido * configuracion.tasa_interes_mora) / 30;
            const interes = interesDiario * diasMora;
            montoIntereses += interes;

            cuponesVencidosConInteres.push({
              cupon: cuponVencido,
              diasMora,
              interes,
            });

            itemsPrevia.push({
              tipo: 'interes',
              descripcion: `Intereses por mora - Cupón ${cuponVencido.numero_cupon} (${diasMora} días) - ${formatCurrency(interes)}`,
              monto: interes,
            });
          }
        }

        const montoTotal =
          montoCuotaSocial + montoAmarra + montoVisitas + montoCuotasPlanes + montoIntereses;

        vistaPreviaCalculada.push({
          socio,
          montoCuotaSocial,
          montoAmarra,
          montoVisitas,
          montoCuotasPlanes,
          montoIntereses,
          montoTotal,
          visitas: visitasSocio,
          embarcaciones: embarcacionesSocio,
          cuponesVencidos: cuponesVencidosConInteres,
          items: itemsPrevia,
        });
      }

      setVistaPrevia(vistaPreviaCalculada);
      setMostrarVistaPrevia(true);
    } catch (err: any) {
      setError(err.message || 'Error al calcular vista previa');
    } finally {
      setLoading(false);
    }
  };

  const generarCupones = async () => {
    if (!configuracion || !fechaVencimiento || vistaPrevia.length === 0) {
      setError('Por favor calcule la vista previa primero');
      return;
    }

    setGenerando(true);
    setError(null);
    
    const total = vistaPrevia.length;
    setProgresoGeneracion({ current: 0, total, mensaje: 'Iniciando generación...' });

    try {
      const supabase = createClient();
      const fechaEmision = new Date().toISOString().split('T')[0];

      // Arrays para acumular actualizaciones batch
      const visitasParaActualizar: Array<{id: number; cupon_id: number; fechaEmision: string}> = [];

      // Generar cupones para cada socio
      for (let i = 0; i < vistaPrevia.length; i++) {
        const item = vistaPrevia[i];
        
        // Actualizar progreso
        setProgresoGeneracion({
          current: i + 1,
          total,
          mensaje: `Generando cupón ${i + 1} de ${total} (Socio #${item.socio.numero_socio})...`
        });
        
        // Generar número de cupón único
        const numeroCupon = `CUP-${anio}${String(mes).padStart(2, '0')}-${String(item.socio.numero_socio).padStart(4, '0')}`;

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
            monto_otros_cargos: item.montoCuotasPlanes, // Cuotas de planes van en otros_cargos
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

        // Crear items del cupón usando los items de la vista previa
        const items: Array<{ cupon_id: number; descripcion: string; cantidad: number; precio_unitario: number | null; subtotal: number }> = [];

        // Usar los items calculados en la vista previa
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
            // Extraer precio unitario de la descripción o calcularlo
            const precioUnitario = itemPrevia.monto;
            items.push({
              cupon_id: cupon.id,
              descripcion: itemPrevia.descripcion,
              cantidad: 1,
              precio_unitario: precioUnitario,
              subtotal: itemPrevia.monto,
            });
          } else if (itemPrevia.tipo === 'visita') {
            // Buscar la visita correspondiente para obtener cantidad y precio unitario
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
          // Implementar envío de email
          logger.log(`Enviar email a ${item.socio.email}`);
        }
        
        // Permitir renderizado cada N elementos
        if (i % 5 === 0 || i === vistaPrevia.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
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

      onSuccess?.();
      onClose();
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

  // Función helper para calcular costo de amarra según tipo
  const calcularCostoAmarra = (embarcacion: Embarcacion, config: Configuracion): number => {
    const tipo = embarcacion.tipo?.toLowerCase();
    const eslora = parseFloat(embarcacion.eslora_pies?.toString() || '0');

    // Cruceros y veleros: por pie
    if (tipo === 'crucero' || tipo === 'velero') {
      return eslora * config.amarra_valor_por_pie;
    }

    // Guardería vela ligera, optimist, moto de agua, cuatriciclo: $42,000
    if (tipo === 'vela_ligera' || tipo === 'optimist' || tipo === 'moto_agua' || tipo === 'cuatriciclo') {
      return 42000;
    }

    // Guardería windsurf, kayak, canoa: $14,000
    if (tipo === 'windsurf' || tipo === 'kayak' || tipo === 'canoa') {
      return 14000;
    }

    // Guardería lancha/moto hasta 5.5m: $56,000
    if (tipo === 'lancha') {
      // Verificar si es hasta 5.5m (aproximadamente 18 pies)
      if (eslora <= 18) {
        return 56000;
      }
    }

    // Por defecto: calcular por pie (cruceros/veleros)
    return eslora * config.amarra_valor_por_pie;
  };

  // Función helper para obtener descripción de amarra según tipo
  const obtenerDescripcionAmarra = (embarcacion: Embarcacion, config: Configuracion): string => {
    const tipo = embarcacion.tipo?.toLowerCase();
    const eslora = parseFloat(embarcacion.eslora_pies?.toString() || '0');
    const nombreEmbarcacion = embarcacion.nombre || '';

    if (tipo === 'crucero' || tipo === 'velero') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} ` : '';
      return `Amarra embarcación ${nombreParte}${eslora} pies × ${formatCurrency(config.amarra_valor_por_pie)}`;
    }

    if (tipo === 'vela_ligera') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería vela ligera`;
    }

    if (tipo === 'optimist') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería optimist`;
    }

    if (tipo === 'moto_agua') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería moto de agua`;
    }

    if (tipo === 'cuatriciclo') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería cuatriciclo`;
    }

    if (tipo === 'windsurf' || tipo === 'kayak' || tipo === 'canoa') {
      const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
      return `${nombreParte}Guardería windsurf/kayak/canoa`;
    }

    if (tipo === 'lancha') {
      if (eslora <= 18) {
        const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} - ` : '';
        return `${nombreParte}Guardería lancha/moto hasta 5.5m`;
      }
    }

    // Por defecto
    const nombreParte = nombreEmbarcacion ? `${nombreEmbarcacion} ` : '';
    return `Amarra embarcación ${nombreParte}${eslora} pies × ${formatCurrency(config.amarra_valor_por_pie)}`;
  };

  const totalEstimado = vistaPrevia.reduce((sum, item) => sum + item.montoTotal, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generar Cupones Mensuales" size="xl">
      <div className="space-y-6">
        {/* Barra de progreso durante generación */}
        {progresoGeneracion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
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

        {!mostrarVistaPrevia ? (
          <>
            {/* Formulario */}
            <div className="space-y-4">
              {!configuracion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={calcularVistaPrevia}
                disabled={loading || !fechaVencimiento || !configuracion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!configuracion ? 'Cargando configuración...' : !fechaVencimiento ? 'Seleccione fecha de vencimiento' : ''}
              >
                {loading ? 'Calculando...' : 'Calcular Vista Previa'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Vista Previa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Socios a procesar</p>
                  <p className="text-lg font-semibold text-gray-900">{vistaPrevia.length}</p>
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

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Socio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cuota Social
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amarra
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Visitas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Intereses
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vistaPrevia.map((item) => {
                    const isExpanded = sociosExpandidos.has(item.socio.id);
                    return (
                      <React.Fragment key={item.socio.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {item.items.length > 0 && (
                              <button
                                onClick={() => {
                                  const nuevos = new Set(sociosExpandidos);
                                  if (isExpanded) {
                                    nuevos.delete(item.socio.id);
                                  } else {
                                    nuevos.add(item.socio.id);
                                  }
                                  setSociosExpandidos(nuevos);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {getNombreCompleto(item.socio)}
                            <span className="text-gray-500 ml-2">
                              (#{item.socio.numero_socio})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.montoCuotaSocial)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.montoAmarra)}
                            {item.embarcaciones.length > 0 && (
                              <span className="text-xs text-gray-500 block">
                                ({item.embarcaciones.length} embarcación{item.embarcaciones.length > 1 ? 'es' : ''})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.montoVisitas)}
                            {item.visitas.length > 0 && (
                              <span className="text-xs text-gray-500 block">
                                ({item.visitas.length} visita{item.visitas.length > 1 ? 's' : ''})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.montoIntereses)}
                            {item.cuponesVencidos.length > 0 && (
                              <span className="text-xs text-gray-500 block">
                                ({item.cuponesVencidos.length} cupón{item.cuponesVencidos.length > 1 ? 'es' : ''})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(item.montoTotal)}
                          </td>
                        </tr>
                        {isExpanded && item.items.length > 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-3 bg-gray-50">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Items del cupón:</p>
                                {item.items.map((itemPrevia, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                    <span>{itemPrevia.descripcion}</span>
                                    <span className="font-medium">{formatCurrency(itemPrevia.monto)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setMostrarVistaPrevia(false);
                  setVistaPrevia([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={generarCupones}
                disabled={generando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generando ? 'Generando...' : 'Generar Cupones'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

