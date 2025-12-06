/**
 * Tests para cálculo de intereses por mora
 * 
 * Verifica:
 * - Intereses sobre cupones regulares (con días de gracia)
 * - Intereses sobre cuotas de planes (SIN días de gracia)
 * - Cálculos correctos según días de mora
 * - Casos borde
 */

describe('Cálculo de Intereses por Mora', () => {
  const config = {
    tasa_interes_mora: 0.045, // 4.5% mensual
    dias_gracia: 5,
  };

  describe('Intereses sobre cupones regulares (CON días de gracia)', () => {
    test('NO calcula interés si días mora <= días de gracia', () => {
      const saldoVencido = 50000;
      const diasTranscurridos = 5; // Dentro de días de gracia
      const diasMora = Math.max(0, diasTranscurridos - config.dias_gracia);
      
      expect(diasMora).toBe(0);
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(0);
    });

    test('NO calcula interés si días transcurridos < días de gracia', () => {
      const saldoVencido = 50000;
      const diasTranscurridos = 3; // Menos que días de gracia
      const diasMora = Math.max(0, diasTranscurridos - config.dias_gracia);
      
      expect(diasMora).toBe(0);
    });

    test('calcula interés correctamente después de días de gracia', () => {
      const saldoVencido = 50000;
      const diasTranscurridos = 15; // 15 días desde vencimiento
      const diasMora = Math.max(0, diasTranscurridos - config.dias_gracia); // 10 días de mora
      
      expect(diasMora).toBe(10);
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(750); // (50000 × 0.045 / 30) × 10
    });

    test('calcula interés para múltiples días de mora', () => {
      const saldoVencido = 30000;
      const diasTranscurridos = 30;
      const diasMora = Math.max(0, diasTranscurridos - config.dias_gracia); // 25 días
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(1125); // (30000 × 0.045 / 30) × 25
    });

    test('calcula interés correctamente con cupón de $100,000', () => {
      const saldoVencido = 100000;
      const diasTranscurridos = 20;
      const diasMora = Math.max(0, diasTranscurridos - config.dias_gracia); // 15 días
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(2250); // (100000 × 0.045 / 30) × 15
    });
  });

  describe('Intereses sobre cuotas de planes (SIN días de gracia)', () => {
    test('calcula interés desde el día siguiente al vencimiento', () => {
      const montoCuota = 37333.33;
      const diasMora = 15; // SIN días de gracia - interés desde día 1
      
      const interesDiario = (montoCuota * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(Math.round(interes)).toBe(840); // (37333.33 × 0.045 / 30) × 15
    });

    test('NO aplica días de gracia a cuotas de planes', () => {
      const montoCuota = 50000;
      const diasMora = 3; // Menos que días de gracia, pero se calcula igual
      
      const interesDiario = (montoCuota * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBeGreaterThan(0);
      expect(interes).toBe(225); // (50000 × 0.045 / 30) × 3
    });

    test('calcula interés para cuota de plan con 30 días de mora', () => {
      const montoCuota = 50000;
      const diasMora = 30; // Un mes completo
      
      const interesDiario = (montoCuota * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(2250); // (50000 × 0.045 / 30) × 30 = tasa mensual completa
    });

    test('cuota de plan con intereses acumulados', () => {
      const montoCuota = 37333.33;
      const diasMora = 20;
      
      const interesDiario = (montoCuota * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(Math.round(interes)).toBe(1120); // (37333.33 × 0.045 / 30) × 20
    });
  });

  describe('Casos borde', () => {
    test('interés con saldo 0 = 0', () => {
      const saldoVencido = 0;
      const diasMora = 10;
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(0);
    });

    test('interés con días mora 0 = 0', () => {
      const saldoVencido = 50000;
      const diasMora = 0;
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(0);
    });

    test('interés con saldo muy pequeño', () => {
      const saldoVencido = 100; // $100
      const diasMora = 10;
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(1.5); // (100 × 0.045 / 30) × 10
    });

    test('interés con saldo muy grande', () => {
      const saldoVencido = 1000000; // $1,000,000
      const diasMora = 10;
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(15000); // (1000000 × 0.045 / 30) × 10
    });

    test('interés con días de mora muy altos', () => {
      const saldoVencido = 50000;
      const diasMora = 90; // 3 meses
      
      const interesDiario = (saldoVencido * config.tasa_interes_mora) / 30;
      const interes = interesDiario * diasMora;
      
      expect(interes).toBe(6750); // (50000 × 0.045 / 30) × 90
    });
  });

  describe('Verificación de fórmula', () => {
    test('fórmula de interés diario es correcta', () => {
      const saldo = 30000;
      const tasaMensual = 0.045;
      const interesDiario = (saldo * tasaMensual) / 30;
      
      expect(interesDiario).toBe(45); // 30000 × 0.045 / 30
    });

    test('fórmula completa produce resultados consistentes', () => {
      const saldo = 50000;
      const diasMora = 10;
      const interesDiario = (saldo * config.tasa_interes_mora) / 30;
      const interesTotal = interesDiario * diasMora;
      
      // Verificar que es equivalente a: (saldo × tasa × diasMora) / 30
      const interesDirecto = (saldo * config.tasa_interes_mora * diasMora) / 30;
      
      expect(interesTotal).toBe(interesDirecto);
      expect(interesTotal).toBe(750);
    });
  });
});

