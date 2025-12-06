/**
 * Validación de variables de entorno
 * 
 * Valida que todas las variables de entorno requeridas estén presentes
 * y tengan valores válidos. Falla rápido si falta alguna variable crítica.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvConfig {
  required: string[];
  optional: string[];
  validate?: (env: Record<string, string | undefined>) => string[];
}

/**
 * Configuración de variables de entorno
 */
const ENV_CONFIG: EnvConfig = {
  // Variables críticas que deben estar presentes
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],
  // Variables opcionales (con valores por defecto)
  optional: [
    'NEXT_PUBLIC_PORTAL_URL',
    'NODE_ENV',
  ],
  // Validaciones personalizadas
  validate: (env) => {
    const errors: string[] = [];

    // Validar formato de URL de Supabase
    if (env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
        if (!url.protocol.startsWith('http')) {
          errors.push('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida (http:// o https://)');
        }
      } catch {
        errors.push('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida');
      }
    }

    // Validar que la anon key no esté vacía
    if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length === 0) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no puede estar vacía');
    }

    // Validar formato de URL del portal si está presente
    if (env.NEXT_PUBLIC_PORTAL_URL) {
      try {
        new URL(env.NEXT_PUBLIC_PORTAL_URL);
      } catch {
        errors.push('NEXT_PUBLIC_PORTAL_URL debe ser una URL válida');
      }
    }

    // Validar NODE_ENV
    if (env.NODE_ENV && !['development', 'production', 'test'].includes(env.NODE_ENV)) {
      errors.push('NODE_ENV debe ser "development", "production" o "test"');
    }

    return errors;
  },
};

/**
 * Valida las variables de entorno
 * 
 * @param throwOnError - Si es true, lanza un error si hay variables faltantes
 * @returns Resultado de la validación
 */
export function validateEnv(throwOnError = false): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar variables requeridas
  for (const key of ENV_CONFIG.required) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      errors.push(`Variable de entorno requerida faltante: ${key}`);
    }
  }

  // Validaciones personalizadas
  if (ENV_CONFIG.validate) {
    const customErrors = ENV_CONFIG.validate(process.env);
    errors.push(...customErrors);
  }

  // Advertencias para variables opcionales recomendadas
  if (!process.env.NEXT_PUBLIC_PORTAL_URL) {
    warnings.push('NEXT_PUBLIC_PORTAL_URL no está configurada. Se usará el valor por defecto.');
  }


  const result: EnvValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
  };

  // Si hay errores y se debe lanzar excepción, hacerlo
  if (throwOnError && errors.length > 0) {
    const errorMessage = [
      '❌ Error de validación de variables de entorno:',
      ...errors.map(e => `  - ${e}`),
      '',
      'Por favor, configura las variables de entorno requeridas en tu archivo .env.local',
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Valida las variables de entorno al inicio de la aplicación
 * Se ejecuta automáticamente cuando se importa este módulo
 */
export function initEnvValidation() {
  // Solo validar en servidor (no en cliente)
  if (typeof window !== 'undefined') {
    return;
  }

  // No mostrar warnings durante el build (solo en runtime)
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  const result = validateEnv(false);

  if (!result.valid) {
    console.error('⚠️  Variables de entorno inválidas:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    
    // En producción, lanzar error para detener la aplicación
    if (process.env.NODE_ENV === 'production') {
      validateEnv(true); // Esto lanzará el error
    }
  }

  // Solo mostrar warnings en runtime, no durante el build
  if (!isBuildTime && result.warnings.length > 0) {
    console.warn('⚠️  Advertencias de configuración:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!isBuildTime && result.valid && result.warnings.length === 0) {
    console.log('✅ Variables de entorno validadas correctamente');
  }
}

// Ejecutar validación automáticamente al importar
initEnvValidation();

