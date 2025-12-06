import { calcularSaldoHistorico } from '../../calcularSaldoHistorico';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';

describe('Cálculo de Saldo Histórico', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  test('calcula saldo acumulado del socio correctamente', async () => {
    const pagos = [
      { id: 1, monto: 50000 },
      { id: 2, monto: 30000 },
      { id: 3, monto: 20000 },
    ];

    const pagosCupones = [
      { monto_aplicado: 50000 },
      { monto_aplicado: 25000 },
      { monto_aplicado: 15000 },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({
            data: pagos,
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: pagosCupones,
            error: null,
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoHistorico(10, undefined, mockSupabase);
    
    // Total pagado: 100000, Total aplicado: 90000
    // Saldo: 100000 - 90000 = 10000
    expect(saldo).toBe(10000);
  });

  test('considera fecha límite', async () => {
    const fechaLimite = '2025-11-30';
    
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({
            data: [{ id: 1, monto: 50000 }],
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ monto_aplicado: 50000 }],
            error: null,
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoHistorico(10, fechaLimite, mockSupabase);
    
    expect(saldo).toBe(0); // 50000 - 50000
  });

  test('retorna 0 si no hay pagos', async () => {
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoHistorico(10, undefined, mockSupabase);
    expect(saldo).toBe(0);
  });

  test('maneja saldo negativo (deuda) correctamente', async () => {
    const pagos = [{ id: 1, monto: 30000 }];
    const pagosCupones = [{ monto_aplicado: 50000 }]; // Más aplicado que pagado

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({
            data: pagos,
            error: null,
          }),
        };
      }
      if (table === 'pagos_cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: pagosCupones,
            error: null,
          }),
        };
      }
      return mockSupabase.from(table);
    });

    const saldo = await calcularSaldoHistorico(10, undefined, mockSupabase);
    
    // Saldo negativo indica deuda
    expect(saldo).toBe(-20000); // 30000 - 50000
  });

  test('retorna 0 si no hay supabase', async () => {
    const saldo = await calcularSaldoHistorico(10, undefined, undefined);
    expect(saldo).toBe(0);
  });
});


