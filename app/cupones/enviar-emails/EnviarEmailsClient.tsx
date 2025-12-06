'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';

interface SocioParaEnvio {
  socio_id: number;
  numero_socio: number;
  nombre: string;
  apellido: string;
  email: string;
  cupon_id: number;
  numero_cupon: string;
  monto_total: number;
  estado: 'pendiente' | 'enviando' | 'enviado' | 'error';
  error_mensaje?: string;
}

export default function EnviarEmailsClient() {
  const router = useRouter();
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [socios, setSocios] = useState<SocioParaEnvio[]>([]);
  const [cuponesSeleccionados, setCuponesSeleccionados] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'con_email' | 'sin_email'>('con_email');
  const [modoDesarrollo, setModoDesarrollo] = useState(false);
  const [emailDesarrollo, setEmailDesarrollo] = useState<string | null>(null);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    if (mes && anio) {
      cargarCupones();
    }
    cargarConfiguracionEmail();
  }, [mes, anio]);

  const cargarConfiguracionEmail = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('configuracion_email')
        .select('modo_desarrollo, email_desarrollo')
        .eq('habilitado', true)
        .maybeSingle();
      
      if (data) {
        setModoDesarrollo(data.modo_desarrollo || false);
        setEmailDesarrollo(data.email_desarrollo);
      }
    } catch (err) {
      logger.error('Error al cargar configuración de email:', err);
    }
  };

  const cargarCupones = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data: cupones, error: cuponesError } = await supabase
        .from('cupones')
        .select(`
          id,
          numero_cupon,
          monto_total,
          socio_id,
          socio:socios!inner(
            id,
            numero_socio,
            nombre,
            apellido,
            email
          )
        `)
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio)
        .order('socio_id', { ascending: true });

      if (cuponesError) throw cuponesError;

      if (!cupones || cupones.length === 0) {
        setError(`No hay cupones generados para ${meses[mes - 1]} ${anio}`);
        setSocios([]);
        return;
      }

      const sociosData: SocioParaEnvio[] = cupones.map(cupon => {
        // El socio puede ser un objeto o array según la inferencia de tipos de Supabase
        // En relaciones 1:1, siempre es un objeto
        const socio = Array.isArray(cupon.socio) ? cupon.socio[0] : cupon.socio;
        
        return {
          socio_id: socio.id,
          numero_socio: socio.numero_socio,
          nombre: socio.nombre,
          apellido: socio.apellido,
          email: socio.email,
          cupon_id: cupon.id,
          numero_cupon: cupon.numero_cupon,
          monto_total: cupon.monto_total,
          estado: 'pendiente' as const,
        };
      });

      setSocios(sociosData);
      
      // Seleccionar automáticamente los cupones de socios que tienen email
      const cuponesConEmail = new Set(
        sociosData
          .filter(s => s.email && s.email.trim() !== '')
          .map(s => s.cupon_id)
      );
      setCuponesSeleccionados(cuponesConEmail);

    } catch (err: any) {
      setError('Error al cargar cupones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarTodos = () => {
    const cuponesConEmail = socios.filter(s => s.email && s.email.trim() !== '');
    setCuponesSeleccionados(new Set(cuponesConEmail.map(s => s.cupon_id)));
  };

  const handleDeseleccionarTodos = () => {
    setCuponesSeleccionados(new Set());
  };

  const handleToggleCupon = (cuponId: number) => {
    const nuevosSeleccionados = new Set(cuponesSeleccionados);
    if (nuevosSeleccionados.has(cuponId)) {
      nuevosSeleccionados.delete(cuponId);
    } else {
      nuevosSeleccionados.add(cuponId);
    }
    setCuponesSeleccionados(nuevosSeleccionados);
  };

  const handleEnviarMasivo = async () => {
    if (cuponesSeleccionados.size === 0) {
      setError('Debe seleccionar al menos un cupón');
      return;
    }

    const confirmar = window.confirm(
      `¿Está seguro de enviar ${cuponesSeleccionados.size} emails?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setEnviando(true);
    setError(null);
    setProgreso({ actual: 0, total: cuponesSeleccionados.size });

    const cuponesAEnviar = socios.filter(s => cuponesSeleccionados.has(s.cupon_id));
    let enviados = 0;
    let errores = 0;

    // Enviar en lotes para evitar saturar el servidor
    for (const cupon of cuponesAEnviar) {
      // Actualizar estado a "enviando"
      setSocios(prev => 
        prev.map(s => s.cupon_id === cupon.cupon_id ? { ...s, estado: 'enviando' as const } : s)
      );

      try {
        const response = await fetch('/api/emails/enviar-masivo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cupon_id: cupon.cupon_id }),
        });

        const data = await response.json();

        if (data.success) {
          setSocios(prev => 
            prev.map(s => s.cupon_id === cupon.cupon_id ? { ...s, estado: 'enviado' as const } : s)
          );
          enviados++;
        } else {
          setSocios(prev => 
            prev.map(s => s.cupon_id === cupon.cupon_id ? { 
              ...s, 
              estado: 'error' as const, 
              error_mensaje: data.error || 'Error desconocido'
            } : s)
          );
          errores++;
        }
      } catch (err: any) {
        setSocios(prev => 
          prev.map(s => s.cupon_id === cupon.cupon_id ? { 
            ...s, 
            estado: 'error' as const, 
            error_mensaje: err.message
          } : s)
        );
        errores++;
      }

      setProgreso(prev => prev ? { ...prev, actual: prev.actual + 1 } : null);

      // Delay para evitar saturar el servidor SMTP
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setEnviando(false);
    setProgreso(null);

    if (errores === 0) {
      alert(`✅ Envío completado exitosamente\n\n${enviados} emails enviados`);
    } else {
      alert(`⚠️ Envío completado con errores\n\n${enviados} enviados\n${errores} errores`);
    }
  };

  const sociosFiltrados = socios.filter(s => {
    if (filtro === 'con_email') return s.email && s.email.trim() !== '';
    if (filtro === 'sin_email') return !s.email || s.email.trim() === '';
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getEstadoBadge = (estado: SocioParaEnvio['estado']) => {
    switch (estado) {
      case 'pendiente':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Pendiente</span>;
      case 'enviando':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Enviando...</span>;
      case 'enviado':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Enviado</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">✗ Error</span>;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Envío Masivo de Cupones</h1>
          <p className="text-gray-600 mt-1">Envía cupones por email a todos los socios del período seleccionado</p>
        </div>

        {/* Banner de Modo Desarrollo */}
        {modoDesarrollo && (
          <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-1">
                  ⚠️ Modo Desarrollo Activado
                </h3>
                <p className="text-sm text-orange-800 mb-2">
                  Todos los emails se enviarán únicamente a: <strong>{emailDesarrollo || 'No configurado'}</strong>
                </p>
                <p className="text-xs text-orange-700">
                  Los socios no recibirán los emails. Esto es útil para pruebas sin afectar a los usuarios reales.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Selector de período */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">
                  Mes
                </label>
                <select
                  id="mes"
                  value={mes}
                  onChange={(e) => setMes(parseInt(e.target.value))}
                  disabled={enviando}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  {meses.map((nombreMes, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {nombreMes}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="anio" className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <input
                  type="number"
                  id="anio"
                  value={anio}
                  onChange={(e) => setAnio(parseInt(e.target.value))}
                  disabled={enviando}
                  min="2020"
                  max="2099"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="filtro" className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar socios
                </label>
                <select
                  id="filtro"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value as any)}
                  disabled={enviando}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="con_email">Con email</option>
                  <option value="sin_email">Sin email</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Progreso */}
          {progreso && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Enviando emails... {progreso.actual} de {progreso.total}
                </span>
                <span className="text-sm font-semibold text-blue-900">
                  {Math.round((progreso.actual / progreso.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Estadísticas */}
          {socios.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Cupones</p>
                <p className="text-2xl font-bold text-gray-900">{socios.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 mb-1">Con Email</p>
                <p className="text-2xl font-bold text-green-900">
                  {socios.filter(s => s.email && s.email.trim() !== '').length}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600 mb-1">Seleccionados</p>
                <p className="text-2xl font-bold text-yellow-900">{cuponesSeleccionados.size}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">Enviados</p>
                <p className="text-2xl font-bold text-blue-900">
                  {socios.filter(s => s.estado === 'enviado').length}
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando cupones...</p>
              </div>
            </div>
          )}

          {/* Tabla de socios */}
          {!loading && socios.length > 0 && (
            <>
              {/* Acciones de selección */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleSeleccionarTodos}
                    disabled={enviando}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={handleDeseleccionarTodos}
                    disabled={enviando}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
                  >
                    Deseleccionar todos
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Mostrando {sociosFiltrados.length} de {socios.length} cupones
                </p>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={cuponesSeleccionados.size > 0 && cuponesSeleccionados.size === socios.filter(s => s.email).length}
                          onChange={(e) => e.target.checked ? handleSeleccionarTodos() : handleDeseleccionarTodos()}
                          disabled={enviando}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Socio
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cupón
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sociosFiltrados.map((socio) => (
                      <tr key={socio.cupon_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={cuponesSeleccionados.has(socio.cupon_id)}
                            onChange={() => handleToggleCupon(socio.cupon_id)}
                            disabled={enviando || !socio.email}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{socio.apellido}, {socio.nombre}</div>
                          <div className="text-gray-500">#{socio.numero_socio}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {socio.email || <span className="text-red-500 italic">Sin email</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                          {socio.numero_cupon}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(socio.monto_total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getEstadoBadge(socio.estado)}
                          {socio.error_mensaje && (
                            <div className="text-xs text-red-600 mt-1" title={socio.error_mensaje}>
                              {socio.error_mensaje.substring(0, 30)}...
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón de envío */}
              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleEnviarMasivo}
                  disabled={enviando || cuponesSeleccionados.size === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {enviando ? '📧 Enviando...' : `📧 Enviar ${cuponesSeleccionados.size} Emails`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

