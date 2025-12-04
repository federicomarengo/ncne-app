import { Pago, MetodoPago, EstadoConciliacion } from '@/app/types/pagos';

export function filterPagos(
  pagos: Pago[],
  searchTerm: string,
  metodoFilter: MetodoPago | 'Todos',
  conciliacionFilter: EstadoConciliacion | 'Todos',
  fechaDesde?: string,
  fechaHasta?: string
): Pago[] {
  let filtered = [...pagos];

  // Búsqueda por socio (nombre, apellido, número), número de comprobante, referencia bancaria
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (pago) =>
        pago.socio?.apellido.toLowerCase().includes(search) ||
        pago.socio?.nombre.toLowerCase().includes(search) ||
        (pago.socio?.numero_socio?.toString().includes(search) || false) ||
        (pago.numero_comprobante?.toLowerCase().includes(search) || false) ||
        (pago.referencia_bancaria?.toLowerCase().includes(search) || false)
    );
  }

  // Filtro por método de pago
  if (metodoFilter !== 'Todos') {
    filtered = filtered.filter((pago) => pago.metodo_pago === metodoFilter);
  }

  // Filtro por estado de conciliación
  if (conciliacionFilter !== 'Todos') {
    filtered = filtered.filter((pago) => pago.estado_conciliacion === conciliacionFilter);
  }

  // Filtro por rango de fechas (fecha de pago)
  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    filtered = filtered.filter((pago) => {
      const fechaPago = new Date(pago.fecha_pago);
      return fechaPago >= desde;
    });
  }

  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999); // Incluir todo el día
    filtered = filtered.filter((pago) => {
      const fechaPago = new Date(pago.fecha_pago);
      return fechaPago <= hasta;
    });
  }

  return filtered;
}







