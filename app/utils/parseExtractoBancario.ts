/**
 * Parser para extractos bancarios en formato .txt
 * 
 * Extrae información de movimientos bancarios desde archivos de texto
 * IMPORTANTE: Solo procesa INGRESOS (movimientos con saldo positivo)
 * Descarta automáticamente todos los egresos, impuestos, comisiones, etc.
 */

import { LineaExtracto, MovimientoProcesado } from '@/app/types/movimientos_bancarios';
import { extraerNombreDelConcepto, normalizarTexto, normalizarCUITCUIL, normalizarDNI } from './normalizarTexto';

/**
 * Limpia el contenido del archivo eliminando encabezados, líneas de saldo y contenido no relevante
 * Solo deja líneas de movimientos con formato válido (fecha + tabulaciones)
 */
function limpiarContenido(contenido: string): string {
  const lineas = contenido.split(/\r?\n/);
  const lineasLimpias: string[] = [];

  // Palabras clave que indican líneas a eliminar (encabezados)
  const palabrasClaveEliminar = [
    'Movimientos del',
    'Cuenta Corriente',
    'Saldo al',
    'Últimos Movimientos',
    'últimos movimientos',
    'Fecha\tSuc', // Encabezado de columnas
  ];

  // Patrones que indican líneas de saldo, encabezados o timestamps
  const patronesEliminar = [
    /^Saldo al/i,
    /^Fecha\s+Suc\./i,
    /^Fecha\s+Suc\. Origen/i,
    /^\s*$/, // Líneas vacías
    /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/, // Timestamps como "12/11/2025 19:09"
  ];

  for (const linea of lineas) {
    const limpia = linea.trim();
    
    // Saltar líneas vacías
    if (!limpia) continue;

    // Verificar si contiene palabras clave a eliminar
    const contieneClaveEliminar = palabrasClaveEliminar.some(clave => 
      limpia.includes(clave)
    );
    
    if (contieneClaveEliminar) continue;

    // Verificar patrones a eliminar
    const coincidePatronEliminar = patronesEliminar.some(patron => 
      patron.test(limpia)
    );
    
    if (coincidePatronEliminar) continue;

    // Verificar si es la línea de encabezado de columnas (contiene "Fecha" y "Suc. Origen" al inicio)
    if (limpia.includes('Suc. Origen') || limpia.includes('Desc. Sucursal') || 
        limpia.includes('Cod. Operativo') || limpia.includes('Referencia') ||
        limpia.includes('Importe Pesos') || limpia.includes('Saldo Pesos')) {
      continue;
    }

    // Solo incluir líneas que parezcan ser movimientos válidos:
    // - Deben comenzar con una fecha (DD/MM/YYYY)
    // - Deben tener tabulaciones (formato del banco)
    const tieneFecha = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(limpia);
    const tieneTab = limpia.includes('\t');
    
    if (tieneFecha && tieneTab) {
      // Descartar egresos desde la limpieza (antes de parsear)
      // Si el importe es negativo, no procesar la línea
      const partes = limpia.split(/\t+/);
      if (partes.length >= 7) {
        const importeStr = partes[6]?.trim() || '';
        // Verificar si el importe es negativo
        if (importeStr.startsWith('-')) {
          continue; // Descartar egresos antes de parsear
        }
      }
      
      lineasLimpias.push(limpia);
    }
  }

  return lineasLimpias.join('\n');
}

/**
 * Parsea el contenido de un archivo de extracto bancario
 * Primero limpia el contenido, luego parsea SOLO INGRESOS (movimientos con saldo positivo)
 * Retorna un array de líneas extraídas (solo transferencias recibidas/ingresos de dinero)
 */
export function parsearExtracto(contenido: string): LineaExtracto[] {
  // Limpiar el contenido antes de procesar
  const contenidoLimpio = limpiarContenido(contenido);
  
  const lineas = contenidoLimpio.split(/\r?\n/).filter((linea) => linea.trim().length > 0);
  const movimientos: LineaExtracto[] = [];

  for (const linea of lineas) {
    try {
      const movimiento = parsearLinea(linea);
      if (movimiento) {
        movimientos.push(movimiento);
      }
    } catch (error) {
      console.error('Error al parsear línea:', linea, error);
      // Continuar con la siguiente línea
    }
  }

  return movimientos;
}

/**
 * Parsea una línea individual del extracto bancario
 * 
 * Formato esperado (separado por tabulaciones):
 * Fecha | Suc. Origen | Desc. Sucursal | Cod. Operativo | Referencia | Concepto | Importe Pesos | Saldo Pesos
 * 
 * Solo procesa movimientos con Importe Pesos positivo (transferencias recibidas)
 */
