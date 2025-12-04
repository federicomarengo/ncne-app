import { createClient } from '@/utils/supabase/server';
import { Visita } from '@/app/types/visitas';
import { notFound } from 'next/navigation';
import EditarVisitaClient from './EditarVisitaClient';

async function getVisita(id: string): Promise<Visita | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('visitas')
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

    return data as Visita;
}

export default async function EditarVisitaPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const visita = await getVisita(id);

    if (!visita) {
        notFound();
    }

    return <EditarVisitaClient visita={visita} />;
}




