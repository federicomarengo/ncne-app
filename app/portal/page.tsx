'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSocio from './DashboardSocio';

export default function PortalPage() {
  const router = useRouter();
  const [dni, setDni] = useState('');
  const [numeroSocio, setNumeroSocio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socioAutenticado, setSocioAutenticado] = useState<any>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // Verificar si hay sesión válida al cargar
  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const response = await fetch('/api/portal/socio');
      if (response.ok) {
        const data = await response.json();
        setSocioAutenticado(data.socio);
      } else {
        // No hay sesión válida
        setSocioAutenticado(null);
      }
    } catch (err) {
      // Error al verificar, asumir que no hay sesión
      setSocioAutenticado(null);
    } finally {
      setVerificandoSesion(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dni,
          numeroSocio: parseInt(numeroSocio),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'DNI o número de socio incorrecto');
        return;
      }

      // La sesión se guarda en cookies httpOnly, solo guardamos info básica en estado
      setSocioAutenticado(data.socio);
      
      // Recargar para asegurar que las cookies se establezcan
      router.refresh();
    } catch (err: any) {
      setError('Error al autenticar. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setSocioAutenticado(null);
      setDni('');
      setNumeroSocio('');
      router.push('/portal');
      router.refresh();
    }
  };

  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (socioAutenticado) {
    return <DashboardSocio socio={socioAutenticado} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 sm:p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Portal de Socios</h1>
          <p className="text-sm sm:text-base text-gray-600">Acceda a su información personal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm sm:text-base">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="dni" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              DNI
            </label>
            <input
              type="text"
              id="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={8}
              inputMode="numeric"
              className="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="12345678"
            />
          </div>

          <div>
            <label htmlFor="numeroSocio" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Número de Socio
            </label>
            <input
              type="number"
              id="numeroSocio"
              value={numeroSocio}
              onChange={(e) => setNumeroSocio(e.target.value)}
              required
              inputMode="numeric"
              className="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}




