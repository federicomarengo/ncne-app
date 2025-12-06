/**
 * Tests de seguridad para validación de inputs
 */

import {
  CuponUpdateSchema,
  ItemCuponCreateSchema,
  PagoUpdateSchema,
  EnviarCuponSchema,
  EmailPruebaSchema,
} from '@/app/utils/validations';

describe('Security: Input Validation', () => {
  describe('CuponUpdateSchema', () => {
    it('debe validar un cupón válido', () => {
      const validCupon = {
        periodo_mes: 1,
        periodo_anio: 2025,
        monto_total: 1000,
        estado: 'pendiente',
      };

      const result = CuponUpdateSchema.safeParse(validCupon);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un mes inválido', () => {
      const invalidCupon = {
        periodo_mes: 13, // Mes inválido
        periodo_anio: 2025,
      };

      const result = CuponUpdateSchema.safeParse(invalidCupon);
      expect(result.success).toBe(false);
    });

    it('debe rechazar un año inválido', () => {
      const invalidCupon = {
        periodo_mes: 1,
        periodo_anio: 2019, // Año muy antiguo
      };

      const result = CuponUpdateSchema.safeParse(invalidCupon);
      expect(result.success).toBe(false);
    });

    it('debe rechazar un monto negativo', () => {
      const invalidCupon = {
        monto_total: -100,
      };

      const result = CuponUpdateSchema.safeParse(invalidCupon);
      expect(result.success).toBe(false);
    });
  });

  describe('ItemCuponCreateSchema', () => {
    it('debe validar un item válido', () => {
      const validItem = {
        cupon_id: 1,
        descripcion: 'Cuota social',
        monto: 1000,
      };

      const result = ItemCuponCreateSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un item sin descripción', () => {
      const invalidItem = {
        cupon_id: 1,
        monto: 1000,
      };

      const result = ItemCuponCreateSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('PagoUpdateSchema', () => {
    it('debe validar un pago válido', () => {
      const validPago = {
        monto: 1000,
        metodo_pago: 'transferencia',
        fecha_pago: '2025-01-15T10:00:00Z',
      };

      const result = PagoUpdateSchema.safeParse(validPago);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un monto negativo', () => {
      const invalidPago = {
        monto: -100,
      };

      const result = PagoUpdateSchema.safeParse(invalidPago);
      expect(result.success).toBe(false);
    });
  });

  describe('EnviarCuponSchema', () => {
    it('debe validar un email válido', () => {
      const validEmail = {
        cupon_id: 1,
        email: 'test@example.com',
      };

      const result = EnviarCuponSchema.safeParse(validEmail);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un email inválido', () => {
      const invalidEmail = {
        cupon_id: 1,
        email: 'not-an-email',
      };

      const result = EnviarCuponSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('EmailPruebaSchema', () => {
    it('debe validar un email de prueba válido', () => {
      const validEmail = {
        email: 'test@example.com',
      };

      const result = EmailPruebaSchema.safeParse(validEmail);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un email inválido', () => {
      const invalidEmail = {
        email: 'invalid-email',
      };

      const result = EmailPruebaSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });
  });
});


