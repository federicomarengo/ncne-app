import { aplicarSaldoAFavorACupon } from '../../aplicarSaldoAFavorACupon';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';
import { obtenerSaldoAFavor } from '../../manejarSaldoAFavor';
import { calcularSaldoPendienteCupon } from '../../calcularSaldoPendienteCupon';

jest.mock('../../manejarSaldoAFavor');
jest.mock('../../calcularSaldoPendienteCupon');

describe('Aplicación de Saldo a Favor a Cupón', () => {
  let mockSupabase: any;
  const mockObtenerSaldoAFavor = obtenerSaldoAFavor as jest.MockedFunction<typeof obtenerSaldoAFavor>;
  const mockCalcularSaldoPendiente = calcularSaldoPendienteCupon as jest.MockedFunction<typeof calcularSaldoPendienteCupon>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('Aplicar saldo a favor completo a cupón nuevo', () => {
    test('aplica saldo a favor completo y marca cupón como pagado', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(50000);
      mockCalcularSaldoPendiente.mockResolvedValue(30000);

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'pagos') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 100, socio_id: 10, monto: 30000 },
              error: null,
            }),
          };
        }
        if (table === 'pagos_cupones') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'cupones') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'saldos_favor') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 1, monto: 50000 },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
          };
        }
        return mockSupabase.from(table);
      });

      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(30000);
      expect(resultado.cuponQuedoPagado).toBe(true);
      expect(resultado.saldoRestante).toBe(20000); // 50K - 30K
    });
  });

  describe('Aplicar saldo a favor parcial', () => {
    test('saldo a favor menor que cupón → Cupón queda parcialmente pagado, saldo a favor = 0', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(20000);
      mockCalcularSaldoPendiente.mockResolvedValue(50000);

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'pagos') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 100, socio_id: 10, monto: 20000 },
              error: null,
            }),
          };
        }
        if (table === 'pagos_cupones') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'saldos_favor') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 1, monto: 20000 },
              error: null,
            }),
            delete: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(20000);
      expect(resultado.cuponQuedoPagado).toBe(false); // Cupón queda con $30K pendiente
      expect(resultado.saldoRestante).toBe(0); // Saldo a favor se agotó
    });

    test('saldo a favor mayor que cupón → Cupón queda pagado, saldo restante se mantiene', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(100000);
      mockCalcularSaldoPendiente.mockResolvedValue(50000);

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'pagos') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 100, socio_id: 10, monto: 50000 },
              error: null,
            }),
          };
        }
        if (table === 'pagos_cupones') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'cupones') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'saldos_favor') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 1, monto: 100000 },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          };
        }
        return mockSupabase.from(table);
      });

      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(50000);
      expect(resultado.cuponQuedoPagado).toBe(true);
      expect(resultado.saldoRestante).toBe(50000); // 100K - 50K
    });
  });

  describe('Casos especiales', () => {
    test('sin saldo a favor → No aplica nada, retorna 0', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(0);
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(0);
      expect(resultado.saldoRestante).toBe(0);
      expect(resultado.cuponQuedoPagado).toBe(false);
    });

    test('cupón ya pagado → No aplica saldo a favor', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(50000);
      mockCalcularSaldoPendiente.mockResolvedValue(0); // Cupón ya pagado
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(0);
      expect(resultado.cuponQuedoPagado).toBe(true);
      expect(resultado.saldoRestante).toBe(50000); // No se tocó
    });

    test('verificar que se crea "pago virtual" desde saldo a favor', async () => {
      mockObtenerSaldoAFavor.mockResolvedValue(50000);
      mockCalcularSaldoPendiente.mockResolvedValue(30000);

      const insertPagoMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { id: 100, socio_id: 10, monto: 30000 },
        error: null,
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'pagos') {
          return {
            insert: insertPagoMock,
            select: jest.fn().mockReturnThis(),
            single: singleMock,
          };
        }
        if (table === 'pagos_cupones') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'cupones') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'saldos_favor') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 1, monto: 50000 },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          };
        }
        return mockSupabase.from(table);
      });

      await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      // Verificar que se creó un pago con método 'saldo_a_favor'
      expect(insertPagoMock).toHaveBeenCalled();
      const callArgs = insertPagoMock.mock.calls[0][0];
      expect(callArgs.metodo_pago).toBe('saldo_a_favor');
      expect(callArgs.monto).toBe(30000);
    });
  });
});

