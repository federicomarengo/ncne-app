import { createClient } from '@/utils/supabase/server';
import { Cupon } from '../types/cupones';
import CuponesTable from '../components/CuponesTable';
import { Suspense } from 'react';
import { TableSkeleton } from '../components/ui/SkeletonLoader';

// Revalidar cada 30 segundos
export const revalidate = 30;

async function getCupones(limit: number = 100, offset: number = 0): Promise<{ data: Cupon[]; total: number }> {
  const supabase = await createClient();

  // Obtener total para paginación
  const { count } = await supabase
    .from('cupones')
    .select('*', { count: 'exact', head: true });

  // Obtener datos con límite
  const { data, error } = await supabase
    .from('cupones')
    .select(`
      id,
      numero_cupon,
      socio_id,
      periodo_mes,
      periodo_anio,
      fecha_emision,
      fecha_vencimiento,
      monto_cuota_social,
      monto_amarra,
      monto_visitas,
      monto_otros_cargos,
      monto_intereses,
      monto_total,
      estado,
      fecha_pago,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('fecha_emision', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching cupones:', error);
    return { data: [], total: 0 };
  }

  // Transformar los datos para que socio sea un objeto único en lugar de array
  const cuponesTransformados: Cupon[] = (data || []).map((item: any) => ({
    ...item,
    socio: Array.isArray(item.socio) && item.socio.length > 0 
      ? item.socio[0] 
      : item.socio || undefined,
  }));

  return { data: cuponesTransformados, total: count || 0 };
}

async function CuponesTableWrapper() {
  const { data: cupones } = await getCupones();

  return <CuponesTable cupones={cupones} />;
}

export default async function CuponesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cupones</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los cupones mensuales generados</p>
        </div>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <CuponesTableWrapper />
        </Suspense>
      </div>
    </div>
  );
}







