import { createClient } from '@/utils/supabase/server'
import DashboardStats from './components/DashboardStats'
import { Suspense } from 'react'
import { StatCardSkeleton } from './components/ui/SkeletonLoader'

async function getDashboardStats() {
  const supabase = await createClient()

  // Calcular fechas una sola vez
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Ejecutar todas las queries en paralelo para mejor performance
  const [
    { count: sociosActivosCount },
    { count: sociosActivosMesAnteriorCount },
    { data: pagosMes },
    { data: pagosMesAnterior },
    { count: embarcacionesCount },
    { count: embarcacionesMesAnterior },
    { count: cuponesPendientes },
    { data: cuponesPendientesYVencidos },
    { count: visitasMes },
  ] = await Promise.all([
    supabase
      .from('socios')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo'),
    supabase
      .from('socios')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .lte('fecha_ingreso', lastDayLastMonth.toISOString().split('T')[0]),
    supabase
      .from('pagos')
      .select('monto')
      .gte('fecha_pago', firstDayThisMonth.toISOString().split('T')[0])
      .lte('fecha_pago', lastDayThisMonth.toISOString().split('T')[0]),
    supabase
      .from('pagos')
      .select('monto')
      .gte('fecha_pago', firstDayLastMonth.toISOString().split('T')[0])
      .lte('fecha_pago', lastDayLastMonth.toISOString().split('T')[0]),
    supabase
      .from('embarcaciones')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('embarcaciones')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', firstDayThisMonth.toISOString()),
    supabase
      .from('cupones')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),
    supabase
      .from('cupones')
      .select('monto_total')
      .in('estado', ['pendiente', 'vencido']),
    supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_visita', firstDayThisMonth.toISOString().split('T')[0])
      .lte('fecha_visita', lastDayThisMonth.toISOString().split('T')[0]),
  ])

  const sociosActivos = sociosActivosCount || 0
  const sociosActivosMesAnterior = sociosActivosMesAnteriorCount || 0
  const sociosActivosCambio =
    sociosActivosMesAnterior > 0
      ? Math.round(((sociosActivos - sociosActivosMesAnterior) / sociosActivosMesAnterior) * 100)
      : sociosActivos > 0 ? 100 : 0

  const ingresosMes = pagosMes?.reduce((sum, p) => sum + (parseFloat(p.monto.toString()) || 0), 0) || 0
  const ingresosMesAnterior = pagosMesAnterior?.reduce((sum, p) => sum + (parseFloat(p.monto.toString()) || 0), 0) || 0
  const ingresosCambio = ingresosMesAnterior > 0
    ? Math.round(((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100)
    : ingresosMes > 0 ? 100 : 0

  const embarcaciones = embarcacionesCount || 0
  const embarcacionesNuevas = Math.max(0, embarcaciones - (embarcacionesMesAnterior || 0))

  const deudaTotal = cuponesPendientesYVencidos?.reduce((sum, c) => sum + (parseFloat(c.monto_total.toString()) || 0), 0) || 0

  return {
    sociosActivos,
    sociosActivosCambio,
    ingresosMes,
    ingresosCambio,
    embarcaciones,
    embarcacionesNuevas,
    cuponesPendientes: cuponesPendientes || 0,
    deudaTotal,
    visitasMes: visitasMes || 0,
  }
}

async function DashboardStatsWrapper() {
  const stats = await getDashboardStats()

  return (
    <DashboardStats
      sociosActivos={stats.sociosActivos}
      sociosActivosCambio={stats.sociosActivosCambio}
      ingresosMes={stats.ingresosMes}
      ingresosCambio={stats.ingresosCambio}
      embarcaciones={stats.embarcaciones}
      embarcacionesNuevas={stats.embarcacionesNuevas}
      cuponesPendientes={stats.cuponesPendientes}
      deudaTotal={stats.deudaTotal}
      visitasMes={stats.visitasMes}
    />
  )
}

// Revalidar cada 60 segundos para datos relativamente frescos
export const revalidate = 60;

export default async function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Resumen ejecutivo del Club Náutico Embalse</p>
        </div>

        {/* Estadísticas */}
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        }>
          <DashboardStatsWrapper />
        </Suspense>

        {/* Accesos Rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <a
            href="/socios/nuevo"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Nuevo Socio</p>
          </a>
          <a
            href="/embarcaciones/nueva"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Nueva Embarcación</p>
          </a>
          <a
            href="/visitas/cargar"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Cargar Visita</p>
          </a>
          <a
            href="/cupones/generar"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Generar Cupones</p>
          </a>
          <a
            href="/pagos/registrar"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Registrar Pago</p>
          </a>
        </div>
      </div>
    </div>
  )
}
