import { createClient } from '@/utils/supabase/server';
import { Socio } from '@/app/types/socios';
import { notFound } from 'next/navigation';
import CargarVisitaClient from './CargarVisitaClient';

async function getSocio(id: string): Promise<Socio | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data as Socio;
}

export default async function CargarVisitaPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const socio = await getSocio(id);

    if (!socio) {
        notFound();
    }

    return <CargarVisitaClient socio={socio} />;
}
