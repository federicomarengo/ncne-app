import { createClient } from '@/utils/supabase/server';
import { Embarcacion } from '@/app/types/embarcaciones';
import { notFound } from 'next/navigation';
import EditarEmbarcacionClient from './EditarEmbarcacionClient';

async function getEmbarcacion(id: string): Promise<Embarcacion | null> {
    const supabase = await createClient();

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
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data as Embarcacion;
}

export default async function EditarEmbarcacionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const embarcacion = await getEmbarcacion(id);

    if (!embarcacion) {
        notFound();
    }

    return <EditarEmbarcacionClient embarcacion={embarcacion} />;
}




