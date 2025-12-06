/**
 * Script de validación de variables de entorno
 * 
 * Ejecutar con: node scripts/validate-env.js
 * 
 * Valida que todas las variables de entorno requeridas estén presentes
 * y tengan valores válidos antes de iniciar la aplicación.
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_PORTAL_URL',
  'NODE_ENV',
];

function validateEnv() {
  const errors = [];
  const warnings = [];

  console.log('🔍 Validando variables de entorno...\n');

  // Verificar variables requeridas
  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      errors.push(`❌ Variable requerida faltante: ${key}`);
    } else {
      console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    }
  }

  // Verificar variables opcionales
  for (const key of OPTIONAL_VARS) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      warnings.push(`⚠️  Variable opcional no configurada: ${key}`);
    } else {
      console.log(`✅ ${key}: ${value.substring(0, 30)}...`);
    }
  }

  // Validaciones personalizadas
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (!url.protocol.startsWith('http')) {
        errors.push('❌ NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida (http:// o https://)');
      }
    } catch {
      errors.push('❌ NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida');
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length === 0) {
      errors.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no puede estar vacía');
    }
  }

  if (process.env.NEXT_PUBLIC_PORTAL_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_PORTAL_URL);
    } catch {
      errors.push('❌ NEXT_PUBLIC_PORTAL_URL debe ser una URL válida');
    }
  }

  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    errors.push('❌ NODE_ENV debe ser "development", "production" o "test"');
  }

  // Mostrar resultados
  console.log('\n' + '='.repeat(50) + '\n');

  if (warnings.length > 0) {
    console.log('⚠️  Advertencias:');
    warnings.forEach(warning => console.log(`  ${warning}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Errores encontrados:');
    errors.forEach(error => console.error(`  ${error}`));
    console.error('\n💡 Por favor, configura las variables de entorno requeridas en tu archivo .env.local');
    console.error('   Ejemplo:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key\n');
    process.exit(1);
  }

  console.log('✅ Todas las variables de entorno están configuradas correctamente\n');
  process.exit(0);
}

// Ejecutar validación
validateEnv();

