import { createClient } from '@/utils/supabase/server';
import { Visita } from '../types/visitas';
import VisitasTable from '../components/VisitasTable';

async function getVisitas(): Promise<Visita[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('visitas')
    .select(`
      *,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('fecha_visita', { ascending: false });

  if (error) {
    console.error('Error fetching visitas:', error);
    return [];
  }

  return (data as Visita[]) || [];
}

export default async function VisitasPage() {
  const visitas = await getVisitas();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Visitas</h1>
          <p className="text-sm text-gray-600 mt-1">Administra las visitas de socios al club</p>
        </div>
        <VisitasTable visitas={visitas} />
      </div>
    </div>
  );
}