function parsearLinea(linea: string): LineaExtracto | null {
  // Limpiar la línea
  const limpia = linea.trim();

  if (!limpia) return null;

  // Dividir por tabulaciones (formato del banco)
  const partes = limpia.split(/\t+/);

  // Necesitamos al menos 7 columnas (las columnas son 0-indexed)
  // Columna 0: Fecha
  // Columna 4: Referencia
  // Columna 5: Concepto
  // Columna 6: Importe Pesos
  if (partes.length < 7) {
    return null;
  }

  // Extraer fecha (columna 0) - formato DD/MM/YYYY
  const fechaStr = partes[0].trim();
  if (!fechaStr || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
    return null;
  }

  let fecha: string;
  try {
    fecha = normalizarFecha(fechaStr);
  } catch (error) {
    return null;
  }

  // Extraer referencia bancaria (columna 4)
  const referenciaStr = partes[4]?.trim() || '';
  const referencia = referenciaStr || null;

  // Extraer concepto (columna 5)
  const concepto = partes[5]?.trim() || '';
  if (!concepto) {
    return null;
  }

  // Extraer Importe Pesos (columna 6)
  const importeStr = partes[6]?.trim() || '';
  if (!importeStr) {
    return null;
  }

  // Parsear monto (puede tener formato: 28.000,00 o -504)
  // Remover puntos de miles, convertir coma a punto decimal
  const montoStr = importeStr.replace(/\./g, '').replace(',', '.');
  const monto = parseFloat(montoStr);

  // VALIDACIÓN CRÍTICA: Solo procesar INGRESOS (movimientos con saldo POSITIVO)
  // Todos los egresos se descartan automáticamente:
  // - Impuestos, comisiones, débitos automáticos
  // - Transferencias realizadas (pagos salientes)
  // - Cualquier movimiento con monto negativo o cero
  if (isNaN(monto) || monto <= 0) {
    return null; // Descartar: no es un ingreso
  }

  // Verificar que el concepto NO indique un egreso (aunque tenga monto positivo)
  const conceptoUpper = concepto.toUpperCase();
  
  // Descartar explícitamente cualquier tipo de egreso
  const esEgreso = 
    conceptoUpper.includes('TRANSFERENCIA REALIZADA') ||
    conceptoUpper.includes('TRANSFERENCIA ENVIADA') ||
    conceptoUpper.includes('DEBITO AUTOMATICO') ||
    conceptoUpper.includes('DÉBITO AUTOMÁTICO') ||
    conceptoUpper.includes('IMPuesto') ||
    conceptoUpper.includes('IMPUESTO') ||
    conceptoUpper.includes('COMISION') ||
    conceptoUpper.includes('COMISIÓN') ||
    conceptoUpper.includes('DEBITO TRANSF') ||
    conceptoUpper.includes('DÉBITO TRANSF') ||
    conceptoUpper.startsWith('-'); // Si empieza con guión, es un egreso

  if (esEgreso) {
    return null; // Descartar: es un egreso
  }

  // Si llegamos aquí, es un ingreso válido:
  // - Tiene monto positivo
  // - No es un egreso explícito
  // - Tiene fecha, concepto y referencia
  
  // Validación final: debe tener fecha, concepto y monto positivo
  if (!fecha || !concepto || monto <= 0) {
    return null;
  }

  return {
    fecha,
    concepto,
    monto,
    referencia,
    tipo_movimiento: 'transferencia_recibida', // Siempre es un ingreso si llegamos aquí
  };
}

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 */
function normalizarFecha(fechaStr: string): string {
  // Intentar diferentes formatos
  // DD/MM/YYYY o DD-MM-YYYY
  const partes = fechaStr.split(/[\/\-]/);
  
  if (partes.length !== 3) {
    throw new Error('Formato de fecha inválido');
  }

  let dia = parseInt(partes[0]);
  let mes = parseInt(partes[1]);
  let anio = parseInt(partes[2]);

  // Si el año tiene 2 dígitos, asumir 2000-2099
  if (anio < 100) {
    anio += 2000;
  }

  // Validar rango
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    throw new Error('Fecha fuera de rango válido');
  }

  return `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

/**
 * Procesa una línea del extracto y extrae información estructurada
 */
export function procesarMovimiento(linea: LineaExtracto): MovimientoProcesado {
  const datosConcepto = extraerNombreDelConcepto(linea.concepto);

  return {
    fecha_movimiento: linea.fecha,
    apellido_transferente: datosConcepto.apellido,
    nombre_transferente: datosConcepto.nombre,
    cuit_cuil: datosConcepto.cuit,
    dni: datosConcepto.dni,
    monto: linea.monto,
    referencia_bancaria: linea.referencia,
    concepto_completo: linea.concepto,
  };
}

/**
 * Filtra solo las transferencias recibidas de un array de líneas
 */
export function filtrarTransferenciasRecibidas(movimientos: LineaExtracto[]): LineaExtracto[] {
  return movimientos.filter(
    (m) => m.tipo_movimiento === 'transferencia_recibida' && m.monto > 0
  );
}

