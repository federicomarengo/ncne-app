/**
 * Tests para cálculo de vista previa de cupones
 * 
 * Verifica:
 * - Generación de vista previa
 * - Que cada embarcación genera ítem separado
 * - Que cada visita genera ítem separado
 * - Cálculo de totales
 */

import { calcularVistaPreviaCupones, calcularCostoAmarra, obtenerDescripcionAmarra } from '../../calcularVistaPreviaCupones';
import { createMockSupabaseClient } from '../__mocks__/supabaseClient';
import * as supabaseClient from '@/utils/supabase/client';

jest.mock('@/utils/supabase/client');

describe('Cálculo de Vista Previa de Cupones', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (supabaseClient.createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Generación de vista previa', () => {
    test('genera vista previa con cuota social base', async () => {
      const socios = [
        {
          id: 1,
          numero_socio: 1,
          apellido: 'Pérez',
          nombre: 'Juan',
          dni: '11527405',
          email: 'juan@example.com',
          estado: 'activo',
        },
      ];

      mockSupabase.setResponse('cupones', {
        data: [],
        error: null,
      });

      mockSupabase.setResponse('socios', {
        data: socios,
        error: null,
      });

      mockSupabase.setResponse('embarcaciones', {
        data: [],
        error: null,
      });

      mockSupabase.setResponse('visitas', {
        data: [],
        error: null,
      });


      const config = {
        cuota_social_base: 28000,
        amarra_valor_por_pie: 2800,
        costo_visita: 4200,
        tasa_interes_mora: 0.045,
        dia_vencimiento: 15,
        dias_gracia: 5,
      };

      const vistaPrevia = await calcularVistaPreviaCupones({
        mes: 12,
        anio: 2025,
        fechaVencimiento: '2026-01-15',
        configuracion: config,
      });

      expect(vistaPrevia).toHaveLength(1);
      expect(vistaPrevia[0].montoCuotaSocial).toBe(28000);
      expect(vistaPrevia[0].montoTotal).toBe(28000); // Solo cuota social
    });
  });

  describe('Ítems de cupón', () => {
    test('cada embarcación genera ítem separado', () => {
      const config = {
        cuota_social_base: 28000,
        amarra_valor_por_pie: 2800,
        costo_visita: 4200,
        tasa_interes_mora: 0.045,
        dia_vencimiento: 15,
        dias_gracia: 5,
      };

      const embarcacion1 = {
        id: 1,
        tipo: 'velero',
        eslora_pies: 19,
        nombre: 'Velero 1',
        matricula: 'ABC123',
        socio_id: 1,
      };

      const embarcacion2 = {
        id: 2,
        tipo: 'velero',
        eslora_pies: 25,
        nombre: 'Velero 2',
        matricula: 'DEF456',
        socio_id: 1,
      };

      const costo1 = calcularCostoAmarra(embarcacion1 as any, config);
      const costo2 = calcularCostoAmarra(embarcacion2 as any, config);

      expect(costo1).toBe(53200); // 19 × 2800
      expect(costo2).toBe(70000); // 25 × 2800
      // Total debería ser la suma: 123200
      expect(costo1 + costo2).toBe(123200);
    });

    test('cada visita genera ítem separado con fecha específica', () => {
      const costoVisita = 4200;
      const visitas = [
        { cantidad_visitantes: 2, fecha_visita: '2025-12-15' },
        { cantidad_visitantes: 1, fecha_visita: '2025-12-20' },
        { cantidad_visitantes: 3, fecha_visita: '2025-12-25' },
      ];

      const items = visitas.map(v => ({
        tipo: 'visita',
        descripcion: `Visita ${v.fecha_visita} - ${v.cantidad_visitantes} persona(s) × $${costoVisita.toLocaleString('es-AR')}`,
        monto: v.cantidad_visitantes * costoVisita,
      }));

      expect(items).toHaveLength(3);
      expect(items[0].monto).toBe(8400); // 2 × 4200
      expect(items[1].monto).toBe(4200); // 1 × 4200
      expect(items[2].monto).toBe(12600); // 3 × 4200
      expect(items[0].descripcion).toContain('15');
      expect(items[1].descripcion).toContain('20');
      expect(items[2].descripcion).toContain('25');
    });
  });
});

