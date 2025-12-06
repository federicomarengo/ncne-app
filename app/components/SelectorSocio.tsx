'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/app/utils/logger';

interface SelectorSocioProps {
  onSocioSeleccionado: (socioId: number) => void;
  socioIdInicial?: number | null;
  className?: string;
}

interface Socio {
  id: number;
  numero_socio: number;
  nombre: string;
  apellido: string;
  dni?: string;
}

export default function SelectorSocio({
  onSocioSeleccionado,
  socioIdInicial,
  className = '',
}: SelectorSocioProps) {
  const [busqueda, setBusqueda] = useState('');
  const [socios, setSocios] = useState<Socio[]>([]);
  const [sociosFiltrados, setSociosFiltrados] = useState<Socio[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarSocios();
  }, []);

  useEffect(() => {
    if (socioIdInicial) {
      cargarSocioInicial(socioIdInicial);
    }
  }, [socioIdInicial]);

  useEffect(() => {
    if (busqueda.trim() === '') {
      setSociosFiltrados([]);
      setMostrarLista(false);
      return;
    }

    const busquedaLower = busqueda.toLowerCase();
    
    // Priorizar búsqueda por nombre/apellido, luego número de socio, luego DNI
    const filtrados = socios
      .map(socio => {
        const nombreCompleto = `${socio.apellido}, ${socio.nombre}`.toLowerCase();
        const apellidoLower = socio.apellido.toLowerCase();
        const nombreLower = socio.nombre.toLowerCase();
        const numeroSocio = socio.numero_socio.toString();
        const dni = socio.dni?.toString().toLowerCase() || '';

        // Calcular score de relevancia: mayor score = más relevante
        let score = 0;
        
        // Prioridad alta: coincidencia en nombre completo
        if (nombreCompleto.includes(busquedaLower)) {
          score += 100;
        }
        // Prioridad alta: coincidencia en apellido
        if (apellidoLower.includes(busquedaLower)) {
          score += 80;
        }
        // Prioridad media: coincidencia en nombre
        if (nombreLower.includes(busquedaLower)) {
          score += 60;
        }
        // Prioridad baja: coincidencia en número de socio
        if (numeroSocio.includes(busquedaLower)) {
          score += 20;
        }
        // Prioridad baja: coincidencia en DNI
        if (dni.includes(busquedaLower)) {
          score += 10;
        }

        return { socio, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Ordenar por score descendente, luego por apellido
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.socio.apellido.localeCompare(b.socio.apellido);
      })
      .map(item => item.socio);

    setSociosFiltrados(filtrados);
    setMostrarLista(filtrados.length > 0);
  }, [busqueda, socios]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarLista(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cargarSocios = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('socios')
        .select('id, numero_socio, nombre, apellido, dni')
        .eq('estado', 'activo')
        .order('apellido', { ascending: true });

      if (error) throw error;
      setSocios(data || []);
    } catch (err) {
      logger.error('Error al cargar socios:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarSocioInicial = async (socioId: number) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('socios')
        .select('id, numero_socio, nombre, apellido, dni')
        .eq('id', socioId)
        .single();

      if (error) throw error;
      if (data) {
        setSocioSeleccionado(data);
        setBusqueda(`${data.apellido}, ${data.nombre} (Socio #${data.numero_socio})`);
      }
    } catch (err) {
      logger.error('Error al cargar socio inicial:', err);
    }
  };

  const handleSeleccionarSocio = (socio: Socio) => {
    setSocioSeleccionado(socio);
    setBusqueda(`${socio.apellido}, ${socio.nombre} (Socio #${socio.numero_socio})`);
    setMostrarLista(false);
    onSocioSeleccionado(socio.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusqueda(valor);
    if (socioSeleccionado && valor !== `${socioSeleccionado.apellido}, ${socioSeleccionado.nombre} (Socio #${socioSeleccionado.numero_socio})`) {
      setSocioSeleccionado(null);
      onSocioSeleccionado(0);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Buscar Socio
      </label>
      <input
        type="text"
        value={busqueda}
        onChange={handleInputChange}
        onFocus={() => {
          if (sociosFiltrados.length > 0) {
            setMostrarLista(true);
          }
        }}
        placeholder="Buscar por apellido, nombre, número de socio o DNI..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {loading && (
        <p className="text-sm text-gray-500 mt-2">Cargando socios...</p>
      )}

      {mostrarLista && sociosFiltrados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {sociosFiltrados.map((socio) => (
            <button
              key={socio.id}
              type="button"
              onClick={() => handleSeleccionarSocio(socio)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
            >
              <div className="font-medium text-gray-900">
                {socio.apellido}, {socio.nombre} (Socio #{socio.numero_socio})
              </div>
              {socio.dni && (
                <div className="text-sm text-gray-500">
                  DNI: {socio.dni}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {mostrarLista && busqueda.trim() !== '' && sociosFiltrados.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500">No se encontraron socios</p>
        </div>
      )}

      {socioSeleccionado && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">
            Socio seleccionado: {socioSeleccionado.apellido}, {socioSeleccionado.nombre} (Socio #{socioSeleccionado.numero_socio})
          </p>
        </div>
      )}
    </div>
  );
}




