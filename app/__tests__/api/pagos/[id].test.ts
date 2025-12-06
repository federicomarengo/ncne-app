/**
 * Tests para la ruta de pagos individuales
 */

import { GET, PUT, DELETE } from '@/app/api/pagos/[id]/route';
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
  pagoUpdateSchema: {},
  validateAndParse: jest.fn().mockReturnValue({ success: true, data: {} }),
}));

describe('GET /api/pagos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/pagos/invalid');
    const params = Promise.resolve({ id: 'invalid' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('inválido');
  });

  it('debe retornar error 404 si el pago no existe', async () => {
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

    const request = new NextRequest('http://localhost/api/pagos/999');
    const params = Promise.resolve({ id: '999' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrado');
  });

  it('debe retornar el pago si existe', async () => {
    const mockPago = {
      id: 1,
      socio_id: 1,
      monto: 1000,
      metodo_pago: 'transferencia',
      fecha_pago: '2025-01-15',
    };

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockPago,
        error: null,
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/pagos/1');
    const params = Promise.resolve({ id: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pago).toBeDefined();
  });
});

describe('PUT /api/pagos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/pagos/invalid', {
      method: 'PUT',
      body: JSON.stringify({ monto: 1000 }),
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

    const request = new NextRequest('http://localhost/api/pagos/1', {
      method: 'PUT',
      body: JSON.stringify({ monto: -100 }),
    });
    const params = Promise.resolve({ id: '1' });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});

describe('DELETE /api/pagos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si el ID es inválido', async () => {
    const request = new NextRequest('http://localhost/api/pagos/invalid', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'invalid' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('inválido');
  });
});

