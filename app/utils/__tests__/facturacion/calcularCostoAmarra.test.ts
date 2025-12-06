import { calcularCostoAmarra, obtenerDescripcionAmarra } from '../../calcularVistaPreviaCupones';
import type { Embarcacion } from '@/app/types/embarcaciones';

describe('Cálculo de Costos de Amarra', () => {
  const config = {
    cuota_social_base: 28000,
    amarra_valor_por_pie: 2800,
    costo_visita: 4200,
    tasa_interes_mora: 0.045,
    dia_vencimiento: 15,
    dias_gracia: 5,
  };

  describe('Cruceros y Veleros', () => {
    test('calcula correctamente amarra para velero de 19 pies', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'velero', 
        eslora_pies: 19, 
        nombre: 'Velero 1',
        matricula: 'ABC123',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(53200); // 19 × 2800
    });

    test('calcula correctamente amarra para crucero de 30 pies', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'crucero', 
        eslora_pies: 30, 
        nombre: 'Crucero 1',
        matricula: 'DEF456',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(84000); // 30 × 2800
    });

    test('calcula correctamente amarra para velero de 25 pies', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'velero', 
        eslora_pies: 25, 
        nombre: 'Velero Grande',
        matricula: 'GHI789',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(70000); // 25 × 2800
    });

    test('genera descripción correcta para velero', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'velero', 
        eslora_pies: 25, 
        nombre: 'Mar Azul',
        matricula: 'JKL012',
        socio_id: 1
      };
      const descripcion = obtenerDescripcionAmarra(embarcacion, config);
      expect(descripcion).toContain('Mar Azul');
      expect(descripcion).toContain('25 pies');
      // El formato de moneda argentino es $ 2.800,00
      expect(descripcion).toContain('2.800');
    });
  });

  describe('Guarderías de tarifa fija', () => {
    test('retorna $42,000 para vela ligera', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'vela_ligera', 
        eslora_pies: 10, 
        nombre: 'Vela',
        matricula: 'VEL001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(42000);
    });

    test('retorna $42,000 para optimist', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'optimist', 
        eslora_pies: 8, 
        nombre: 'Opt',
        matricula: 'OPT001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(42000);
    });

    test('retorna $42,000 para moto de agua', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'moto_agua', 
        eslora_pies: 12, 
        nombre: 'Moto',
        matricula: 'MOT001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(42000);
    });

    test('retorna $42,000 para cuatriciclo', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'cuatriciclo', 
        eslora_pies: 3, 
        nombre: 'Cuatri',
        matricula: 'CUA001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(42000);
    });

    test('retorna $14,000 para kayak', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'kayak', 
        eslora_pies: 5, 
        nombre: 'Kayak',
        matricula: 'KAY001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(14000);
    });

    test('retorna $14,000 para windsurf', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'windsurf', 
        eslora_pies: 4, 
        nombre: 'Wind',
        matricula: 'WIN001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(14000);
    });

    test('retorna $14,000 para canoa', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'canoa', 
        eslora_pies: 6, 
        nombre: 'Canoa',
        matricula: 'CAN001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(14000);
    });
  });

  describe('Lanchas con reglas especiales', () => {
    test('lancha hasta 5.5m (18 pies) = $56,000', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'lancha', 
        eslora_pies: 18, 
        nombre: 'Lancha Chica',
        matricula: 'LAN001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(56000);
    });

    test('lancha de 15 pies (menor a 18) = $56,000', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'lancha', 
        eslora_pies: 15, 
        nombre: 'Lancha Pequeña',
        matricula: 'LAN002',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(56000);
    });

    test('lancha mayor a 5.5m (19 pies) se calcula por pie', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'lancha', 
        eslora_pies: 19, 
        nombre: 'Lancha Grande',
        matricula: 'LAN003',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(53200); // 19 × 2800
    });

    test('lancha de 25 pies se calcula por pie', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'lancha', 
        eslora_pies: 25, 
        nombre: 'Lancha Mediana',
        matricula: 'LAN004',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(70000); // 25 × 2800
    });
  });

  describe('Casos borde', () => {
    test('maneja eslora en 0', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'crucero', 
        eslora_pies: 0, 
        nombre: 'Test',
        matricula: 'TEST001',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(0);
    });

    test('maneja eslora decimal', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'velero', 
        eslora_pies: 19.5, 
        nombre: 'Test',
        matricula: 'TEST002',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(54600); // 19.5 × 2800
    });

    test('maneja tipo desconocido calculando por pie', () => {
      const embarcacion: Embarcacion = { 
        id: 1,
        tipo: 'otro' as any, 
        eslora_pies: 20, 
        nombre: 'Test',
        matricula: 'TEST003',
        socio_id: 1
      };
      expect(calcularCostoAmarra(embarcacion, config)).toBe(56000); // 20 × 2800
    });
  });
});

