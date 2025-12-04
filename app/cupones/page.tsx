import { createClient } from '@/utils/supabase/server';
import { Cupon } from '../types/cupones';
import CuponesTable from '../components/CuponesTable';

async function getCupones(): Promise<Cupon[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cupones')
    .select(`
      *,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('fecha_emision', { ascending: false });

  if (error) {
    console.error('Error fetching cupones:', error);
    return [];
  }

  return (data as Cupon[]) || [];
}

export default async function CuponesPage() {
  const cupones = await getCupones();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cupones</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los cupones mensuales generados</p>
        </div>
        <CuponesTable cupones={cupones} />
      </div>
    </div>
  );
}







