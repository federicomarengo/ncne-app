import { createClient } from '@/utils/supabase/server';
import { Pago } from '../types/pagos';
import PagosTable from '../components/PagosTable';

async function getPagos(): Promise<Pago[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pagos')
    .select(`
      *,
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
    .order('fecha_pago', { ascending: false });

  if (error) {
    console.error('Error fetching pagos:', error);
    return [];
  }

  return (data as Pago[]) || [];
}

export default async function PagosPage() {
  const pagos = await getPagos();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los pagos registrados</p>
        </div>
        <PagosTable pagos={pagos} />
      </div>
    </div>
  );
}
