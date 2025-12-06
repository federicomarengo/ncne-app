/**
 * Tests para la ruta de cupones del portal
 */

import { GET } from '@/app/api/portal/cupones/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPortalSocioId } from '@/utils/portal/session';

// Mock de Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock de getPortalSocioId
jest.mock('@/utils/portal/session', () => ({
  getPortalSocioId: jest.fn(),
}));

describe('GET /api/portal/cupones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 401 si no hay socio autenticado', async () => {
    (getPortalSocioId as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/portal/cupones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('autorizado');
  });

  it('debe retornar los cupones del socio autenticado', async () => {
    const socioId = 1;
    const mockCupones = [
      {
        id: 1,
        numero_cupon: '2025-01-0001',
        periodo_mes: 1,
        periodo_anio: 2025,
        monto_total: 1000,
        estado: 'pendiente',
      },
      {
        id: 2,
        numero_cupon: '2025-02-0001',
        periodo_mes: 2,
        periodo_anio: 2025,
        monto_total: 1000,
        estado: 'pagado',
      },
    ];

    (getPortalSocioId as jest.Mock).mockResolvedValue(socioId);

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockCupones,
        error: null,
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/portal/cupones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cupones).toEqual(mockCupones);
    expect(mockSupabase.eq).toHaveBeenCalledWith('socio_id', socioId);
  });

  it('debe retornar array vacío si el socio no tiene cupones', async () => {
    const socioId = 1;

    (getPortalSocioId as jest.Mock).mockResolvedValue(socioId);

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/portal/cupones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cupones).toEqual([]);
  });

  it('debe retornar error 500 si hay error en la base de datos', async () => {
    const socioId = 1;

    (getPortalSocioId as jest.Mock).mockResolvedValue(socioId);

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/portal/cupones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Error');
  });
});

