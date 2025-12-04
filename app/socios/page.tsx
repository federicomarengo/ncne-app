import { createClient } from '@/utils/supabase/server'
import SociosTable from '../components/SociosTable'
import { Socio } from '../types/socios'

async function getSocios(): Promise<Socio[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .order('numero_socio', { ascending: true })

  if (error) {
    console.error('Error fetching socios:', error)
    return []
  }

  return (data as Socio[]) || []
}

export default async function SociosPage() {
  const socios = await getSocios()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <SociosTable socios={socios} />
      </div>
    </div>
  )
}



