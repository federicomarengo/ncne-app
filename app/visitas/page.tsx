import { createClient } from '@/utils/supabase/server';
import { Visita } from '../types/visitas';
import VisitasTable from '../components/VisitasTable';
import { Suspense } from 'react';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { logger } from '@/app/utils/logger';

// Revalidar cada 30 segundos
export const revalidate = 30;

async function getVisitas(limit: number = 100, offset: number = 0): Promise<{ data: Visita[]; total: number }> {
  const supabase = await createClient();

  // Obtener total para paginación
  const { count } = await supabase
    .from('visitas')
    .select('*', { count: 'exact', head: true });

  // Obtener datos con límite
  const { data, error } = await supabase
    .from('visitas')
    .select(`
      id,
      socio_id,
      fecha_visita,
      cantidad_visitantes,
      costo_unitario,
      monto_total,
      estado,
      cupon_id,
      fecha_generacion_cupon,
      created_at,
      updated_at,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('fecha_visita', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Error fetching visitas:', error);
    return { data: [], total: 0 };
  }

  // Transformar los datos para que socio sea un objeto único en lugar de array
  const visitasTransformadas: Visita[] = (data || []).map((item: any) => ({
    ...item,
    socio: Array.isArray(item.socio) && item.socio.length > 0 
      ? item.socio[0] 
      : item.socio || undefined,
  }));

  return { data: visitasTransformadas, total: count || 0 };
}

async function VisitasTableWrapper() {
  const { data: visitas } = await getVisitas();

  return <VisitasTable visitas={visitas} />;
}

export default async function VisitasPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Visitas</h1>
          <p className="text-sm text-gray-600 mt-1">Administra las visitas de socios al club</p>
        </div>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <VisitasTableWrapper />
        </Suspense>
      </div>
    </div>
  );
}



