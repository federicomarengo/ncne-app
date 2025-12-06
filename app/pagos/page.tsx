import { createClient } from '@/utils/supabase/server';
import { Pago } from '../types/pagos';
import PagosTable from '../components/PagosTable';
import { Suspense } from 'react';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { logger } from '@/app/utils/logger';

// Revalidar cada 30 segundos
export const revalidate = 30;

async function getPagos(limit: number = 100, offset: number = 0): Promise<{ data: Pago[]; total: number }> {
  const supabase = await createClient();

  // Obtener total para paginación
  const { count } = await supabase
    .from('pagos')
    .select('*', { count: 'exact', head: true });

  // Obtener datos con límite
  const { data, error } = await supabase
    .from('pagos')
    .select(`
      id,
      socio_id,
      fecha_pago,
      monto,
      metodo_pago,
      numero_comprobante,
      referencia_bancaria,
      observaciones,
      estado_conciliacion,
      movimiento_bancario_id,
      created_at,
      updated_at,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      ),
      movimiento_bancario:movimientos_bancarios!fk_pagos_movimiento (
        id,
        referencia_bancaria,
        fecha_movimiento
      )
    `)
    .order('fecha_pago', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Error fetching pagos:', error);
    return { data: [], total: 0 };
  }

  // Transformar los datos para que las relaciones sean objetos únicos en lugar de arrays
  const pagosTransformados: Pago[] = (data || []).map((item: any) => ({
    ...item,
    socio: Array.isArray(item.socio) && item.socio.length > 0 
      ? item.socio[0] 
      : item.socio || undefined,
    movimiento_bancario: Array.isArray(item.movimiento_bancario) && item.movimiento_bancario.length > 0
      ? item.movimiento_bancario[0]
      : item.movimiento_bancario || undefined,
  }));

  return { data: pagosTransformados, total: count || 0 };
}

async function PagosTableWrapper() {
  const { data: pagos } = await getPagos();

  return <PagosTable pagos={pagos} />;
}

export default async function PagosPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los pagos registrados</p>
        </div>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <PagosTableWrapper />
        </Suspense>
      </div>
    </div>
  );
}
