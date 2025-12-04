import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function getPortalSession(request: NextRequest) {
  const sessionToken = request.cookies.get('portal_session')?.value;
  const socioId = request.cookies.get('portal_socio_id')?.value;

  if (!sessionToken || !socioId) {
    return null;
  }

  // Verificar que la cookie no haya expirado (las cookies httpOnly se manejan automáticamente)
  // Aquí podríamos agregar validación adicional contra una tabla de sesiones si fuera necesario

  return {
    sessionToken,
    socioId: parseInt(socioId),
  };
}

export async function getPortalSocioId(): Promise<number | null> {
  const cookieStore = await cookies();
  const socioId = cookieStore.get('portal_socio_id')?.value;
  
  if (!socioId) {
    return null;
  }

  return parseInt(socioId);
}

