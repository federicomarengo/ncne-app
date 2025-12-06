import { Visita, EstadoVisita } from '@/app/types/visitas';

export function filterVisitas(
  visitas: Visita[],
  searchTerm: string,
  estadoFilter: EstadoVisita | 'Todos',
  mesFilter: string // Formato: 'YYYY-MM' o 'Todos'
): Visita[] {
  let filtered = visitas;

  // Búsqueda por socio (nombre, apellido, DNI, número de socio)
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim();
    filtered = filtered.filter((visita) => {
      if (visita.socio) {
        return (
          visita.socio.apellido?.toLowerCase().includes(searchLower) ||
          visita.socio.nombre?.toLowerCase().includes(searchLower) ||
          visita.socio.numero_socio.toString().includes(searchLower)
        );
      }
      return false;
    });
  }

  // Filtro por estado
  if (estadoFilter !== 'Todos') {
    filtered = filtered.filter((visita) => visita.estado === estadoFilter);
  }

  // Filtro por mes
  if (mesFilter !== 'Todos') {
    filtered = filtered.filter((visita) => {
      const fechaVisita = new Date(visita.fecha_visita);
      const mesVisita = `${fechaVisita.getFullYear()}-${String(fechaVisita.getMonth() + 1).padStart(2, '0')}`;
      return mesVisita === mesFilter;
    });
  }

  return filtered;
}









