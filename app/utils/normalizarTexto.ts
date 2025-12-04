/**
 * Utilidades para normalizar texto en el proceso de matching
 */

/**
 * Normaliza un texto removiendo acentos, convirtiendo a mayúsculas y limpiando espacios
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return '';

  return texto
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[^A-Z0-9\s]/g, '') // Remover caracteres especiales excepto espacios
    .trim();
}

/**
 * Normaliza un nombre completo separando apellido y nombre
 */
export function normalizarNombreCompleto(nombreCompleto: string | null | undefined): {
  apellido: string;
  nombre: string;
} {
  if (!nombreCompleto) return { apellido: '', nombre: '' };

  const normalizado = normalizarTexto(nombreCompleto);
  const partes = normalizado.split(/\s+/).filter((p) => p.length > 0);

  if (partes.length === 0) return { apellido: '', nombre: '' };
  if (partes.length === 1) return { apellido: partes[0], nombre: '' };

  // El primer elemento es el apellido, el resto es el nombre
  const apellido = partes[0];
  const nombre = partes.slice(1).join(' ');

  return { apellido, nombre };
}

/**
 * Normaliza un CUIT/CUIL removiendo guiones y espacios
 */
export function normalizarCUITCUIL(cuit: string | null | undefined): string {
  if (!cuit) return '';

  return cuit.replace(/[^0-9]/g, '');
}

/**
 * Normaliza un DNI removiendo puntos y espacios
 */
export function normalizarDNI(dni: string | null | undefined): string {
  if (!dni) return '';

  return dni.replace(/[^0-9]/g, '');
}

/**
 * Extrae el DNI de un CUIT/CUIL
 * El DNI está en las posiciones 2-9 (8 dígitos)
 * 
 * @param cuit - CUIT/CUIL normalizado (11 dígitos)
 * @returns DNI extraído o null si no es válido
 */
export function extraerDNIDeCUITCUIL(cuit: string | null | undefined): string | null {
  if (!cuit) return null;
  
  const cuitNormalizado = normalizarCUITCUIL(cuit);
  
  // Validar que tenga exactamente 11 dígitos
  if (cuitNormalizado.length !== 11) return null;
  
  // Extraer DNI: posiciones 2-9 (8 dígitos)
  const dni = cuitNormalizado.substring(2, 10);
  
  // Validar que el DNI tenga 8 dígitos
  if (dni.length !== 8) return null;
  
  return dni;
}

/**
 * Abreviaciones comunes de nombres y palabras
 */
const ABREVIACIONES: Record<string, string> = {
  'SOC': 'SOCIO',
  'SOCIO': 'SOCIO',
  'SR': 'SEÑOR',
  'SRA': 'SEÑORA',
  'SRTA': 'SEÑORITA',
  'LIC': 'LICENCIADO',
  'DR': 'DOCTOR',
  'ING': 'INGENIERO',
  'PROF': 'PROFESOR',
};

/**
 * Expande abreviaciones comunes en un texto
 */
export function expandirAbreviaciones(texto: string): string {
  let resultado = texto;

  Object.entries(ABREVIACIONES).forEach(([abrev, completo]) => {
    const regex = new RegExp(`\\b${abrev}\\b`, 'gi');
    resultado = resultado.replace(regex, completo);
  });

  return resultado;
}

/**
 * Extrae posibles nombres del concepto del extracto
 * Intenta identificar patrones comunes en los conceptos bancarios
 * 
 * Prioriza números de 11 dígitos (CUIT/CUIL) sobre otros números
 */
export function extraerNombreDelConcepto(concepto: string): {
  apellido: string | null;
  nombre: string | null;
  cuit: string | null;
  dni: string | null;
} {
  if (!concepto) return { apellido: null, nombre: null, cuit: null, dni: null };

  const normalizado = normalizarTexto(concepto);
  let apellido: string | null = null;
  let nombre: string | null = null;
  let cuit: string | null = null;
  let dni: string | null = null;

  // 1. Buscar CUIT/CUIL (11 dígitos) - PRIORIDAD
  // Primero buscar sin guiones (11 dígitos consecutivos con word boundaries)
  const cuitMatch11 = concepto.match(/\b(\d{11})\b/);
  if (cuitMatch11) {
    cuit = normalizarCUITCUIL(cuitMatch11[1]);
    // Validar que tenga exactamente 11 dígitos después de normalizar
    if (cuit.length === 11) {
      // Extraer DNI del CUIT/CUIL (prioridad)
      dni = extraerDNIDeCUITCUIL(cuit);
    } else {
      cuit = null; // No es válido
    }
  } else {
    // Buscar con guiones (formato: XX-XXXXXXXX-X)
    const cuitMatchFormato = concepto.match(/(\d{2}-?\d{8}-?\d{1})/);
    if (cuitMatchFormato) {
      cuit = normalizarCUITCUIL(cuitMatchFormato[1]);
      // Validar que tenga exactamente 11 dígitos después de normalizar
      if (cuit.length === 11) {
        // Extraer DNI del CUIT/CUIL (prioridad)
        dni = extraerDNIDeCUITCUIL(cuit);
      } else {
        cuit = null; // No es válido
      }
    }
  }

  // 2. Buscar DNI independiente solo si no se encontró CUIT/CUIL
  // O si el DNI extraído del CUIT no es válido
  if (!dni) {
    const dniMatch = concepto.match(/\b(\d{7,8})\b/);
    if (dniMatch) {
      const dniCandidato = normalizarDNI(dniMatch[1]);
      // Validar que tenga 7 u 8 dígitos
      if (dniCandidato.length >= 7 && dniCandidato.length <= 8) {
        // Si hay un CUIT encontrado, verificar que el DNI no sea parte de él
        if (!cuit || !cuit.includes(dniCandidato)) {
          dni = dniCandidato;
        }
      }
    }
  }

  // Intentar extraer nombres comunes
  // Patrón típico: "APELLIDO NOMBRE" o "APELLIDO, NOMBRE"
  const partes = normalizado.split(/[,\-]/).map((p) => p.trim());

  // Si hay partes separadas, la primera podría ser apellido y la segunda nombre
  if (partes.length >= 2) {
    apellido = partes[0];
    nombre = partes[1];
  } else if (partes.length === 1) {
    // Intentar separar por espacios
    const palabras = partes[0].split(/\s+/).filter((p) => p.length > 1);
    if (palabras.length >= 2) {
      apellido = palabras[0];
      nombre = palabras.slice(1).join(' ');
    } else if (palabras.length === 1) {
      apellido = palabras[0];
    }
  }

  return {
    apellido: apellido || null,
    nombre: nombre || null,
    cuit: cuit || null,
    dni: dni || null,
  };
}

