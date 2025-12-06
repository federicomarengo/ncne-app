/**
 * Tests para la ruta de login
 */

import { POST } from '@/app/api/auth/login/route';
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

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar error 400 si faltan email o password', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('requeridos');
  });

  it('debe retornar error 401 si las credenciales son incorrectas', async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid credentials' },
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('incorrectos');
  });

  it('debe retornar 200 y el usuario si las credenciales son correctas', async () => {
    const mockUser = {
      user: { id: '1', email: 'test@test.com' },
      session: { access_token: 'token' },
    };

    const mockSupabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'correct' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@test.com');
  });
});


