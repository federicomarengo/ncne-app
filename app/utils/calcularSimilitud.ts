/**
 * Algoritmos de similitud de texto para matching
 */

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * Retorna un número entre 0 (idénticos) y max(longitud1, longitud2)
 */
export function distanciaLevenshtein(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];

  // Inicializar primera fila y columna
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Llenar la matriz
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Eliminación
        matrix[i][j - 1] + 1, // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calcula el porcentaje de similitud entre dos strings usando Levenshtein
 * Retorna un número entre 0 (sin similitud) y 100 (idénticos)
 */
export function porcentajeSimilitud(str1: string, str2: string): number {
  if (!str1 && !str2) return 100;
  if (!str1 || !str2) return 0;

  const distancia = distanciaLevenshtein(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);

  if (maxLen === 0) return 100;

  const similitud = ((maxLen - distancia) / maxLen) * 100;
  return Math.round(similitud * 100) / 100; // Redondear a 2 decimales
}

/**
 * Calcula la similitud entre dos nombres completos
 * Considera que los nombres pueden estar en diferente orden
 */
export function similitudNombreCompleto(
  apellido1: string | null,
  nombre1: string | null,
  apellido2: string | null,
  nombre2: string | null
): number {
  const a1 = apellido1 || '';
  const n1 = nombre1 || '';
  const a2 = apellido2 || '';
  const n2 = nombre2 || '';

  if (!a1 && !n1 && !a2 && !n2) return 100;
  if (!a1 && !n1) return 0;
  if (!a2 && !n2) return 0;

  const nombreCompleto1 = `${a1} ${n1}`.trim();
  const nombreCompleto2 = `${a2} ${n2}`.trim();

  // Similitud exacta
  if (nombreCompleto1 === nombreCompleto2) return 100;

  // Similitud por partes (apellido y nombre por separado)
  const similitudApellido = porcentajeSimilitud(a1, a2);
  const similitudNombre = porcentajeSimilitud(n1, n2);

  // Peso: apellido 60%, nombre 40%
  const promedioPonderado = similitudApellido * 0.6 + similitudNombre * 0.4;

  // También considerar el nombre completo en caso de orden invertido
  const similitudCompleto = porcentajeSimilitud(nombreCompleto1, nombreCompleto2);
  const similitudInvertido = porcentajeSimilitud(
    nombreCompleto1,
    `${n2} ${a2}`.trim()
  );

  // Retornar el mayor de todos
  return Math.max(promedioPonderado, similitudCompleto, similitudInvertido);
}

/**
 * Determina si un porcentaje de similitud es suficiente para considerar un match
 */
export function esMatchSuficiente(porcentaje: number, nivel: 'A' | 'B' | 'C' | 'D' | 'E'): boolean {
  const umbrales = {
    A: 100, // Match exacto
    B: 95,
    C: 98,
    D: 85,
    E: 60, // Mínimo para Levenshtein
  };

  return porcentaje >= umbrales[nivel];
}





