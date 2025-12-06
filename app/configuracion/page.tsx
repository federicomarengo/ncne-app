import { obtenerConfiguracion } from '@/app/utils/configuracion';
import ConfiguracionClient from './ConfiguracionClient';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/app/utils/logger';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  let configuracion;

  try {
    const supabase = await createClient();
    configuracion = await obtenerConfiguracion(supabase);
  } catch (error) {
    logger.error('Error al cargar configuración:', error);
    notFound();
  }

  return <ConfiguracionClient configuracionInicial={configuracion} />;
}

