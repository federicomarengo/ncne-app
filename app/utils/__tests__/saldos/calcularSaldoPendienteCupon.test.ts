import { calcularSaldoPendienteCupon } from '../../calcularSaldoPendienteCupon';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';

describe('Cálculo de Saldo Pendiente de Cupón', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  test('retorna monto total si no hay pagos aplicados', async () => {
    mockSupabase.setResponse('cupones', {
      data: { monto_total: 50000 },
      error: null,
    });

    mockSupabase.setResponse('pagos_cupones', {
      data: [],
      error: null,
    });

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { monto_total: 50000 },
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => {
            resolve({ data: [], error: null });
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(50000);
  });

  test('resta pago completo del total', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { monto_total: 50000 },
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => {
            resolve({
              data: [{ monto_aplicado: 50000 }],
              error: null,
            });
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(0);
  });

  test('resta pagos parciales del total', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { monto_total: 50000 },
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => {
            resolve({
              data: [
                { monto_aplicado: 10000 },
                { monto_aplicado: 15000 },
                { monto_aplicado: 5000 },
              ],
              error: null,
            });
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(20000); // 50000 - 30000
  });

  test('nunca retorna saldo negativo', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { monto_total: 50000 },
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => {
            resolve({
              data: [{ monto_aplicado: 60000 }], // Más que el total (caso borde)
              error: null,
            });
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(0); // Math.max(0, -10000) = 0
  });

  test('maneja errores gracefully retornando 0', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Error de DB' },
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(0);
  });

  test('maneja cupón no encontrado retornando 0', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(999, mockSupabase);
    expect(saldo).toBe(0);
  });

  test('considera pago desde saldo a favor', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { monto_total: 50000 },
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => {
            resolve({
              data: [
                { monto_aplicado: 20000 }, // Pago normal
                { monto_aplicado: 15000 }, // Pago desde saldo a favor
              ],
              error: null,
            });
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoPendienteCupon(1, mockSupabase);
    expect(saldo).toBe(15000); // 50000 - 35000
  });
});


