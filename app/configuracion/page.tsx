import { obtenerConfiguracion } from '@/app/utils/configuracion';
import ConfiguracionClient from './ConfiguracionClient';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function ConfiguracionPage() {
  let configuracion;

  try {
    const supabase = await createClient();
    configuracion = await obtenerConfiguracion(supabase);
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    notFound();
  }

  return <ConfiguracionClient configuracionInicial={configuracion} />;
}

