import { Socio, EstadoSocio } from '@/app/types/socios';

export function filterSocios(
  socios: Socio[],
  searchTerm: string,
  estadoFilter: EstadoSocio | 'Todos'
): Socio[] {
  let filtered = [...socios];

  // Búsqueda por nombre, apellido o DNI (según especificación: "Por nombre o apellido")
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (socio) =>
        socio.apellido.toLowerCase().includes(search) ||
        socio.nombre.toLowerCase().includes(search) ||
        socio.dni.toLowerCase().includes(search) ||
        (socio.numero_socio?.toString().includes(search) || false)
    );
  }

  // Filtro por estado
  if (estadoFilter !== 'Todos') {
    filtered = filtered.filter((socio) => socio.estado === estadoFilter);
  }

  return filtered;
}

