/**
 * Tests para la ruta de cupones individuales
 */

import { GET, PUT, DELETE } from '@/app/api/cupones/[id]/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mock de Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock de requireAuth
jest.mock('@/app/utils/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ error: null, user: { id: '1', email: 'admin@test.com' } }),
}));

// Mock de validations
jest.mock('@/app/utils/validations', () => ({
  cuponUpdateSchema: {},
  validateAndParse: jest.fn().mockReturnValue({ success: true, data: {} }),
}));

describe('GET /api/cupones/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/cupones/invalid');
    const params = Promise.resolve({ id: 'invalid' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('inválido');
  });

  it('debe retornar error 404 si el cupón no existe', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/cupones/999');
    const params = Promise.resolve({ id: '999' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrado');
  });

  it('debe retornar el cupón si existe', async () => {
    const mockCupon = {
      id: 1,
      numero_cupon: '2025-01-0001',
      socio_id: 1,
      monto_total: 1000,
    };

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockCupon,
        error: null,
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/cupones/1');
    const params = Promise.resolve({ id: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cupon).toEqual(mockCupon);
  });
});

describe('PUT /api/cupones/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/cupones/invalid', {
      method: 'PUT',
      body: JSON.stringify({ monto_total: 1000 }),
    });
    const params = Promise.resolve({ id: 'invalid' });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('inválido');
  });

  it('debe retornar error 400 si la validación falla', async () => {
    const validations = await import('@/app/utils/validations');
    jest.spyOn(validations, 'validateAndParse').mockReturnValue({
      success: false,
      error: 'Datos inválidos',
    });

    const request = new NextRequest('http://localhost/api/cupones/1', {
      method: 'PUT',
      body: JSON.stringify({ monto_total: -100 }),
    });
    const params = Promise.resolve({ id: '1' });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});

describe('DELETE /api/cupones/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/cupones/invalid', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'invalid' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('inválido');
  });

  it('debe retornar error 404 si el cupón no existe', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/cupones/999', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: '999' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrado');
  });
});

