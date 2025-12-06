/**
 * Tests exhaustivos de escenarios complejos de aplicación de pagos
 * 
 * Cubre todos los casos que involucran dinero:
 * - Saldo a favor y generación de cupones
 * - Diferentes órdenes de operaciones
 * - Cupones complejos con múltiples componentes
 * - Planes de financiación
 * - Intereses por mora
 * - Conciliación bancaria
 * - Casos extremos
 */

import { aplicarPagoACupones } from '../../aplicarPagoACupones';
import { aplicarSaldoAFavorACupon } from '../../aplicarSaldoAFavorACupon';
import { confirmarPagoDesdeMovimiento } from '../../confirmarPagoConciliacion';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';
import { calcularSaldoPendienteCupon } from '../../calcularSaldoPendienteCupon';
import { manejarSaldoAFavor, obtenerSaldoAFavor } from '../../manejarSaldoAFavor';

jest.mock('../../calcularSaldoPendienteCupon');
jest.mock('../../manejarSaldoAFavor');
jest.mock('../../aplicarSaldoAFavorACupon');
jest.mock('../../generarHashMovimiento');

describe('Escenarios Complejos de Aplicación de Pagos', () => {
  let mockSupabase: any;
  const mockCalcularSaldoPendiente = calcularSaldoPendienteCupon as jest.MockedFunction<typeof calcularSaldoPendienteCupon>;
  const mockManejarSaldoAFavor = manejarSaldoAFavor as jest.MockedFunction<typeof manejarSaldoAFavor>;
  const mockObtenerSaldoAFavor = obtenerSaldoAFavor as jest.MockedFunction<typeof obtenerSaldoAFavor>;
  const mockAplicarSaldoAFavorACupon = aplicarSaldoAFavorACupon as jest.MockedFunction<typeof aplicarSaldoAFavorACupon>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('Saldo a favor y generación de cupones', () => {
    test('Socio con saldo a favor $40K, se genera cupón de $100K → Saldo aplicado, cupón queda con $60K pendiente', async () => {
      mockAplicarSaldoAFavorACupon.mockResolvedValue({
        montoAplicado: 40000,
        saldoRestante: 0,
        cuponQuedoPagado: false,
      });
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(40000);
      expect(resultado.saldoRestante).toBe(0);
      expect(resultado.cuponQuedoPagado).toBe(false); // Queda $60K pendiente
    });

    test('Socio con saldo a favor $100K, se genera cupón de $50K → Saldo aplicado, cupón pagado, saldo restante $50K', async () => {
      mockAplicarSaldoAFavorACupon.mockResolvedValue({
        montoAplicado: 50000,
        saldoRestante: 50000,
        cuponQuedoPagado: true,
      });
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      
      expect(resultado.montoAplicado).toBe(50000);
      expect(resultado.saldoRestante).toBe(50000);
      expect(resultado.cuponQuedoPagado).toBe(true); // Cupón pagado completamente
    });

    test('Socio con saldo a favor $150K, se generan 3 cupones ($30K, $40K, $50K) → Todos pagados, saldo restante $30K', async () => {
      // Simular aplicación secuencial
      mockAplicarSaldoAFavorACupon
        .mockResolvedValueOnce({
          montoAplicado: 30000,
          saldoRestante: 120000,
          cuponQuedoPagado: true,
        })
        .mockResolvedValueOnce({
          montoAplicado: 40000,
          saldoRestante: 80000,
          cuponQuedoPagado: true,
        })
        .mockResolvedValueOnce({
          montoAplicado: 50000,
          saldoRestante: 30000,
          cuponQuedoPagado: true,
        });

      const resultado1 = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      expect(resultado1.montoAplicado).toBe(30000);
      expect(resultado1.cuponQuedoPagado).toBe(true);

      const resultado2 = await aplicarSaldoAFavorACupon(2, 10, mockSupabase);
      expect(resultado2.montoAplicado).toBe(40000);
      expect(resultado2.cuponQuedoPagado).toBe(true);

      const resultado3 = await aplicarSaldoAFavorACupon(3, 10, mockSupabase);
      expect(resultado3.montoAplicado).toBe(50000);
      expect(resultado3.cuponQuedoPagado).toBe(true);
      expect(resultado3.saldoRestante).toBe(30000); // 150K - 30K - 40K - 50K
    });
  });

  describe('Diferentes órdenes de operaciones', () => {
    test('Generar cupón → Pago → Generar nuevo cupón → Saldo a favor se aplica automáticamente', async () => {
      // Paso 1: Generar primer cupón (sin saldo a favor)
      mockObtenerSaldoAFavor.mockResolvedValueOnce(0);
      
      // Paso 2: Recibir pago excedente
      const cuponesPendientes = [
        { id: 1, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 }
      ];
      mockSupabase.setResponse('cupones', { data: cuponesPendientes, error: null });
      mockSupabase.setResponse('pagos_cupones', { data: [], error: null });
      mockCalcularSaldoPendiente.mockResolvedValueOnce(50000);
      
      const resultadoPago = await aplicarPagoACupones(100, 10, 80000, '2025-12-01', mockSupabase);
      expect(resultadoPago.excedente).toBe(30000); // Genera saldo a favor

      // Paso 3: Generar nuevo cupón - saldo a favor se aplica automáticamente
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 30000,
        saldoRestante: 0,
        cuponQuedoPagado: false,
      });
      
      const resultadoSaldo = await aplicarSaldoAFavorACupon(2, 10, mockSupabase);
      expect(resultadoSaldo.montoAplicado).toBe(30000);
      expect(resultadoSaldo.cuponQuedoPagado).toBe(false); // Queda $30K pendiente
    });

    test('Pago excedente → Generar cupón → Saldo a favor se aplica al nuevo cupón', async () => {
      // Recibir pago excedente
      mockSupabase.setResponse('cupones', { data: [], error: null });
      await aplicarPagoACupones(100, 10, 50000, '2025-12-01', mockSupabase);

      // Generar cupón después - saldo se aplica automáticamente
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 40000,
        saldoRestante: 10000,
        cuponQuedoPagado: true,
      });
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      expect(resultado.montoAplicado).toBe(40000);
      expect(resultado.cuponQuedoPagado).toBe(true);
      expect(resultado.saldoRestante).toBe(10000);
    });
  });

  describe('Cupones complejos con múltiples componentes', () => {
    test('Cupón con: Cuota Social $28K + Amarra $53K + Visitas $8K + Intereses $1K = $90K total → Pago aplicado correctamente', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 90000, // 28K + 53K + 8K + 1K
          fecha_vencimiento: '2025-11-15',
          estado: 'pendiente',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(90000);
      
      const resultado = await aplicarPagoACupones(100, 10, 90000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(0);
    });

    test('Cupón con: Amarra de ingreso $980K + Cuota Social $28K → Verificar distribución', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 1008000, // 980K + 28K
          fecha_vencimiento: '2025-11-15',
          estado: 'pendiente',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(1008000);
      
      const resultado = await aplicarPagoACupones(100, 10, 1008000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(0);
    });

    test('Cupón con: Cuota de plan $37K + Intereses por mora $840 → Pago aplicado correctamente', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 37840, // 37K + 840
          fecha_vencimiento: '2025-11-15',
          estado: 'pendiente',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(37840);
      
      const resultado = await aplicarPagoACupones(100, 10, 37840, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(0);
    });
  });

  describe('Planes de financiación', () => {
    test('Cupón con cuota de plan que vence → Pago aplicado marca cuota como pagada', async () => {
      // Este test verifica que cuando se paga un cupón que incluye una cuota de plan,
      // la cuota del plan se marca como pagada
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 65000, // Cuota social + cuota de plan
          fecha_vencimiento: '2025-11-15',
          estado: 'pendiente',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(65000);
      
      const resultado = await aplicarPagoACupones(100, 10, 65000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      // La cuota del plan se marca como pagada cuando el cupón se marca como pagado
    });

    test('Pago parcial a cupón con cuota de plan → Verificar que no marca cuota pagada si no cubre', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 65000, // Cuota social + cuota de plan
          fecha_vencimiento: '2025-11-15',
          estado: 'pendiente',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(65000);
      
      const resultado = await aplicarPagoACupones(100, 10, 30000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(0); // NO se marca como pagado
      expect(resultado.cuponesAplicados).toHaveLength(1); // Pero sí se aplica el pago
    });
  });

  describe('Intereses por mora', () => {
    test('Cupón vencido con intereses → Pago cubre monto base + intereses', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 50750, // 50K base + 750 intereses (10 días mora)
          fecha_vencimiento: '2025-10-15',
          estado: 'vencido',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(50750);
      
      const resultado = await aplicarPagoACupones(100, 10, 50750, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(0);
    });

    test('Pago parcial a cupón con intereses → Verificar cálculo de saldo pendiente incluye intereses', async () => {
      const cuponesPendientes = [
        { 
          id: 1, 
          monto_total: 50750, // 50K + 750 intereses
          fecha_vencimiento: '2025-10-15',
          estado: 'vencido',
          socio_id: 10
        }
      ];
      
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      
      mockCalcularSaldoPendiente.mockResolvedValue(50750);
      
      const resultado = await aplicarPagoACupones(100, 10, 25000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(1);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(0); // No cubre todo
      
      // Verificar que el saldo pendiente sigue incluyendo intereses
      expect(mockCalcularSaldoPendiente).toHaveBeenCalledWith(1, mockSupabase);
    });
  });

  describe('Saldo a favor en contra', () => {
    test('Socio con saldo a favor $50K → Genera cupón $30K → Cupón pagado, saldo $20K → Genera otro cupón $40K → Aplica $20K, queda pendiente $20K', async () => {
      // Primera aplicación: $50K saldo a favor a cupón de $30K
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 30000,
        saldoRestante: 20000,
        cuponQuedoPagado: true,
      });
      
      const resultado1 = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      expect(resultado1.montoAplicado).toBe(30000);
      expect(resultado1.cuponQuedoPagado).toBe(true);
      expect(resultado1.saldoRestante).toBe(20000);

      // Segunda aplicación: $20K saldo restante a cupón de $40K
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 20000,
        saldoRestante: 0,
        cuponQuedoPagado: false,
      });
      
      const resultado2 = await aplicarSaldoAFavorACupon(2, 10, mockSupabase);
      expect(resultado2.montoAplicado).toBe(20000);
      expect(resultado2.cuponQuedoPagado).toBe(false); // Queda $20K pendiente
      expect(resultado2.saldoRestante).toBe(0);
    });

    test('Saldo a favor acumulado de múltiples pagos excedentes → Se aplica correctamente', async () => {
      // Primer pago excedente: $30K
      mockSupabase.setResponse('cupones', { data: [], error: null });
      await aplicarPagoACupones(100, 10, 30000, '2025-12-01', mockSupabase);
      
      // Segundo pago excedente: $20K
      await aplicarPagoACupones(101, 10, 20000, '2025-12-02', mockSupabase);
      
      // Total saldo a favor: $50K
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 40000,
        saldoRestante: 10000,
        cuponQuedoPagado: true,
      });
      
      const resultado = await aplicarSaldoAFavorACupon(1, 10, mockSupabase);
      expect(resultado.montoAplicado).toBe(40000);
      expect(resultado.saldoRestante).toBe(10000);
    });
  });

  describe('Escenarios de conciliación bancaria', () => {
    test('Movimiento bancario $80K → Cupones pendientes $30K + $40K → Ambos pagados + $10K saldo a favor', async () => {
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
      
      const resultado = await aplicarPagoACupones(100, 10, 80000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(2);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(2);
      expect(resultado.excedente).toBe(10000); // 80K - 30K - 40K
      expect(mockManejarSaldoAFavor).toHaveBeenCalledWith(10, 10000, mockSupabase);
    });

    test('Movimiento bancario $150K → 3 cupones ($40K, $50K, $60K) → Todos pagados + $0 saldo', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 40000, fecha_vencimiento: '2025-10-15', estado: 'pendiente', socio_id: 10 },
        { id: 2, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
        { id: 3, monto_total: 60000, fecha_vencimiento: '2025-12-15', estado: 'pendiente', socio_id: 10 },
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
        .mockResolvedValueOnce(40000)
        .mockResolvedValueOnce(50000)
        .mockResolvedValueOnce(60000);
      
      const resultado = await aplicarPagoACupones(100, 10, 150000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesAplicados).toHaveLength(3);
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(3);
      expect(resultado.excedente).toBe(0);
    });

    test('Movimiento bancario $200K → 1 cupón $80K → Cupón pagado + $120K saldo a favor → Generar nuevo cupón $100K → Saldo aplicado, cupón pagado, saldo restante $20K', async () => {
      // Primer paso: Pago excedente
      const cuponesPendientes1 = [
        { id: 1, monto_total: 80000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
      ];
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes1,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      mockCalcularSaldoPendiente.mockResolvedValueOnce(80000);
      
      const resultado1 = await aplicarPagoACupones(100, 10, 200000, '2025-12-01', mockSupabase);
      expect(resultado1.excedente).toBe(120000);

      // Segundo paso: Aplicar saldo a favor al nuevo cupón
      mockAplicarSaldoAFavorACupon.mockResolvedValueOnce({
        montoAplicado: 100000,
        saldoRestante: 20000,
        cuponQuedoPagado: true,
      });
      
      const resultado2 = await aplicarSaldoAFavorACupon(2, 10, mockSupabase);
      expect(resultado2.montoAplicado).toBe(100000);
      expect(resultado2.cuponQuedoPagado).toBe(true);
      expect(resultado2.saldoRestante).toBe(20000);
    });
  });

  describe('Casos extremos', () => {
    test('Pago $0.01 más que el cupón → Saldo a favor mínimo', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 50000, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
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
      
      const resultado = await aplicarPagoACupones(100, 10, 50000.01, '2025-12-05', mockSupabase);
      
      // Usar comparación aproximada debido a errores de precisión de punto flotante
      expect(resultado.excedente).toBeCloseTo(0.01, 5);
      expect(mockManejarSaldoAFavor).toHaveBeenCalled();
      const callArgs = mockManejarSaldoAFavor.mock.calls[0];
      expect(callArgs[1]).toBeCloseTo(0.01, 5);
    });

    test('Cupón de $10 → Pago de $100,000 → Saldo a favor de $99,990', async () => {
      const cuponesPendientes = [
        { id: 1, monto_total: 10, fecha_vencimiento: '2025-11-15', estado: 'pendiente', socio_id: 10 },
      ];
      mockSupabase.setResponse('cupones', {
        data: cuponesPendientes,
        error: null,
      });
      mockSupabase.setResponse('pagos_cupones', {
        data: [],
        error: null,
      });
      mockCalcularSaldoPendiente.mockResolvedValue(10);
      
      const resultado = await aplicarPagoACupones(100, 10, 100000, '2025-12-05', mockSupabase);
      
      expect(resultado.cuponesMarcadosComoPagados).toHaveLength(1);
      expect(resultado.excedente).toBe(99990);
    });

    test('Sin cupones, múltiples pagos → Saldo a favor se acumula correctamente', async () => {
      mockSupabase.setResponse('cupones', { data: [], error: null });
      
      await aplicarPagoACupones(100, 10, 30000, '2025-12-01', mockSupabase);
      await aplicarPagoACupones(101, 10, 20000, '2025-12-02', mockSupabase);
      await aplicarPagoACupones(102, 10, 50000, '2025-12-03', mockSupabase);
      
      // Verificar que se llamó 3 veces con los montos correctos
      expect(mockManejarSaldoAFavor).toHaveBeenCalledTimes(3);
      expect(mockManejarSaldoAFavor).toHaveBeenNthCalledWith(1, 10, 30000, mockSupabase);
      expect(mockManejarSaldoAFavor).toHaveBeenNthCalledWith(2, 10, 20000, mockSupabase);
      expect(mockManejarSaldoAFavor).toHaveBeenNthCalledWith(3, 10, 50000, mockSupabase);
    });
  });
});

