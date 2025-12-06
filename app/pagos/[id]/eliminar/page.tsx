import { createClient } from '@/utils/supabase/server';
import { Pago } from '@/app/types/pagos';
import { notFound } from 'next/navigation';
import EliminarPagoClient from './EliminarPagoClient';

async function getPago(id: number): Promise<Pago | null> {
  const supabase = await createClient();

  const { data: pago, error } = await supabase
    .from('pagos')
    .select(`
      *,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre
      )
    `)
    .eq('id', id)
    .single();

  if (error || !pago) {
    return null;
  }

  return pago as Pago;
}

export default async function EliminarPagoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pagoId = parseInt(id);

  if (isNaN(pagoId)) {
    notFound();
  }

  const pago = await getPago(pagoId);

  if (!pago) {
    notFound();
  }

  return <EliminarPagoClient pago={pago} />;
}





