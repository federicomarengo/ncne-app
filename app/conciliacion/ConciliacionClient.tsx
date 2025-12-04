'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MovimientoBancario, MovimientoProcesado, MatchResult, LineaExtracto, EstadisticasConciliacion } from '@/app/types/movimientos_bancarios';
import { parsearExtracto, procesarMovimiento, filtrarTransferenciasRecibidas } from '@/app/utils/parseExtractoBancario';
import { ejecutarMatching } from '@/app/utils/matchingAlgoritmo';
import { confirmarPagoDesdeMovimiento, confirmarPagosEnLote } from '@/app/utils/confirmarPagoConciliacion';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { generarHashMovimiento } from '@/app/utils/generarHashMovimiento';
import ProgressBar from '@/app/components/ProgressBar';
import DetalleMovimientoModal from '@/app/components/modals/DetalleMovimientoModal';

interface ConciliacionClientProps {
  movimientosIniciales: MovimientoBancario[];
}

type TabActivo = 'cargar' | 'match_exacto' | 'match_probable' | 'sin_match' | 'duplicados';

interface MovimientoConMatch {
  movimiento: MovimientoProcesado;
  match: MatchResult;
  id?: number;
  estado?: string;
  pagoAsociado?: {
    id: number;
    fecha_pago: string;
    monto: number;
    metodo_pago: string;
    referencia_bancaria?: string;
    socio?: {
      numero_socio: number;
      nombre: string;
      apellido: string;
    };
  };
}

