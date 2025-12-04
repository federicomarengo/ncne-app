'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardSocio from './DashboardSocio';

export default function PortalPage() {
  const router = useRouter();
  const [dni, setDni] = useState('');
  const [numeroSocio, setNumeroSocio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socioAutenticado, setSocioAutenticado] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const dniLimpio = dni.replace(/\D/g, '');

      // Validar credenciales
      const { data, error: queryError } = await supabase
        .from('socios')
        .select('*')
        .eq('dni', dniLimpio)
        .eq('numero_socio', parseInt(numeroSocio))
        .maybeSingle();

      if (queryError || !data) {
        setError('DNI o número de socio incorrecto');
        return;
      }

      // Guardar en sessionStorage
      sessionStorage.setItem('socio_autenticado', JSON.stringify(data));
      setSocioAutenticado(data);
    } catch (err: any) {
      setError('Error al autenticar. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('socio_autenticado');
    setSocioAutenticado(null);
    setDni('');
    setNumeroSocio('');
  };

  // Verificar si ya está autenticado
  React.useEffect(() => {
    const socio = sessionStorage.getItem('socio_autenticado');
    if (socio) {
      try {
        setSocioAutenticado(JSON.parse(socio));
      } catch (err) {
        sessionStorage.removeItem('socio_autenticado');
      }
    }
  }, []);

  if (socioAutenticado) {
    return <DashboardSocio socio={socioAutenticado} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portal de Socios</h1>
          <p className="text-gray-600">Acceda a su información personal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-2">
              DNI
            </label>
            <input
              type="text"
              id="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345678"
            />
          </div>

          <div>
            <label htmlFor="numeroSocio" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Socio
            </label>
            <input
              type="number"
              id="numeroSocio"
              value={numeroSocio}
              onChange={(e) => setNumeroSocio(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}




