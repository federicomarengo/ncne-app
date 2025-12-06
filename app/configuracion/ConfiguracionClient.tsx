'use client';

import React, { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Configuracion, ConfiguracionUpdate } from '@/app/types/configuracion';
import { guardarConfiguracion, restaurarValoresPredeterminados } from '@/app/utils/configuracion';
import { createClient } from '@/utils/supabase/client';
import ConfiguracionEmailSection from '@/app/components/ConfiguracionEmailSection';

interface ConfiguracionClientProps {
  configuracionInicial: Configuracion;
}

export default function ConfiguracionClient({ configuracionInicial }: ConfiguracionClientProps) {
  const router = useRouter();
  const formId = useId();
  const [formData, setFormData] = useState<ConfiguracionUpdate>({
    club_nombre: configuracionInicial.club_nombre,
    club_direccion: configuracionInicial.club_direccion,
    club_telefono1: configuracionInicial.club_telefono1,
    club_telefono2: configuracionInicial.club_telefono2,
    club_email1: configuracionInicial.club_email1,
    club_email2: configuracionInicial.club_email2,
    club_web: configuracionInicial.club_web,
    banco_cbu: configuracionInicial.banco_cbu,
    banco_alias: configuracionInicial.banco_alias,
    banco_nombre: configuracionInicial.banco_nombre,
    banco_titular: configuracionInicial.banco_titular,
    banco_tipo_cuenta: configuracionInicial.banco_tipo_cuenta,
    costo_visita: configuracionInicial.costo_visita,
    cuota_social_base: configuracionInicial.cuota_social_base,
    amarra_valor_por_pie: configuracionInicial.amarra_valor_por_pie,
    guarderia_vela_ligera: configuracionInicial.guarderia_vela_ligera,
    guarderia_windsurf: configuracionInicial.guarderia_windsurf,
    guarderia_lancha: configuracionInicial.guarderia_lancha,
    dia_vencimiento: configuracionInicial.dia_vencimiento,
    dias_gracia: configuracionInicial.dias_gracia,
    tasa_interes_mora: configuracionInicial.tasa_interes_mora,
    generacion_automatica: configuracionInicial.generacion_automatica,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? null : value }));
    }

    // Limpiar mensajes al cambiar valores
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Formatear CBU: remover espacios y guiones, mantener solo dígitos
  const handleCBUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 22);
    setFormData((prev) => ({ ...prev, banco_cbu: value || null }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Validaciones
  const validarEmail = (email: string | null): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validarCBU = (cbu: string | null): boolean => {
    if (!cbu) return false;
    return /^[0-9]{22}$/.test(cbu);
  };

  const validarFormulario = (): string | null => {
    // Validar campos obligatorios de club
    if (!formData.club_nombre || formData.club_nombre.trim().length === 0) {
      return 'El nombre del club es obligatorio';
    }
    if (!formData.club_telefono1 || formData.club_telefono1.trim().length === 0) {
      return 'El teléfono principal es obligatorio';
    }
    if (!formData.club_email1 || !validarEmail(formData.club_email1)) {
      return 'El email principal debe tener un formato válido';
    }
    if (formData.club_email2 && !validarEmail(formData.club_email2)) {
      return 'El email secundario debe tener un formato válido';
    }

    // Validar datos bancarios
    if (formData.banco_cbu && !validarCBU(formData.banco_cbu)) {
      return 'El CBU debe tener exactamente 22 dígitos numéricos';
    }
    if (!formData.banco_titular || formData.banco_titular.trim().length === 0) {
      return 'El titular de la cuenta es obligatorio';
    }

    // Validar valores numéricos
    if (formData.costo_visita !== null && formData.costo_visita !== undefined && formData.costo_visita < 0) {
      return 'El costo por visita no puede ser negativo';
    }
    if (formData.cuota_social_base !== null && formData.cuota_social_base !== undefined && formData.cuota_social_base < 0) {
      return 'La cuota social base no puede ser negativa';
    }
    if (formData.dia_vencimiento !== null && formData.dia_vencimiento !== undefined && (formData.dia_vencimiento < 1 || formData.dia_vencimiento > 31)) {
      return 'El día de vencimiento debe estar entre 1 y 31';
    }
    if (formData.dias_gracia !== null && formData.dias_gracia !== undefined && (formData.dias_gracia < 0 || formData.dias_gracia > 30)) {
      return 'Los días de gracia deben estar entre 0 y 30';
    }
    if (formData.tasa_interes_mora !== null && formData.tasa_interes_mora !== undefined && formData.tasa_interes_mora < 0) {
      return 'La tasa de interés no puede ser negativa';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar formulario
      const errorValidacion = validarFormulario();
      if (errorValidacion) {
        setError(errorValidacion);
        return;
      }

      // Preparar datos para guardar (limpiar valores vacíos)
      const datosAGuardar: ConfiguracionUpdate = {};
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          (datosAGuardar as any)[key] = value;
        }
      });

      // Guardar configuración
      const supabase = createClient();
      const resultado = await guardarConfiguracion(datosAGuardar, supabase);

      if (!resultado.success) {
        setError(resultado.error || 'Error al guardar la configuración');
        return;
      }

      setSuccess('Configuración guardada exitosamente');
      
      // Refrescar la página después de 1 segundo
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaurar valores iniciales
    setFormData({
      club_nombre: configuracionInicial.club_nombre,
      club_direccion: configuracionInicial.club_direccion,
      club_telefono1: configuracionInicial.club_telefono1,
      club_telefono2: configuracionInicial.club_telefono2,
      club_email1: configuracionInicial.club_email1,
      club_email2: configuracionInicial.club_email2,
      club_web: configuracionInicial.club_web,
      banco_cbu: configuracionInicial.banco_cbu,
      banco_alias: configuracionInicial.banco_alias,
      banco_nombre: configuracionInicial.banco_nombre,
      banco_titular: configuracionInicial.banco_titular,
      banco_tipo_cuenta: configuracionInicial.banco_tipo_cuenta,
      costo_visita: configuracionInicial.costo_visita,
      cuota_social_base: configuracionInicial.cuota_social_base,
      amarra_valor_por_pie: configuracionInicial.amarra_valor_por_pie,
      guarderia_vela_ligera: configuracionInicial.guarderia_vela_ligera,
      guarderia_windsurf: configuracionInicial.guarderia_windsurf,
      guarderia_lancha: configuracionInicial.guarderia_lancha,
      dia_vencimiento: configuracionInicial.dia_vencimiento,
      dias_gracia: configuracionInicial.dias_gracia,
      tasa_interes_mora: configuracionInicial.tasa_interes_mora,
      generacion_automatica: configuracionInicial.generacion_automatica,
    });
    setError(null);
    setSuccess(null);
  };

  const handleRestoreDefaults = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const resultado = await restaurarValoresPredeterminados(supabase);

      if (!resultado.success) {
        setError(resultado.error || 'Error al restaurar valores predeterminados');
        return;
      }

      setSuccess('Valores predeterminados restaurados exitosamente');
      setShowRestoreConfirm(false);

      // Refrescar la página después de 1 segundo
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al restaurar valores predeterminados');
    } finally {
      setLoading(false);
    }
  };

  // Formatear número para mostrar con separadores
  const formatCurrency = (value: number | null): string => {
    if (value === null) return '';
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600 mt-1">Gestiona los parámetros y datos del club</p>
        </div>

        {/* Mensajes de éxito/error */}
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

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección 1: Datos del Club */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Datos del Club
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="club_nombre" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Club *
                  </label>
                  <input
                    type="text"
                    id="club_nombre"
                    name="club_nombre"
                    value={formData.club_nombre || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Club Náutico Embalse"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="club_direccion" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    id="club_direccion"
                    name="club_direccion"
                    value={formData.club_direccion || ''}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Dirección completa del club"
                  />
                </div>

                <div>
                  <label htmlFor="club_telefono1" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Principal *
                  </label>
                  <input
                    type="tel"
                    id="club_telefono1"
                    name="club_telefono1"
                    value={formData.club_telefono1 || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="351-1234567"
                  />
                </div>

                <div>
                  <label htmlFor="club_telefono2" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Secundario
                  </label>
                  <input
                    type="tel"
                    id="club_telefono2"
                    name="club_telefono2"
                    value={formData.club_telefono2 || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="351-9876543"
                  />
                </div>

                <div>
                  <label htmlFor="club_email1" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Principal *
                  </label>
                  <input
                    type="email"
                    id="club_email1"
                    name="club_email1"
                    value={formData.club_email1 || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="info@clubnautico.com"
                  />
                </div>

                <div>
                  <label htmlFor="club_email2" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Secundario
                  </label>
                  <input
                    type="email"
                    id="club_email2"
                    name="club_email2"
                    value={formData.club_email2 || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="administracion@clubnautico.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="club_web" className="block text-sm font-medium text-gray-700 mb-1">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    id="club_web"
                    name="club_web"
                    value={formData.club_web || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="https://www.clubnautico.com"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Datos Bancarios */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Datos Bancarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${formId}-banco_cbu`} className="block text-sm font-medium text-gray-700 mb-1">
                    CBU/CVU
                  </label>
                  <input
                    type="text"
                    id={`${formId}-banco_cbu`}
                    name="banco_cbu"
                    value={formData.banco_cbu || ''}
                    onChange={handleCBUChange}
                    maxLength={22}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="1234567890123456789012"
                  />
                  <p className="text-xs text-gray-500 mt-1">22 dígitos numéricos</p>
                </div>

                <div>
                  <label htmlFor={`${formId}-banco_alias`} className="block text-sm font-medium text-gray-700 mb-1">
                    Alias CBU
                  </label>
                  <input
                    type="text"
                    id={`${formId}-banco_alias`}
                    name="banco_alias"
                    value={formData.banco_alias || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="CLUB.NAUTICO.EMB"
                  />
                </div>

                <div>
                  <label htmlFor="banco_nombre" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Banco
                  </label>
                  <input
                    type="text"
                    id="banco_nombre"
                    name="banco_nombre"
                    value={formData.banco_nombre || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Banco Nación"
                  />
                </div>

                <div>
                  <label htmlFor="banco_tipo_cuenta" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    id="banco_tipo_cuenta"
                    name="banco_tipo_cuenta"
                    value={formData.banco_tipo_cuenta || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Caja de Ahorro">Caja de Ahorro</option>
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="banco_titular" className="block text-sm font-medium text-gray-700 mb-1">
                    Titular de la Cuenta *
                  </label>
                  <input
                    type="text"
                    id="banco_titular"
                    name="banco_titular"
                    value={formData.banco_titular || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Club Náutico Embalse"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Costos y Tarifas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Costos y Tarifas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cuota_social_base" className="block text-sm font-medium text-gray-700 mb-1">
                    Cuota Social Base
                  </label>
                  <input
                    type="number"
                    id="cuota_social_base"
                    name="cuota_social_base"
                    value={formData.cuota_social_base ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="28000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor base a partir del cual se calculan los demás conceptos
                  </p>
                </div>

                <div>
                  <label htmlFor="costo_visita" className="block text-sm font-medium text-gray-700 mb-1">
                    Costo por Visita
                  </label>
                  <input
                    type="number"
                    id="costo_visita"
                    name="costo_visita"
                    value={formData.costo_visita ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="4200.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">15% de la cuota social base</p>
                </div>

                <div>
                  <label htmlFor={`${formId}-amarra_valor_por_pie`} className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Amarra por Pie
                  </label>
                  <input
                    type="number"
                    id={`${formId}-amarra_valor_por_pie`}
                    name="amarra_valor_por_pie"
                    value={formData.amarra_valor_por_pie ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="2800.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">10% de la cuota social base</p>
                </div>

                <div>
                  <label htmlFor="guarderia_vela_ligera" className="block text-sm font-medium text-gray-700 mb-1">
                    Guardería Vela Ligera
                  </label>
                  <input
                    type="number"
                    id="guarderia_vela_ligera"
                    name="guarderia_vela_ligera"
                    value={formData.guarderia_vela_ligera ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="42000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">150% de la cuota social base</p>
                </div>

                <div>
                  <label htmlFor="guarderia_windsurf" className="block text-sm font-medium text-gray-700 mb-1">
                    Guardería Windsurf/Kayak
                  </label>
                  <input
                    type="number"
                    id="guarderia_windsurf"
                    name="guarderia_windsurf"
                    value={formData.guarderia_windsurf ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="14000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">50% de la cuota social base</p>
                </div>

                <div>
                  <label htmlFor="guarderia_lancha" className="block text-sm font-medium text-gray-700 mb-1">
                    Guardería Lancha/Moto
                  </label>
                  <input
                    type="number"
                    id="guarderia_lancha"
                    name="guarderia_lancha"
                    value={formData.guarderia_lancha ?? ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="56000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">200% de la cuota social base</p>
                </div>
              </div>
            </div>

            {/* Sección 4: Facturación */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Parámetros de Facturación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dia_vencimiento" className="block text-sm font-medium text-gray-700 mb-1">
                    Día de Vencimiento
                  </label>
                  <select
                    id="dia_vencimiento"
                    name="dia_vencimiento"
                    value={formData.dia_vencimiento ?? 15}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Día del mes para el vencimiento de cupones</p>
                </div>

                <div>
                  <label htmlFor="dias_gracia" className="block text-sm font-medium text-gray-700 mb-1">
                    Días de Gracia
                  </label>
                  <input
                    type="number"
                    id="dias_gracia"
                    name="dias_gracia"
                    value={formData.dias_gracia ?? ''}
                    onChange={handleChange}
                    min="0"
                    max="30"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Días antes de aplicar intereses por mora</p>
                </div>

                <div>
                  <label htmlFor="tasa_interes_mora" className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa de Interés por Mora (% mensual)
                  </label>
                  <input
                    type="number"
                    id="tasa_interes_mora"
                    name="tasa_interes_mora"
                    value={formData.tasa_interes_mora ? (formData.tasa_interes_mora * 100).toFixed(2) : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        tasa_interes_mora: value === '' ? undefined : parseFloat(value) / 100,
                      }));
                    }}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="4.50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Actual: {(formData.tasa_interes_mora ? formData.tasa_interes_mora * 100 : 0).toFixed(2)}%
                  </p>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center h-full pt-8">
                    <input
                      type="checkbox"
                      id="generacion_automatica"
                      name="generacion_automatica"
                      checked={formData.generacion_automatica ?? false}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="generacion_automatica" className="ml-3 text-sm font-medium text-gray-700">
                      Generación Automática Mensual
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botones de acción al final */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(true)}
                disabled={loading}
                className="px-4 py-2 text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Restaurar Predeterminados
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sección de Configuración de Email (independiente) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <ConfiguracionEmailSection />
        </div>
      </div>

      {/* Diálogo de confirmación para restaurar */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Restauración</h3>
            <p className="text-gray-600 mb-6">
              ¿Está seguro de que desea restaurar los valores predeterminados? Esta acción eliminará
              los datos del club y bancarios configurados, y restaurará solo los valores numéricos a
              sus predeterminados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Restaurando...' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

