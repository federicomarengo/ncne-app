import { createClient } from '@/utils/supabase/server';
import { Cupon } from '@/app/types/cupones';
import { notFound } from 'next/navigation';
import EditarCuponClient from './EditarCuponClient';

async function getCupon(id: string): Promise<Cupon | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('cupones')
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

    if (error || !data) {
        return null;
    }

    return data as Cupon;
}

export default async function EditarCuponPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const cupon = await getCupon(id);

    if (!cupon) {
        notFound();
    }

    return <EditarCuponClient cupon={cupon} />;
}

