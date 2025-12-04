import { createClient } from '@/utils/supabase/server'
import EmbarcacionesTable from '../components/EmbarcacionesTable'
import { Embarcacion } from '../types/embarcaciones'

async function getEmbarcaciones(): Promise<Embarcacion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('embarcaciones')
    .select(`
      *,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error fetching embarcaciones:', error)
    return []
  }

  return (data as Embarcacion[]) || []
}

export default async function EmbarcacionesPage() {
  const embarcaciones = await getEmbarcaciones()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <EmbarcacionesTable embarcaciones={embarcaciones} />
      </div>
    </div>
  )
}



