import { createClient } from '@/utils/supabase/server';
import ConciliacionClient from './ConciliacionClient';
import { MovimientoBancario } from '@/app/types/movimientos_bancarios';

async function getMovimientosBancarios(): Promise<MovimientoBancario[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('movimientos_bancarios')
      .select('*')
      .order('fecha_movimiento', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error al cargar movimientos bancarios:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data as MovimientoBancario[];
  } catch (err) {
    console.error('Error inesperado al cargar movimientos bancarios:', err);
    return [];
  }
}

export default async function ConciliacionPage() {
  const movimientos = await getMovimientosBancarios();

  return <ConciliacionClient movimientosIniciales={movimientos} />;
}



