import { VistaPreviaCupon } from '@/app/types/cupones';

export function filterVistaPreviaCupones(
  cupones: VistaPreviaCupon[],
  keyword: string
): VistaPreviaCupon[] {
  if (!keyword.trim()) {
    return cupones;
  }

  const searchTerm = keyword.toLowerCase().trim();

  return cupones.filter((cupon) => {
    const nombreCompleto = `${cupon.socio.nombre} ${cupon.socio.apellido}`.toLowerCase();
    const apellido = cupon.socio.apellido.toLowerCase();
    const nombre = cupon.socio.nombre.toLowerCase();
    const numeroSocio = cupon.socio.numero_socio.toString();
    const dni = cupon.socio.dni?.toLowerCase() || '';

    return (
      nombreCompleto.includes(searchTerm) ||
      apellido.includes(searchTerm) ||
      nombre.includes(searchTerm) ||
      numeroSocio.includes(searchTerm) ||
      dni.includes(searchTerm)
    );
  });
}







