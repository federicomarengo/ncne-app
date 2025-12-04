import { createClient } from '@/utils/supabase/server'
import SociosTable from '../components/SociosTable'
import { Socio } from '../types/socios'
import { Suspense } from 'react'
import { TableSkeleton } from '../components/ui/SkeletonLoader'

// Revalidar cada 30 segundos
export const revalidate = 30;

async function getSocios(limit: number = 100, offset: number = 0): Promise<{ data: Socio[]; total: number }> {
  const supabase = await createClient()

  // Obtener total para paginación
  const { count } = await supabase
    .from('socios')
    .select('*', { count: 'exact', head: true })

  // Obtener datos con límite
  const { data, error } = await supabase
    .from('socios')
    .select('id, numero_socio, nombre, apellido, dni, email, telefono, fecha_ingreso, estado')
    .order('numero_socio', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching socios:', error)
    return { data: [], total: 0 }
  }

  return { data: (data as Socio[]) || [], total: count || 0 }
}

async function SociosTableWrapper() {
  const { data: socios } = await getSocios()

  return <SociosTable socios={socios} />
}

export default async function SociosPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <SociosTableWrapper />
        </Suspense>
      </div>
    </div>
  )
}



