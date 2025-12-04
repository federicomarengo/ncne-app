import { Embarcacion } from '@/app/types/embarcaciones';
import { getNombreCompleto } from '@/app/types/socios';

export function filterEmbarcaciones(
  embarcaciones: Embarcacion[],
  searchTerm: string,
  tipoFilter: string,
  socioFilter: string
): Embarcacion[] {
  let filtered = embarcaciones;

  // Filtro por búsqueda (matrícula, nombre, socio)
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (emb) =>
        emb.matricula?.toLowerCase().includes(searchLower) ||
        emb.nombre.toLowerCase().includes(searchLower) ||
        (emb.socio && (
          emb.socio.apellido?.toLowerCase().includes(searchLower) ||
          emb.socio.nombre?.toLowerCase().includes(searchLower) ||
          emb.socio.numero_socio.toString().includes(searchLower)
        ))
    );
  }

  // Filtro por tipo
  if (tipoFilter && tipoFilter !== 'Todos') {
    filtered = filtered.filter((emb) => emb.tipo === tipoFilter);
  }

  // Filtro por socio
  if (socioFilter && socioFilter !== 'Todos') {
    filtered = filtered.filter((emb) => emb.socio_id.toString() === socioFilter);
  }

  return filtered;
}

