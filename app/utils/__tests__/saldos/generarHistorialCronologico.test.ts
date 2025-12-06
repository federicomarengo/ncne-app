import { generarHistorialCronologico } from '../../generarHistorialCronologico';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';

describe('Generación de Historial Cronológico', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  test('genera historial ordenado cronológicamente', async () => {
    const cupones = [
      { 
        id: 1, 
        numero_cupon: '202510-001', 
        fecha_emision: '2025-10-01', 
        monto_total: 50000, 
        periodo_mes: 10, 
        periodo_anio: 2025,
        estado: 'pendiente',
        socio_id: 10,
      },
      { 
        id: 2, 
        numero_cupon: '202511-001', 
        fecha_emision: '2025-11-01', 
        monto_total: 60000, 
        periodo_mes: 11, 
        periodo_anio: 2025,
        estado: 'pagado',
        socio_id: 10,
      },
    ];

    const pagos = [
      { 
        id: 100, 
        fecha_pago: '2025-10-15', 
        monto: 50000, 
        metodo_pago: 'transferencia',
        socio_id: 10,
        estado_conciliacion: 'conciliado',
      },
    ];

    const pagosCupones = [
      { 
        pago_id: 100, 
        cupon_id: 1, 
        monto_aplicado: 50000, 
        cupon: { id: 1, numero_cupon: '202510-001', monto_total: 50000 } 
      },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: cupones,
            error: null,
          }),
        };
      }
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
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

    const historial = await generarHistorialCronologico(10, mockSupabase);

    expect(historial).toHaveLength(3); // 2 cupones + 1 pago
    expect(historial[0].tipo).toBe('cupon');
    expect(historial[1].tipo).toBe('pago');
    expect(historial[2].tipo).toBe('cupon');
  });

  test('calcula saldo acumulado correctamente', async () => {
    const cupones = [
      { 
        id: 1, 
        numero_cupon: '202510-001', 
        fecha_emision: '2025-10-01', 
        monto_total: 50000, 
        periodo_mes: 10, 
        periodo_anio: 2025,
        estado: 'pagado',
        socio_id: 10,
      },
    ];

    const pagos = [
      { 
        id: 100, 
        fecha_pago: '2025-10-15', 
        monto: 50000, 
        metodo_pago: 'transferencia',
        socio_id: 10,
        estado_conciliacion: 'conciliado',
      },
    ];

    const pagosCupones = [
      { 
        pago_id: 100, 
        cupon_id: 1, 
        monto_aplicado: 50000, 
        cupon: { id: 1, numero_cupon: '202510-001', monto_total: 50000 } 
      },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: cupones,
            error: null,
          }),
        };
      }
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
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

    const historial = await generarHistorialCronologico(10, mockSupabase);

    // Cupón: -50000, Pago: +50000
    expect(historial[0].saldoAcumulado).toBe(-50000); // Después del cupón
    expect(historial[1].saldoAcumulado).toBe(0); // Después del pago
  });

  test('muestra pago UNA SOLA VEZ con su monto total', async () => {
    const cupones = [
      { 
        id: 1, 
        numero_cupon: '202510-001', 
        fecha_emision: '2025-10-01', 
        monto_total: 30000, 
        periodo_mes: 10, 
        periodo_anio: 2025,
        estado: 'pagado',
        socio_id: 10,
      },
      { 
        id: 2, 
        numero_cupon: '202511-001', 
        fecha_emision: '2025-11-01', 
        monto_total: 40000, 
        periodo_mes: 11, 
        periodo_anio: 2025,
        estado: 'pagado',
        socio_id: 10,
      },
    ];

    const pagos = [
      { 
        id: 100, 
        fecha_pago: '2025-12-01', 
        monto: 70000, 
        metodo_pago: 'transferencia',
        socio_id: 10,
        estado_conciliacion: 'conciliado',
      },
    ];

    const pagosCupones = [
      { 
        pago_id: 100, 
        cupon_id: 1, 
        monto_aplicado: 30000, 
        cupon: { id: 1, numero_cupon: '202510-001', monto_total: 30000 } 
      },
      { 
        pago_id: 100, 
        cupon_id: 2, 
        monto_aplicado: 40000, 
        cupon: { id: 2, numero_cupon: '202511-001', monto_total: 40000 } 
      },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: cupones,
            error: null,
          }),
        };
      }
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
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

    const historial = await generarHistorialCronologico(10, mockSupabase);

    const pago = historial.find(m => m.tipo === 'pago');
    expect(pago).toBeDefined();
    expect(pago!.monto).toBe(70000); // Monto TOTAL, no fragmentado
    expect(pago!.cuponesAplicados).toHaveLength(2);
    expect(pago!.cuponesAplicados![0].monto_aplicado).toBe(30000);
    expect(pago!.cuponesAplicados![1].monto_aplicado).toBe(40000);
  });

  test('identifica saldo a favor si pago excede cupones', async () => {
    const cupones = [
      { 
        id: 1, 
        numero_cupon: '202510-001', 
        fecha_emision: '2025-10-01', 
        monto_total: 50000, 
        periodo_mes: 10, 
        periodo_anio: 2025,
        estado: 'pagado',
        socio_id: 10,
      },
    ];

    const pagos = [
      { 
        id: 100, 
        fecha_pago: '2025-10-15', 
        monto: 80000, // Pago excedente
        metodo_pago: 'transferencia',
        socio_id: 10,
        estado_conciliacion: 'conciliado',
      },
    ];

    const pagosCupones = [
      { 
        pago_id: 100, 
        cupon_id: 1, 
        monto_aplicado: 50000, 
        cupon: { id: 1, numero_cupon: '202510-001', monto_total: 50000 } 
      },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'cupones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: cupones,
            error: null,
          }),
        };
      }
      if (table === 'pagos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
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

    const historial = await generarHistorialCronologico(10, mockSupabase);

    const pago = historial.find(m => m.tipo === 'pago');
    expect(pago!.montoSaldoAFavor).toBe(30000); // 80K - 50K
  });
});


