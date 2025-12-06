/**
 * Tests de seguridad para autenticación
 */

import { requireAuth, getAuthenticatedUser } from '@/app/utils/auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Security: Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('debe retornar error 401 si no hay usuario autenticado', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await requireAuth();

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      if (result.error) {
        const errorResponse = result.error as NextResponse;
        expect(errorResponse.status).toBe(401);
      }
    });

    it('debe retornar el usuario si está autenticado', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await requireAuth();

      expect(result.error).toBeNull();
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('debe retornar null si no hay usuario', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('debe retornar el usuario si está autenticado', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const user = await getAuthenticatedUser();

      expect(user).toEqual(mockUser);
    });
  });
});


