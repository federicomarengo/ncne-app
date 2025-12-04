import { createClient } from '@/utils/supabase/server'
import EmbarcacionesTable from '../components/EmbarcacionesTable'
import { Embarcacion } from '../types/embarcaciones'
import { Suspense } from 'react'
import { TableSkeleton } from '../components/ui/SkeletonLoader'

// Revalidar cada 30 segundos
export const revalidate = 30;

async function getEmbarcaciones(limit: number = 100, offset: number = 0): Promise<{ data: Embarcacion[]; total: number }> {
  const supabase = await createClient()

  // Obtener total para paginación
  const { count } = await supabase
    .from('embarcaciones')
    .select('*', { count: 'exact', head: true })

  // Obtener datos con límite
  const { data, error } = await supabase
    .from('embarcaciones')
    .select(`
      id,
      socio_id,
      nombre,
      tipo,
      eslora_pies,
      matricula,
      created_at,
      updated_at,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('nombre', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching embarcaciones:', error)
    return { data: [], total: 0 }
  }

  // Transformar los datos para que socio sea un objeto único en lugar de array
  const embarcacionesTransformadas: Embarcacion[] = (data || []).map((item: any) => ({
    ...item,
    socio: Array.isArray(item.socio) && item.socio.length > 0 
      ? item.socio[0] 
      : item.socio || undefined,
  }))

  return { data: embarcacionesTransformadas, total: count || 0 }
}

async function EmbarcacionesTableWrapper() {
  const { data: embarcaciones } = await getEmbarcaciones()

  return <EmbarcacionesTable embarcaciones={embarcaciones} />
}

export default async function EmbarcacionesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <EmbarcacionesTableWrapper />
        </Suspense>
      </div>
    </div>
  )
}



