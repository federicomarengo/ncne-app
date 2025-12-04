import { Cupon, EstadoCupon } from '@/app/types/cupones';

export function filterCupones(
  cupones: Cupon[],
  searchTerm: string,
  estadoFilter: EstadoCupon | 'Todos',
  fechaDesde?: string,
  fechaHasta?: string
): Cupon[] {
  let filtered = [...cupones];

  // Búsqueda por número de cupón, socio (nombre, apellido, número)
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (cupon) =>
        cupon.numero_cupon.toLowerCase().includes(search) ||
        cupon.socio?.apellido.toLowerCase().includes(search) ||
        cupon.socio?.nombre.toLowerCase().includes(search) ||
        (cupon.socio?.numero_socio?.toString().includes(search) || false)
    );
  }

  // Filtro por estado
  if (estadoFilter !== 'Todos') {
    filtered = filtered.filter((cupon) => cupon.estado === estadoFilter);
  }

  // Filtro por rango de fechas (fecha de vencimiento)
  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    filtered = filtered.filter((cupon) => {
      const fechaVenc = new Date(cupon.fecha_vencimiento);
      return fechaVenc >= desde;
    });
  }

  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999); // Incluir todo el día
    filtered = filtered.filter((cupon) => {
      const fechaVenc = new Date(cupon.fecha_vencimiento);
      return fechaVenc <= hasta;
    });
  }

  return filtered;
}