export default function ConciliacionClient({ movimientosIniciales }: ConciliacionClientProps) {
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<TabActivo>('cargar');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<LineaExtracto[]>([]);
  const [movimientosProcesados, setMovimientosProcesados] = useState<MovimientoConMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoMatching, setProcesandoMatching] = useState(false);
  const [confirmandoPagos, setConfirmandoPagos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [progresoConfirmacion, setProgresoConfirmacion] = useState<{
    current: number;
    total: number;
    mensaje: string;
  } | null>(null);
  const [progresoProcesamiento, setProgresoProcesamiento] = useState<{
    current: number;
    total: number;
    mensaje: string;
  } | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoConMatch | null>(null);

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState<EstadisticasConciliacion>({
    total: 0,
    match_exacto: 0,
    match_probable: 0,
    sin_match: 0,
    duplicados: 0,
    procesados: 0,
    monto_total: 0,
  });

  // Manejar carga de archivo
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      setArchivo(file);
      setError(null);
      setSuccess(null);
      leerArchivo(file);
    } else {
      setError('Por favor seleccione un archivo .txt');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      setArchivo(file);
      setError(null);
      setSuccess(null);
      leerArchivo(file);
    } else {
      setError('Por favor arrastre un archivo .txt');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Leer y parsear archivo
  const leerArchivo = async (file: File) => {
    try {
      setLoading(true);
      const contenido = await file.text();
      const lineas = parsearExtracto(contenido);
      const transferencias = filtrarTransferenciasRecibidas(lineas);
      
      setVistaPrevia(transferencias.slice(0, 10)); // Primeras 10 líneas
      setError(null);
    } catch (err: any) {
      setError(`Error al leer el archivo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Procesar extracto y ejecutar matching
  const procesarExtracto = async () => {
    if (!archivo) return;

    try {
      setProcesandoMatching(true);
      setError(null);
      
      const contenido = await archivo.text();
      const lineas = parsearExtracto(contenido);
      const transferencias = filtrarTransferenciasRecibidas(lineas);

      // Procesar cada movimiento y ejecutar matching (OPTIMIZADO)
      let movimientosConMatch: MovimientoConMatch[] = [];
      const supabaseClient = createSupabaseClient();
      
      // PRE-PROCESAR: Convertir todas las líneas a movimientos
      const movimientos = transferencias.map(linea => procesarMovimiento(linea));
      
      // PRE-GENERAR: Todos los hashes en paralelo
      const hashes = await Promise.all(
        movimientos.map(m => generarHashMovimiento(m))
      );
      
      // VERIFICAR: Todos los duplicados en una sola consulta
      const { data: movimientosExistentes } = await supabaseClient
        .from('movimientos_bancarios')
        .select('hash_movimiento, id, estado, pago_id')
        .in('hash_movimiento', hashes);
      
      // Crear mapa para acceso rápido O(1)
      const movimientosPorHash = new Map();
      if (movimientosExistentes) {
        movimientosExistentes.forEach((m: any) => {
          movimientosPorHash.set(m.hash_movimiento, m);
        });
      }
      
      // Procesar cada movimiento con los datos pre-cargados
      const total = movimientos.length;
      setProgresoProcesamiento({ 
        current: 0, 
        total, 
        mensaje: 'Iniciando procesamiento...' 
      });

      for (let i = 0; i < movimientos.length; i++) {
        const movimiento = movimientos[i];
        const hashMovimiento = hashes[i];
        const movimientoExistente = movimientosPorHash.get(hashMovimiento);
        
        // Actualizar progreso
        setProgresoProcesamiento({
          current: i + 1,
          total,
          mensaje: `Procesando movimiento ${i + 1} de ${total}...`
        });
        
        // Si ya existe y tiene pago, marcarlo como duplicado
        if (movimientoExistente && movimientoExistente.pago_id) {
          movimientosConMatch.push({
            movimiento,
            match: {
              socio_id: null,
              nivel: 'F',
              porcentaje_confianza: 0,
              razon: `Movimiento duplicado (ya procesado - Movimiento ID: ${movimientoExistente.id}, Pago ID: ${movimientoExistente.pago_id})`,
            },
            id: movimientoExistente.id,
            estado: 'ya_registrado',
          });
          continue;
        }
        
        // Si existe pero no tiene pago, o no existe, continuar con el matching
        const match = await ejecutarMatching(movimiento, supabaseClient);
        
        movimientosConMatch.push({
          movimiento,
          match,
          id: movimientoExistente?.id,
          estado: movimientoExistente?.estado,
        });
        
        // Permitir renderizado cada N elementos
        if (i % 10 === 0 || i === movimientos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Cargar información de pagos asociados para duplicados
      const movimientosDuplicadosIds = movimientosConMatch
        .filter(m => m.estado === 'ya_registrado' && m.id)
        .map(m => m.id!);

      if (movimientosDuplicadosIds.length > 0) {
        // Obtener los pago_id de los movimientos duplicados
        const { data: movimientosConPago } = await supabaseClient
          .from('movimientos_bancarios')
          .select('id, pago_id')
          .in('id', movimientosDuplicadosIds)
          .not('pago_id', 'is', null);

        if (movimientosConPago && movimientosConPago.length > 0) {
          const pagoIds = movimientosConPago.map(m => m.pago_id).filter((id): id is number => id !== null);
          
          // Cargar información de los pagos
          const { data: pagosData } = await supabaseClient
            .from('pagos')
            .select(`
              id,
              fecha_pago,
              monto,
              metodo_pago,
              referencia_bancaria,
              socio_id
            `)
            .in('id', pagoIds);

          // Cargar información de socios
          const socioIds = pagosData?.map(p => p.socio_id).filter((id): id is number => id !== null) || [];
          const { data: sociosData } = await supabaseClient
            .from('socios')
            .select('id, numero_socio, nombre, apellido')
            .in('id', socioIds);

          // Crear mapa de socios por ID
          const sociosPorId = new Map();
          sociosData?.forEach(s => {
            sociosPorId.set(s.id, s);
          });

          // Crear mapa de pagos por movimiento_id
          const pagosPorMovimientoId = new Map<number, any>();
          movimientosConPago.forEach(mov => {
            if (mov.pago_id) {
              const pago = pagosData?.find(p => p.id === mov.pago_id);
              if (pago) {
                pagosPorMovimientoId.set(mov.id, pago);
              }
            }
          });

          // Asignar pagos a movimientos
          const movimientosConMatchActualizados = movimientosConMatch.map(m => {
            if (m.estado === 'ya_registrado' && m.id) {
              const pago = pagosPorMovimientoId.get(m.id);
              if (pago && pago.socio_id) {
                const socio = sociosPorId.get(pago.socio_id);
                return {
                  ...m,
                  pagoAsociado: {
                    id: pago.id,
                    fecha_pago: pago.fecha_pago,
                    monto: pago.monto,
                    metodo_pago: pago.metodo_pago,
                    referencia_bancaria: pago.referencia_bancaria,
                    socio: socio ? {
                      numero_socio: socio.numero_socio,
                      nombre: socio.nombre,
                      apellido: socio.apellido,
                    } : undefined,
                  },
                };
              }
            }
            return m;
          });
          
          // Actualizar la variable original
          movimientosConMatch = movimientosConMatchActualizados;
        }
      }

      setMovimientosProcesados(movimientosConMatch);
      actualizarEstadisticas(movimientosConMatch);
      
      // Cambiar al tab de match exacto si hay resultados
      if (movimientosConMatch.some(m => m.match.nivel === 'A' || m.match.nivel === 'B')) {
        setTabActivo('match_exacto');
      }
      
      setSuccess(`Se procesaron ${movimientosConMatch.length} movimientos`);
    } catch (err: any) {
      setError(`Error al procesar el extracto: ${err.message}`);
    } finally {
      setProcesandoMatching(false);
      setProgresoProcesamiento(null);
    }
  };

  // Actualizar estadísticas
  const actualizarEstadisticas = (movimientos: MovimientoConMatch[]) => {
    const stats: EstadisticasConciliacion = {
      total: movimientos.length,
      match_exacto: 0,
      match_probable: 0,
      sin_match: 0,
      duplicados: 0,
      procesados: 0,
      monto_total: 0,
    };

    movimientos.forEach((m) => {
      stats.monto_total += m.movimiento.monto;
      
      // Contar duplicados primero
      if (m.estado === 'ya_registrado') {
        stats.duplicados++;
      } else if (m.match.nivel === 'A' || m.match.nivel === 'B') {
        stats.match_exacto++;
      } else if (m.match.nivel === 'C' || m.match.nivel === 'D' || m.match.nivel === 'E') {
        stats.match_probable++;
      } else if (m.match.nivel === 'F') {
        stats.sin_match++;
      }
      
      if (m.estado === 'procesado') {
        stats.procesados++;
      }
    });

    setEstadisticas(stats);
  };

  // Confirmar todos los movimientos con match exacto
  const handleConfirmarTodosExactos = async () => {
    if (movimientosMatchExacto.length === 0) return;

    if (!window.confirm(`¿Confirma que desea procesar ${movimientosMatchExacto.length} pagos?`)) {
      return;
    }

    setConfirmandoPagos(true);
    setError(null);
    setSuccess(null);
    setProgresoConfirmacion({ current: 0, total: movimientosMatchExacto.length, mensaje: 'Iniciando confirmación...' });

    try {
      const supabase = createSupabaseClient();
      
      const movimientosParaConfirmar = movimientosMatchExacto.map(m => ({
        movimiento: m.movimiento,
        match: m.match,
      }));

      const resultado = await confirmarPagosEnLote(
        movimientosParaConfirmar, 
        supabase,
        (current, total, mensaje) => {
          setProgresoConfirmacion({ current, total, mensaje });
        }
      );

      if (resultado.exitosos > 0) {
        setSuccess(
          `Se confirmaron exitosamente ${resultado.exitosos} pagos. ` +
          (resultado.fallidos > 0 ? `${resultado.fallidos} pagos fallaron.` : '')
        );

        // Remover los movimientos confirmados de la lista
        setMovimientosProcesados((prev) =>
          prev.filter((m, index) => {
            const esMatchExacto = m.match.nivel === 'A' || m.match.nivel === 'B';
            if (!esMatchExacto) return true;
            const indice = movimientosMatchExacto.findIndex(
              (exacto) => exacto.movimiento === m.movimiento
            );
            return indice === -1 || resultado.errores.some(
              (err) => err.movimiento === m.movimiento
            );
          })
        );

        // Actualizar estadísticas
        actualizarEstadisticas(
          movimientosProcesados.filter((m, index) => {
            const esMatchExacto = m.match.nivel === 'A' || m.match.nivel === 'B';
            if (!esMatchExacto) return true;
            const indice = movimientosMatchExacto.findIndex(
              (exacto) => exacto.movimiento === m.movimiento
            );
            return indice === -1 || resultado.errores.some(
              (err) => err.movimiento === m.movimiento
            );
          })
        );

        // Refrescar la página después de 2 segundos
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setError(`No se pudo confirmar ningún pago. ${resultado.errores[0]?.error || ''}`);
      }
    } catch (err: any) {
        setError(`Error al confirmar pagos: ${err.message}`);
    } finally {
      setConfirmandoPagos(false);
      setProgresoConfirmacion(null);
    }
  };

  // Confirmar movimientos seleccionados
  const handleConfirmarSeleccionados = async () => {
    if (seleccionados.size === 0) return;

    if (!window.confirm(`¿Confirma que desea procesar ${seleccionados.size} pagos seleccionados?`)) {
      return;
    }

    setConfirmandoPagos(true);
    setError(null);
    setSuccess(null);
    setProgresoConfirmacion({ current: 0, total: seleccionados.size, mensaje: 'Iniciando confirmación...' });

    try {
      const supabase = createSupabaseClient();
      
      const indicesSeleccionados = Array.from(seleccionados);
      const movimientosSeleccionados = indicesSeleccionados
        .map((index) => movimientosMatchProbable[index])
        .filter(Boolean);

      if (movimientosSeleccionados.length === 0) {
        setError('No hay movimientos seleccionados válidos');
        return;
      }

      const movimientosParaConfirmar = movimientosSeleccionados.map(m => ({
        movimiento: m.movimiento,
        match: m.match,
      }));

      const resultado = await confirmarPagosEnLote(
        movimientosParaConfirmar, 
        supabase,
        (current, total, mensaje) => {
          setProgresoConfirmacion({ current, total, mensaje });
        }
      );

      if (resultado.exitosos > 0) {
        setSuccess(
          `Se confirmaron exitosamente ${resultado.exitosos} pagos. ` +
          (resultado.fallidos > 0 ? `${resultado.fallidos} pagos fallaron.` : '')
        );

        // Remover los movimientos confirmados de la lista
        setMovimientosProcesados((prev) =>
          prev.filter((m) => !movimientosSeleccionados.some((sel) => sel.movimiento === m.movimiento))
        );

        // Limpiar selección
        setSeleccionados(new Set());

        // Actualizar estadísticas
        actualizarEstadisticas(
          movimientosProcesados.filter((m) => 
            !movimientosSeleccionados.some((sel) => sel.movimiento === m.movimiento)
          )
        );

        // Refrescar la página después de 2 segundos
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setError(`No se pudo confirmar ningún pago. ${resultado.errores[0]?.error || ''}`);
      }
    } catch (err: any) {
      setError(`Error al confirmar pagos: ${err.message}`);
    } finally {
      setConfirmandoPagos(false);
      setProgresoConfirmacion(null);
    }
  };

  // Filtrar movimientos por categoría
  const movimientosMatchExacto = movimientosProcesados.filter(
    (m) => m.match.nivel === 'A' || m.match.nivel === 'B'
  );
  const movimientosMatchProbable = movimientosProcesados.filter(
    (m) => m.match.nivel === 'C' || m.match.nivel === 'D' || m.match.nivel === 'E'
  );
  const movimientosSinMatch = movimientosProcesados.filter(
    (m) => m.match.nivel === 'F' && m.estado !== 'ya_registrado'
  );
  const movimientosDuplicados = movimientosProcesados.filter(
    (m) => m.estado === 'ya_registrado' || 
           (m.match.nivel === 'F' && m.match.razon?.includes('duplicado'))
  );

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Conciliación Bancaria</h1>
          <p className="text-gray-600 mt-1">Procesa extractos bancarios y concilia automáticamente con socios</p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Barra de progreso durante procesamiento de extracto */}
        {progresoProcesamiento && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Procesando Extracto...
            </h3>
            <ProgressBar
              current={progresoProcesamiento.current}
              total={progresoProcesamiento.total}
              message={progresoProcesamiento.mensaje}
              color="blue"
            />
          </div>
        )}

        {/* Barra de progreso durante confirmación de pagos */}
        {progresoConfirmacion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Confirmando Pagos...
            </h3>
            <ProgressBar
              current={progresoConfirmacion.current}
              total={progresoConfirmacion.total}
              message={progresoConfirmacion.mensaje}
              color="blue"
            />
          </div>
        )}

        {/* Estadísticas */}
        {estadisticas.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">Match Exacto</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.match_exacto}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-600">Match Probable</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticas.match_probable}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600">Monto Total</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(estadisticas.monto_total)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setTabActivo('cargar')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === 'cargar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cargar Extracto
              </button>
              <button
                onClick={() => setTabActivo('match_exacto')}
                disabled={movimientosMatchExacto.length === 0}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tabActivo === 'match_exacto'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Match Exacto ({movimientosMatchExacto.length})
              </button>
              <button
                onClick={() => setTabActivo('match_probable')}
                disabled={movimientosMatchProbable.length === 0}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tabActivo === 'match_probable'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Match Probable ({movimientosMatchProbable.length})
              </button>
              <button
                onClick={() => setTabActivo('sin_match')}
                disabled={movimientosSinMatch.length === 0}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tabActivo === 'sin_match'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sin Match ({movimientosSinMatch.length})
              </button>
              <button
                onClick={() => setTabActivo('duplicados')}
                disabled={movimientosDuplicados.length === 0}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tabActivo === 'duplicados'
                    ? 'border-gray-500 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Duplicados ({movimientosDuplicados.length})
              </button>
            </nav>
          </div>

          {/* Contenido de Tabs */}
          <div className="p-6">
            {/* Tab: Cargar Extracto */}
            {tabActivo === 'cargar' && (
              <div className="space-y-6">
                {/* Zona de carga */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    loading
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-300 hover:border-blue-400 bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                    disabled={loading}
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Arrastre el archivo .txt aquí o haga clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-500">Formato: Extracto bancario en texto plano</p>
                  </label>
                </div>

                {/* Vista previa */}
                {vistaPrevia.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa (primeras 10 líneas)</h3>
                    <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-4">Fecha</th>
                            <th className="text-left py-2 px-4">Concepto</th>
                            <th className="text-right py-2 px-4">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vistaPrevia.map((linea, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-2 px-4">{formatDate(linea.fecha)}</td>
                              <td className="py-2 px-4 truncate max-w-md">{linea.concepto}</td>
                              <td className="py-2 px-4 text-right">{formatCurrency(linea.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={procesarExtracto}
                      disabled={procesandoMatching || loading}
                      className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {procesandoMatching ? 'Procesando...' : 'Procesar Extracto'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Match Exacto */}
            {tabActivo === 'match_exacto' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Movimientos con Match Exacto ({movimientosMatchExacto.length})
                  </h3>
                  {movimientosMatchExacto.length > 0 && (
                    <button
                      onClick={handleConfirmarTodosExactos}
                      disabled={confirmandoPagos}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmandoPagos ? 'Confirmando...' : `Confirmar Todos (${movimientosMatchExacto.length})`}
                    </button>
                  )}
                </div>
                <MovimientosTable 
                  movimientos={movimientosMatchExacto} 
                  formatCurrency={formatCurrency} 
                  formatDate={formatDate}
                  onVerDetalles={(item) => {
                    setMovimientoSeleccionado(item);
                    setModalDetalleAbierto(true);
                  }}
                />
              </div>
            )}

            {/* Tab: Match Probable */}
            {tabActivo === 'match_probable' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Movimientos con Match Probable ({movimientosMatchProbable.length})
                  </h3>
                  {seleccionados.size > 0 && (
                    <button
                      onClick={handleConfirmarSeleccionados}
                      disabled={confirmandoPagos}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmandoPagos ? 'Confirmando...' : `Confirmar Seleccionados (${seleccionados.size})`}
                    </button>
                  )}
                </div>
                <MovimientosTable 
                  movimientos={movimientosMatchProbable} 
                  formatCurrency={formatCurrency} 
                  formatDate={formatDate}
                  seleccionables
                  seleccionados={seleccionados}
                  setSeleccionados={setSeleccionados}
                  onVerDetalles={(item) => {
                    setMovimientoSeleccionado(item);
                    setModalDetalleAbierto(true);
                  }}
                  onCambiarSocio={(item) => {
                    setMovimientoSeleccionado(item);
                    setModalDetalleAbierto(true);
                  }}
                />
              </div>
            )}

            {/* Tab: Sin Match */}
            {tabActivo === 'sin_match' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Movimientos Sin Match ({movimientosSinMatch.length})
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Estos movimientos requieren asignación manual a un socio o marcar como "No es socio"
                </p>
                <MovimientosTable 
                  movimientos={movimientosSinMatch} 
                  formatCurrency={formatCurrency} 
                  formatDate={formatDate}
                  onVerDetalles={(item) => {
                    setMovimientoSeleccionado(item);
                    setModalDetalleAbierto(true);
                  }}
                  onAsignarSocio={(item) => {
                    setMovimientoSeleccionado(item);
                    setModalDetalleAbierto(true);
                  }}
                />
              </div>
            )}

            {/* Tab: Duplicados */}
            {tabActivo === 'duplicados' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Movimientos Duplicados / Ya Registrados ({movimientosDuplicados.length})
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Estos movimientos ya fueron procesados previamente y tienen un pago asociado
                </p>
                {movimientosDuplicados.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay movimientos duplicados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4">Fecha Movimiento</th>
                          <th className="text-right py-3 px-4">Monto</th>
                          <th className="text-left py-3 px-4">Concepto</th>
                          <th className="text-left py-3 px-4">Pago Asociado</th>
                          <th className="text-left py-3 px-4">Socio</th>
                          <th className="text-left py-3 px-4">Fecha Pago</th>
                          <th className="text-left py-3 px-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosDuplicados.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">{formatDate(item.movimiento.fecha_movimiento)}</td>
                            <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.movimiento.monto)}</td>
                            <td className="py-3 px-4 truncate max-w-md" title={item.movimiento.concepto_completo || ''}>
                              {item.movimiento.concepto_completo || '-'}
                            </td>
                            <td className="py-3 px-4">
                              {item.pagoAsociado ? (
                                <div className="space-y-1">
                                  <span className="font-medium">Pago #{item.pagoAsociado.id}</span>
                                  <span className="text-sm text-gray-500 block">
                                    {item.pagoAsociado.metodo_pago}
                                  </span>
                                  {item.pagoAsociado.referencia_bancaria && (
                                    <span className="text-xs text-gray-400 block">
                                      Ref: {item.pagoAsociado.referencia_bancaria}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Sin pago asociado</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {item.pagoAsociado?.socio ? (
                                <div>
                                  <span className="font-medium">
                                    {item.pagoAsociado.socio.apellido}, {item.pagoAsociado.socio.nombre}
                                  </span>
                                  <span className="text-sm text-gray-500 block">
                                    Socio #{item.pagoAsociado.socio.numero_socio}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {item.pagoAsociado?.fecha_pago ? (
                                <span>{formatDate(item.pagoAsociado.fecha_pago)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setMovimientoSeleccionado(item);
                                    setModalDetalleAbierto(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Ver detalles
                                </button>
                                {item.pagoAsociado && (
                                  <a
                                    href={`/pagos/${item.pagoAsociado.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                  >
                                    Ver pago
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalles del Movimiento */}
      {movimientoSeleccionado && (
        <DetalleMovimientoModal
          isOpen={modalDetalleAbierto}
          onClose={() => {
            setModalDetalleAbierto(false);
            setMovimientoSeleccionado(null);
          }}
          movimiento={movimientoSeleccionado.movimiento}
          match={movimientoSeleccionado.match}
          movimientoId={movimientoSeleccionado.id}
          estado={movimientoSeleccionado.estado}
          pagoAsociado={movimientoSeleccionado.pagoAsociado}
          onConfirmarPago={async () => {
            // Recargar movimientos procesados
            // TODO: Recargar desde la base de datos o actualizar estado local
            setModalDetalleAbierto(false);
            setMovimientoSeleccionado(null);
            // Recargar página o actualizar estado
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// Componente auxiliar para tabla de movimientos
interface MovimientosTableProps {
  movimientos: MovimientoConMatch[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  seleccionables?: boolean;
  seleccionados?: Set<number>;
  setSeleccionados?: (set: Set<number>) => void;
  onVerDetalles?: (movimiento: MovimientoConMatch) => void;
  onCambiarSocio?: (movimiento: MovimientoConMatch) => void;
  onAsignarSocio?: (movimiento: MovimientoConMatch) => void;
}

function MovimientosTable({
  movimientos,
  formatCurrency,
  formatDate,
  seleccionables = false,
  seleccionados,
  setSeleccionados,
  onVerDetalles,
  onCambiarSocio,
  onAsignarSocio,
}: MovimientosTableProps) {
  const toggleSeleccion = (index: number) => {
    if (!setSeleccionados || !seleccionados) return;
    const nuevo = new Set(seleccionados);
    if (nuevo.has(index)) {
      nuevo.delete(index);
    } else {
      nuevo.add(index);
    }
    setSeleccionados(nuevo);
  };

  if (movimientos.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay movimientos en esta categoría</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {seleccionables && <th className="text-left py-3 px-4 w-12"></th>}
            <th className="text-left py-3 px-4">Fecha</th>
            <th className="text-left py-3 px-4">Socio Identificado</th>
            <th className="text-left py-3 px-4">Concepto</th>
            <th className="text-right py-3 px-4">Monto</th>
            <th className="text-left py-3 px-4">Match</th>
            <th className="text-left py-3 px-4">Confianza</th>
            <th className="text-left py-3 px-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((item, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
              {seleccionables && (
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={seleccionados?.has(index) || false}
                    onChange={() => toggleSeleccion(index)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
              )}
              <td className="py-3 px-4">{formatDate(item.movimiento.fecha_movimiento)}</td>
              <td className="py-3 px-4">
                {item.match.nombre_completo || (
                  <span className="text-gray-400">No identificado</span>
                )}
              </td>
              <td className="py-3 px-4 truncate max-w-md" title={item.movimiento.concepto_completo || ''}>
                {item.movimiento.concepto_completo || '-'}
              </td>
              <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.movimiento.monto)}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.match.nivel === 'A' || item.match.nivel === 'B' ? 'bg-green-100 text-green-800' :
                  item.match.nivel === 'C' || item.match.nivel === 'D' ? 'bg-yellow-100 text-yellow-800' :
                  item.match.nivel === 'E' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Nivel {item.match.nivel}
                </span>
              </td>
              <td className="py-3 px-4">{item.match.porcentaje_confianza}%</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  {onVerDetalles && (
                    <button
                      onClick={() => onVerDetalles(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver detalles
                    </button>
                  )}
                  {onCambiarSocio && item.match.socio_id && (
                    <button
                      onClick={() => onCambiarSocio(item)}
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    >
                      Cambiar socio
                    </button>
                  )}
                  {onAsignarSocio && !item.match.socio_id && (
                    <button
                      onClick={() => onAsignarSocio(item)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Asignar socio
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

