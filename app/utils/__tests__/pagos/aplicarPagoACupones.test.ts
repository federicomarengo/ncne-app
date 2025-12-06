import { aplicarPagoACupones } from '../../aplicarPagoACupones';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';
import { calcularSaldoPendienteCupon } from '../../calcularSaldoPendienteCupon';
import { manejarSaldoAFavor } from '../../manejarSaldoAFavor';

// Mock de las dependencias
jest.mock('../../calcularSaldoPendienteCupon');
jest.mock('../../manejarSaldoAFavor');

describe('Aplicación de Pagos a Cupones', () => {
  let mockSupabase: any;
  const mockCalcularSaldoPendiente = calcularSaldoPendienteCupon as jest.MockedFunction<typeof calcularSaldoPendienteCupon>;
  const mockManejarSaldoAFavor = manejarSaldoAFavor as jest.MockedFunction<typeof manejarSaldoAFavor>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('Pago completo a un cupón', () => {
    test('aplica pago completo y marca cupón como pagado', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 }
      ];
      
      // Configurar respuesta para cupones
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      // Configurar respuesta para pagos_cupones (insert)
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(50000);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, // pagoId
        10, // socioId
        50000, // montoPago
        '2025-12-05', // fechaPago
        mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesAplicados[0]).toBe(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados[0]).toBe(1);
      expect(resultado.excedente).toBe(0);
      expect(mockCalcularSaldoPendiente).toHaveBeenCalledWith(1, mockSupabase);
    });

    test('aplica pago mayor al cupón y genera saldo a favor', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 30000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(30000);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 50000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(20000); // 50000 - 30000
      expect(mockManejarSaldoAFavor).toHaveBeenCalledWith(10, 20000, mockSupabase);
    });
  });

  describe('Distribución proporcional entre múltiples cupones', () => {
    test('distribuye pago en orden cronológico (más antiguos primero)', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 30000, fecha_vencimiento: '2025-10-15', estado: 'pendiente', socio_id: 10 }, // Más antiguo
        { id: 2, monto_total: 40000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
        { id: 3, monto_total: 25000, fecha_vencimiento: '2025-12-15', estado: 'pendiente', socio_id: 10 }, // Más reciente
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente
        .mockResolvedValueOnce(30000) // Cupón 1
        .mockResolvedValueOnce(40000); // Cupón 2
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 70000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(2);
      expect(resultado.cuponesAplicados[0]).toBe(1); // Primero el más antiguo
      expect(resultado.cuponesAplicados[1]).toBe(2);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(2);
      expect(resultado.excedente).toBe(0); // 70000 = 30000 + 40000
    });

    test('distribuye pago completo entre 3 cupones', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 20000, fecha_vencimiento: '2025-10-15', estado: 'pendiente', socio_id: 10 },
        { id: 2, monto_total: 30000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
        { id: 3, monto_total: 25000, fecha_vencimiento: '2025-12-15', estado: 'pendiente', socio_id: 10 },
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente
        .mockResolvedValueOnce(20000)
        .mockResolvedValueOnce(30000)
        .mockResolvedValueOnce(25000);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 75000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(3);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(3);
      expect(resultado.excedente).toBe(0);
    });

    test('aplica pago parcial a múltiples cupones con excedente', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 30000, fecha_vencimiento: '2025-10-15', estado: 'pendiente', socio_id: 10 },
        { id: 2, monto_total: 40000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente
        .mockResolvedValueOnce(30000)
        .mockResolvedValueOnce(40000);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 50000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(2);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1); // Solo el primero
      expect(resultado.excedente).toBe(0); // 50000 = 30000 + 20000
    });
  });

  describe('Pagos parciales', () => {
    test('aplica pago parcial y NO marca cupón como pagado', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(50000);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 20000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(0); // NO marcado
      expect(resultado.excedente).toBe(0);
    });
  });

  describe('Sin cupones pendientes', () => {
    test('todo el pago queda como saldo a favor si no hay cupones', async () => {
      mockSupabase.setResponse('cupones', {
        data: [],
        error: null,
      });
      
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 50000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(0);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(0);
      expect(resultado.excedente).toBe(50000);
      expect(mockManejarSaldoAFavor).toHaveBeenCalledWith(10, 50000, mockSupabase);
    });
  });

  describe('Cupones ya pagados', () => {
    test('no aplica a cupones ya completamente pagados', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      // Cupón ya está pagado (saldo = 0)
      mockCalcularSaldoPendiente.mockResolvedValue(0);
      mockManejarSaldoAFavor.mockResolvedValue();

      const resultado = await aplicarPagoACupones(
        100, 10, 10000, '2025-12-05', mockSupabase
      );

      expect(resultado.cuponesAplicados).toHaveLength(0);
      expect(resultado.excedente).toBe(10000);
      expect(mockManejarSaldoAFavor).toHaveBeenCalledWith(10, 10000, mockSupabase);
    });
  });
});

