import { createClient } from '@/utils/supabase/server';
import { Pago } from '@/app/types/pagos';
import { notFound } from 'next/navigation';
import EditarPagoClient from './EditarPagoClient';

async function getPago(id: number): Promise<Pago | null> {
  const supabase = await createClient();

  // Cargar el pago con todas sus relaciones
  const { data: pago, error } = await supabase
    .from('pagos')
    .select(`
      *,
      socio:socios (
        id,
        numero_socio,
        apellido,
        nombre,
        dni,
        cuit_cuil,
        email,
        telefono
      ),
      movimiento_bancario:movimientos_bancarios!fk_pagos_movimiento (
        id,
        fecha_movimiento,
        referencia_bancaria,
        concepto_completo,
        monto,
        apellido_transferente,
        nombre_transferente,
        cuit_cuil,
        dni,
        estado
      )
    `)
    .eq('id', id)
    .single();

  if (error || !pago) {
    return null;
  }

  // Cargar cupones asociados
  const { data: cuponesAsociados } = await supabase
    .from('pagos_cupones')
    .select(`
      *,
      cupon:cupones (
        id,
        numero_cupon,
        monto_total,
        estado,
        fecha_vencimiento,
        fecha_pago,
        concepto
      )
    `)
    .eq('pago_id', id);

  return {
    ...pago,
    cupones: cuponesAsociados || [],
  } as Pago;
}

export default async function EditarPagoPage({
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

  return <EditarPagoClient pago={pago} />;
}

