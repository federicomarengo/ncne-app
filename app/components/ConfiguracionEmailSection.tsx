'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';
import { 
  ConfiguracionEmail, 
  ConfiguracionEmailCreate, 
  TipoSeguridad,
  EmailPruebaResponse 
} from '@/app/types/email';

export default function ConfiguracionEmailSection() {
  const [config, setConfig] = useState<ConfiguracionEmail | null>(null);
  const [formData, setFormData] = useState<ConfiguracionEmailCreate>({
    smtp_host: '',
    smtp_port: 587,
    smtp_usuario: '',
    smtp_password: '',
    smtp_seguridad: 'TLS',
    email_remitente: '',
    email_remitente_nombre: 'Club Náutico Embalse',
    habilitado: true,
    modo_desarrollo: false,
    email_desarrollo: null,
  });
  const [loading, setLoading] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailPrueba, setEmailPrueba] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('configuracion_email')
        .select('*')
        .maybeSingle();

      if (error) {
        logger.error('Error al cargar configuración de email:', error);
        return;
      }

      if (data) {
        setConfig(data as ConfiguracionEmail);
        setFormData({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_usuario: data.smtp_usuario,
          smtp_password: data.smtp_password,
          smtp_seguridad: data.smtp_seguridad as TipoSeguridad,
          email_remitente: data.email_remitente,
          email_remitente_nombre: data.email_remitente_nombre,
          habilitado: data.habilitado,
          modo_desarrollo: data.modo_desarrollo || false,
          email_desarrollo: data.email_desarrollo || null,
        });
      }
    } catch (err) {
      logger.error('Error al cargar configuración:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Limpiar mensajes
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validaciones
      if (!formData.smtp_host || !formData.smtp_usuario || !formData.smtp_password) {
        setError('Todos los campos marcados con * son obligatorios');
        setLoading(false);
        return;
      }

      if (formData.smtp_port < 1 || formData.smtp_port > 65535) {
        setError('El puerto debe estar entre 1 y 65535');
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.smtp_usuario) || !emailRegex.test(formData.email_remitente)) {
        setError('Los emails deben tener un formato válido');
        setLoading(false);
        return;
      }

      // Validar modo desarrollo
      if (formData.modo_desarrollo && (!formData.email_desarrollo || !emailRegex.test(formData.email_desarrollo))) {
        setError('Si el modo desarrollo está activo, debe ingresar un email de desarrollo válido');
        setLoading(false);
        return;
      }

      const supabase = createClient();

      if (config) {
        // Actualizar configuración existente
        const { error: updateError } = await supabase
          .from('configuracion_email')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (updateError) throw updateError;
      } else {
        // Crear nueva configuración
        const { error: insertError } = await supabase
          .from('configuracion_email')
          .insert(formData);

        if (insertError) throw insertError;
      }

      setSuccess('Configuración de email guardada exitosamente');
      await cargarConfiguracion();
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarPrueba = async () => {
    if (!emailPrueba) {
      setError('Ingrese un email de destino para la prueba');
      return;
    }

    setLoadingTest(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_destino: emailPrueba }),
      });

      const data: EmailPruebaResponse = await response.json();

      if (data.success) {
        setSuccess(`Email de prueba enviado exitosamente a ${emailPrueba}`);
        setEmailPrueba('');
      } else {
        setError(data.error || 'Error al enviar email de prueba');
      }
    } catch (err: any) {
      setError('Error al enviar email de prueba: ' + err.message);
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Configuración de Email (SMTP)
      </h3>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Host SMTP */}
        <div>
          <label htmlFor="smtp_host" className="block text-sm font-medium text-gray-700 mb-1">
            Host SMTP *
          </label>
          <input
            type="text"
            id="smtp_host"
            name="smtp_host"
            value={formData.smtp_host}
            onChange={handleChange}
            placeholder="mail.tudominio.com.ar"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Ejemplo: mail.tudominio.com.ar o smtp.tudominio.com.ar</p>
        </div>

        {/* Puerto y Seguridad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700 mb-1">
              Puerto *
            </label>
            <input
              type="number"
              id="smtp_port"
              name="smtp_port"
              value={formData.smtp_port}
              onChange={handleChange}
              min="1"
              max="65535"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">587 (TLS) o 465 (SSL)</p>
          </div>

          <div>
            <label htmlFor="smtp_seguridad" className="block text-sm font-medium text-gray-700 mb-1">
              Seguridad *
            </label>
            <select
              id="smtp_seguridad"
              name="smtp_seguridad"
              value={formData.smtp_seguridad}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TLS">STARTTLS (Puerto 587)</option>
              <option value="SSL">SSL/TLS (Puerto 465)</option>
              <option value="NONE">Sin encriptación</option>
            </select>
          </div>
        </div>

        {/* Usuario SMTP */}
        <div>
          <label htmlFor="smtp_usuario" className="block text-sm font-medium text-gray-700 mb-1">
            Usuario SMTP *
          </label>
          <input
            type="email"
            id="smtp_usuario"
            name="smtp_usuario"
            value={formData.smtp_usuario}
            onChange={handleChange}
            placeholder="no-reply@tudominio.com.ar"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">El email completo configurado en tu servidor</p>
        </div>

        {/* Contraseña */}
        <div>
          <label htmlFor="smtp_password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña SMTP *
          </label>
          <div className="relative">
            <input
              type={mostrarPassword ? 'text' : 'password'}
              id="smtp_password"
              name="smtp_password"
              value={formData.smtp_password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {mostrarPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">La contraseña de tu email en el servidor</p>
        </div>

        {/* Email Remitente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email_remitente" className="block text-sm font-medium text-gray-700 mb-1">
              Email Remitente *
            </label>
            <input
              type="email"
              id="email_remitente"
              name="email_remitente"
              value={formData.email_remitente}
              onChange={handleChange}
              placeholder="no-reply@tudominio.com.ar"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Email que aparecerá como remitente</p>
          </div>

          <div>
            <label htmlFor="email_remitente_nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Remitente *
            </label>
            <input
              type="text"
              id="email_remitente_nombre"
              name="email_remitente_nombre"
              value={formData.email_remitente_nombre}
              onChange={handleChange}
              placeholder="Club Náutico Embalse"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Nombre visible en el email</p>
          </div>
        </div>

        {/* Habilitado */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="habilitado"
              checked={formData.habilitado}
              onChange={handleChange}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Sistema de emails habilitado</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Desmarca para desactivar temporalmente el envío de emails
          </p>
        </div>

        {/* Modo Desarrollo */}
        <div className="pt-4 border-t border-gray-200">
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="modo_desarrollo"
                checked={formData.modo_desarrollo || false}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Modo Desarrollo</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Cuando está activo, todos los emails se enviarán únicamente a la dirección de desarrollo configurada, 
              sin importar el destinatario real. Útil para pruebas sin afectar a los socios.
            </p>
          </div>

          {formData.modo_desarrollo && (
            <div>
              <label htmlFor="email_desarrollo" className="block text-sm font-medium text-gray-700 mb-1">
                Email de Desarrollo *
              </label>
              <input
                type="email"
                id="email_desarrollo"
                name="email_desarrollo"
                value={formData.email_desarrollo || ''}
                onChange={handleChange}
                placeholder="dev@ejemplo.com"
                className="w-full px-4 py-2.5 border border-orange-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-orange-50"
              />
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Todos los emails se enviarán a esta dirección cuando el modo desarrollo esté activo
              </p>
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Guardando...' : config ? 'Actualizar Configuración' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* Sección de Prueba */}
      {config && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Enviar Email de Prueba</h4>
          <p className="text-sm text-gray-600 mb-4">
            Envía un email de prueba para verificar que la configuración SMTP funciona correctamente.
          </p>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={emailPrueba}
                onChange={(e) => setEmailPrueba(e.target.value)}
                placeholder="email@ejemplo.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleEnviarPrueba}
              disabled={loadingTest || !emailPrueba}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loadingTest ? 'Enviando...' : 'Enviar Prueba'}
            </button>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Información Importante</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• El puerto 587 usa STARTTLS (recomendado)</li>
          <li>• El puerto 465 usa SSL/TLS</li>
          <li>• El usuario SMTP es típicamente tu email completo</li>
          <li>• Consulta con tu hosting si tienes dudas sobre los datos</li>
          <li>• Se recomienda usar un email específico como no-reply@tudominio.com</li>
        </ul>
      </div>
    </div>
  );
}

