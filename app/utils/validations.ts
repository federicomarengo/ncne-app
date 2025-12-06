import { z } from 'zod';

// Validaciones para cupones
export const cuponUpdateSchema = z.object({
  periodo_mes: z.number().int().min(1).max(12).optional(),
  periodo_anio: z.number().int().min(2020).max(2099).optional(),
  fecha_emision: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  monto_cuota_social: z.number().nonnegative().optional(),
  monto_amarra: z.number().nonnegative().optional(),
  monto_visitas: z.number().nonnegative().optional(),
  monto_otros_cargos: z.number().nonnegative().optional(),
  monto_intereses: z.number().nonnegative().optional(),
  monto_total: z.number().nonnegative().optional(),
  estado: z.enum(['pendiente', 'pagado', 'vencido', 'cancelado']).optional(),
  fecha_pago: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

export const cuponIdSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val);
    if (isNaN(num)) throw new Error('ID inválido');
    return num;
  }),
});

// Validaciones para items de cupón
export const itemCuponCreateSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es obligatoria').trim(),
  cantidad: z.number().int().positive().optional().default(1),
  precio_unitario: z.number().nonnegative().nullable().optional(),
  subtotal: z.number().nonnegative().optional(),
});

export const itemCuponUpdateSchema = z.object({
  item_id: z.number().int().positive(),
  descripcion: z.string().min(1, 'La descripción no puede estar vacía').trim().optional(),
  cantidad: z.number().int().positive().optional(),
  precio_unitario: z.number().nonnegative().nullable().optional(),
  subtotal: z.number().nonnegative().optional(),
});

// Validaciones para pagos
export const pagoUpdateSchema = z.object({
  socio_id: z.number().int().positive().optional(),
  fecha_pago: z.string().optional(),
  monto: z.number().positive().optional(),
  metodo_pago: z.enum(['efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro']).optional(),
  numero_comprobante: z.string().nullable().optional(),
  referencia_bancaria: z.string().nullable().optional(),
  estado_conciliacion: z.enum(['pendiente', 'conciliado', 'discrepancia']).optional(),
  fecha_conciliacion: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

// Validaciones para asociación pago-cupón
export const pagoCuponCreateSchema = z.object({
  cupon_id: z.number().int().positive(),
  monto_aplicado: z.number().positive(),
});

export const pagoCuponUpdateSchema = z.object({
  pago_cupon_id: z.number().int().positive(),
  monto_aplicado: z.number().positive(),
});

// Validaciones para emails
export const emailEnviarCuponSchema = z.object({
  cupon_id: z.number().int().positive(),
  email_destino: z.string().email().optional(),
});

export const emailTestSchema = z.object({
  email_destino: z.string().email(),
  asunto: z.string().optional(),
});

// Validaciones para keywords
export const keywordDeleteSchema = z.object({
  tipo: z.enum(['cuit']).optional(),
});

// Helper para validar y parsear
export function validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Error de validación' };
  }
}

