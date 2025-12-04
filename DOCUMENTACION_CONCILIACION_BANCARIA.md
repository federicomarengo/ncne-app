# Documentación: Sistema de Conciliación Bancaria

## Índice

1. [Introducción](#introducción)
2. [Proceso de Parsing del Extracto Bancario](#proceso-de-parsing-del-extracto-bancario)
3. [Extracción de Datos del Concepto](#extracción-de-datos-del-concepto)
4. [Sistema de Matching Inteligente](#sistema-de-matching-inteligente)
5. [Niveles de Matching](#niveles-de-matching)
6. [Algoritmos de Similitud](#algoritmos-de-similitud)
7. [Ejemplos Prácticos](#ejemplos-prácticos)
8. [Flujo Completo del Proceso](#flujo-completo-del-proceso)

---

## Introducción

El sistema de conciliación bancaria permite procesar automáticamente los extractos bancarios en formato `.txt` para identificar qué transferencias recibidas corresponden a qué socios del club. El sistema utiliza un algoritmo de matching inteligente de 6 niveles que prioriza la exactitud y minimiza los falsos positivos.

### Características Principales

- ✅ **Parsing automático** de extractos bancarios en formato `.txt`
- ✅ **Filtrado automático** de solo ingresos (descartando egresos)
- ✅ **Extracción inteligente** de datos del concepto bancario
- ✅ **Matching jerárquico** de 6 niveles con diferentes porcentajes de confianza
- ✅ **Detección de duplicados** por referencia bancaria
- ✅ **Revisión manual** para casos sin match o baja confianza

---

## Proceso de Parsing del Extracto Bancario

### Formato del Extracto

El sistema espera extractos bancarios en formato de texto plano con columnas separadas por tabulaciones:

```
Fecha | Suc. Origen | Desc. Sucursal | Cod. Operativo | Referencia | Concepto | Importe Pesos | Saldo Pesos
```

**Ejemplo:**
```
11/11/2025	0	Casa Central	4805	266931	Transferencia Recibida  - De Costa, Oscar Daniel / - Var / 20115274059	84.000,00	17.550.898,21
```

### Limpieza del Archivo

Antes de procesar, el sistema limpia automáticamente el archivo:

1. **Elimina encabezados:**
   - "Movimientos del Día"
   - "Cuenta Corriente"
   - "Últimos Movimientos"
   - Líneas de encabezado de columnas

2. **Elimina líneas no relevantes:**
   - Líneas de saldo ("Saldo al...")
   - Timestamps ("12/11/2025 19:09")
   - Líneas vacías

3. **Descarta egresos desde la limpieza:**
   - Cualquier línea con importe negativo (columna 6) se descarta inmediatamente
   - No se procesan: impuestos, comisiones, transferencias enviadas, débitos automáticos

### Proceso de Parsing

El parser extrae las siguientes columnas:

- **Columna 0:** Fecha (formato DD/MM/YYYY)
- **Columna 4:** Referencia bancaria (para detección de duplicados)
- **Columna 5:** Concepto (de aquí se extrae nombre, CUIT, DNI)
- **Columna 6:** Importe Pesos (solo procesa valores positivos)

### Validaciones

- ✅ Solo procesa movimientos con **importe positivo** (ingresos)
- ✅ Valida formato de fecha (DD/MM/YYYY)
- ✅ Descarta movimientos con concepto de egreso explícito

---

## Extracción de Datos del Concepto

Del campo "Concepto" del extracto bancario, el sistema extrae:

1. **Apellido y Nombre**
2. **CUIT/CUIL** (si está presente)
3. **DNI** (si está presente)

### Proceso de Extracción

#### Paso 1: Normalización del Texto

El concepto se normaliza para facilitar la extracción:

```
"Transferencia Recibida - De Costa, Oscar Daniel / - Var / 20115274059"
```

**Normalización:**
- Convierte a mayúsculas
- Remueve acentos
- Normaliza espacios múltiples
- Remueve caracteres especiales (excepto espacios)

```
→ "TRANSFERENCIA RECIBIDA DE COSTA OSCAR DANIEL VAR 20115274059"
```

#### Paso 2: Extracción de CUIT/CUIL (PRIORIDAD)

**IMPORTANTE:** El sistema prioriza números de **11 dígitos** (CUIT/CUIL) sobre otros números.

Busca el patrón: `\b\d{11}\b` (11 dígitos con word boundaries para aislarlo)

**Ejemplos:**
- `20-11527405-9` → Extrae: `20115274059`
- `20115274059` → Extrae: `20115274059`
- `20271854421` → Extrae: `20271854421` (11 dígitos)

**Caso especial con múltiples números:**
```
Concepto: "Transferencia Recibida - De Vollenweider/guillermo / 0027185442 - Var / 20271854421"
```
- Número `0027185442` (10 dígitos) → **IGNORADO** (no es CUIT/CUIL)
- Número `20271854421` (11 dígitos) → **EXTRAÍDO** (es CUIT/CUIL)

**Código:**
```javascript
// Primero buscar sin guiones (11 dígitos con word boundaries)
const cuitMatch11 = concepto.match(/\b(\d{11})\b/);
if (cuitMatch11) {
  cuit = normalizarCUITCUIL(cuitMatch11[1]);
  // Extraer DNI del CUIT/CUIL (prioridad)
  dni = extraerDNIDeCUITCUIL(cuit);
} else {
  // Buscar con guiones (formato: XX-XXXXXXXX-X)
  const cuitMatchFormato = concepto.match(/(\d{2}-?\d{8}-?\d{1})/);
}
```

#### Paso 3: Extracción de DNI

**Prioridad:** Si se encontró CUIT/CUIL, se extrae el DNI de él (posiciones 2-9, 8 dígitos).

Si no hay CUIT/CUIL, busca DNI independiente de 7-8 dígitos.

**Extracción desde CUIT/CUIL:**
- CUIT: `20271854421` → DNI extraído: `27185442` (posiciones 2-9)
- CUIT: `27253428630` → DNI extraído: `25342863` (posiciones 2-9)

**Extracción de DNI independiente:**
- Solo se busca si NO se encontró CUIT/CUIL
- Busca el patrón: `\b\d{7,8}\b` (7-8 dígitos con word boundaries)
- Excluye números que sean parte de un CUIT/CUIL ya detectado

**Ejemplos:**
- `20115274` → Extrae: `20115274`
- `20.115.274` → Normaliza a: `20115274`

**Código:**
```javascript
// Si hay CUIT/CUIL, extraer DNI de él (prioridad)
if (cuit && cuit.length === 11) {
  dni = extraerDNIDeCUITCUIL(cuit); // Posiciones 2-9
}

// Si no hay DNI del CUIT, buscar DNI independiente
if (!dni) {
  const dniMatch = concepto.match(/\b(\d{7,8})\b/);
  // Validar que no sea parte del CUIT ya encontrado
}
```

#### Paso 4: Extracción de Nombre

Busca patrones comunes en conceptos bancarios:

1. **Patrón con comas:** `"APELLIDO, NOMBRE"`
   ```
   "Costa, Oscar Daniel"
   → Apellido: "COSTA", Nombre: "OSCAR DANIEL"
   ```

2. **Patrón con "De":** `"De APELLIDO, NOMBRE"`
   ```
   "De Costa, Oscar Daniel"
   → Apellido: "COSTA", Nombre: "OSCAR DANIEL"
   ```

3. **Patrón separado por guiones:** `"APELLIDO - NOMBRE"`
   ```
   "Martinelli/veronica"
   → Apellido: "MARTINELLI", Nombre: "VERONICA"
   ```

**Resultado de Extracción:**

**Ejemplo 1: Con CUIT/CUIL**
```javascript
// Concepto: "Transferencia Recibida - De Martinelli/veronica / - Var / 27253428630"
{
  apellido: "MARTINELLI",
  nombre: "VERONICA",
  cuit_cuil: "27253428630",  // CUIT/CUIL de 11 dígitos encontrado
  dni: "25342863"            // DNI extraído del CUIT/CUIL (posiciones 2-9)
}
```

**Ejemplo 2: Con múltiples números (prioriza 11 dígitos)**
```javascript
// Concepto: "Transferencia Recibida - De Vollenweider/guillermo / 0027185442 - Var / 20271854421"
{
  apellido: "VOLLENWEIDER",
  nombre: "GUILLERMO",
  cuit_cuil: "20271854421",  // CUIT/CUIL de 11 dígitos (prioridad)
  dni: "27185442"            // DNI extraído del CUIT/CUIL
  // Nota: El número "0027185442" es ignorado (no es CUIT ni DNI válido)
}
```

**Ejemplo 3: Solo DNI independiente**
```javascript
// Concepto: "Transferencia Recibida - De Costa, Oscar Daniel / - Var / 20115274"
{
  apellido: "COSTA",
  nombre: "OSCAR DANIEL",
  cuit_cuil: null,  // No se encontró CUIT/CUIL
  dni: "20115274"   // DNI independiente encontrado
}
```

---

## Sistema de Matching Inteligente

El sistema utiliza un algoritmo jerárquico de **6 niveles** que se ejecuta en orden de prioridad. El proceso se detiene en el primer nivel que encuentra una coincidencia.

### Orden de Ejecución

```
1. Nivel A (100% confianza)  → Match por CUIT/CUIL exacto
2. Nivel B (95% confianza)   → Match por DNI exacto
3. Nivel C (98% confianza)   → Match bidireccional por CUIL generado
4. Nivel D (85% confianza)   → Match por nombre completo
5. Nivel E (60-80% confianza) → Match por similitud Levenshtein
6. Nivel F (0% confianza)    → Sin match (requiere revisión manual)
```

### Lógica de Detención

```javascript
// Se intenta cada nivel en orden
const matchA = await matchNivelA(movimiento);
if (matchA.socio_id) return matchA; // ✅ Detiene aquí si encuentra match

const matchB = await matchNivelB(movimiento);
if (matchB.socio_id) return matchB; // ✅ Detiene aquí si encuentra match

// ... y así sucesivamente
```

---

## Niveles de Matching

### 🔴 Nivel A: Match por CUIT/CUIL Exacto

**Confianza:** 100%  
**Prioridad:** 1 (más alta)

#### Qué se Compara

- CUIT/CUIL normalizado del movimiento bancario
- vs. CUIT/CUIL en la base de datos de socios

#### Proceso

1. **Normalización del CUIT/CUIL:**
   - Remueve guiones, espacios, puntos
   - `20-11527405-9` → `20115274059`
   - `20.115.274.05-9` → `20115274059`

2. **Validación:**
   - Verifica que tenga 11 dígitos (formato estándar argentino)

3. **Búsqueda en Base de Datos:**
   ```sql
   SELECT id, apellido, nombre, cuit_cuil 
   FROM socios 
   WHERE cuit_cuil = '20115274059'
   LIMIT 1
   ```

4. **Resultado:**
   - Si encuentra coincidencia exacta → **Match A con 100% de confianza**
   - Si no encuentra → Continúa al siguiente nivel

#### Ejemplo

**Movimiento:**
```javascript
{
  concepto: "Transferencia Recibida - De Costa, Oscar / 20115274059",
  cuit_cuil: "20115274059"  // Extraído del concepto
}
```

**Socio en BD:**
```javascript
{
  id: 123,
  apellido: "Costa",
  nombre: "Oscar Daniel",
  cuit_cuil: "20115274059"
}
```

**Resultado:**
```javascript
{
  socio_id: 123,
  nivel: 'A',
  porcentaje_confianza: 100,
  razon: 'Match exacto por CUIT/CUIL: 20115274059',
  nombre_completo: 'Costa Oscar Daniel'
}
```

---

### 🟠 Nivel B: Match por DNI Exacto

**Confianza:** 95%  
**Prioridad:** 2

#### Qué se Compara

- DNI normalizado del movimiento bancario
- vs. DNI en la base de datos de socios
- **Además:** Valida similitud de nombres (mínimo 50%)

#### Proceso

1. **Normalización del DNI:**
   - Remueve puntos, espacios, guiones
   - `20.115.274` → `20115274`
   - `20-115-274` → `20115274`

2. **Validación:**
   - Verifica que tenga 7 u 8 dígitos (formato estándar argentino)

3. **Búsqueda en Base de Datos:**
   ```sql
   SELECT id, apellido, nombre, dni 
   FROM socios 
   WHERE dni = '20115274'
   LIMIT 1
   ```

4. **Validación de Nombre:**
   - Si encuentra coincidencia de DNI, valida que los nombres tengan al menos 50% de similitud
   - Normaliza ambos nombres y calcula similitud
   - Si similitud < 50% → Descarta (posible error en DNI)

5. **Resultado:**
   - Si DNI coincide y nombre es válido → **Match B con 95% de confianza**
   - Si no → Continúa al siguiente nivel

#### Ejemplo

**Movimiento:**
```javascript
{
  concepto: "Transferencia Recibida - De Costa, Oscar Daniel / 20115274",
  dni: "20115274",
  apellido_transferente: "COSTA",
  nombre_transferente: "OSCAR DANIEL"
}
```

**Socio en BD:**
```javascript
{
  id: 123,
  apellido: "Costa",
  nombre: "Oscar Daniel",
  dni: "20115274"
}
```

**Validación de Nombre:**
```
Nombre movimiento: "COSTA OSCAR DANIEL"
Nombre socio: "Costa Oscar Daniel"
→ Similitud: 100% ✅
```

**Resultado:**
```javascript
{
  socio_id: 123,
  nivel: 'B',
  porcentaje_confianza: 95,
  razon: 'Match exacto por DNI: 20115274',
  nombre_completo: 'Costa Oscar Daniel'
}
```

---

### 🟡 Nivel C: Match Bidireccional por CUIL Generado

**Confianza:** 98%  
**Prioridad:** 3

#### Qué se Compara

- Genera CUIL desde DNI del movimiento
- Compara con CUIT/CUIL del socio en la base de datos
- Validación bidireccional (en ambos sentidos)

#### Proceso

1. **Requiere:**
   - DNI en el movimiento bancario
   - CUIT/CUIL en el socio de la base de datos

2. **Generación de CUIL:**
   - Toma el DNI del movimiento: `20115274`
   - Genera CUIL teórico: `20-20115274-X`
   - Compara con CUIT del socio: `20-20115274-9`

3. **Validación Bidireccional:**
   - Verifica que el DNI del movimiento coincida con el DNI del socio
   - Verifica que el CUIT del socio contenga el DNI del movimiento

4. **Resultado:**
   - Si ambas validaciones pasan → **Match C con 98% de confianza**
   - Si no → Continúa al siguiente nivel

#### Ejemplo

**Movimiento:**
```javascript
{
  dni: "20115274",
  cuit_cuil: null  // No viene en el concepto
}
```

**Socio en BD:**
```javascript
{
  id: 123,
  dni: "20115274",
  cuit_cuil: "20115274059"  // Contiene el DNI
}
```

**Validación:**
```
DNI movimiento: "20115274"
DNI socio: "20115274"
→ Coinciden ✅

CUIL generado desde DNI: "20-20115274-X"
CUIT socio: "20-20115274-9"
→ El DNI está en el medio del CUIT ✅
```

**Resultado:**
```javascript
{
  socio_id: 123,
  nivel: 'C',
  porcentaje_confianza: 98,
  razon: 'Match bidireccional por CUIL generado desde DNI: 20115274',
  nombre_completo: 'Costa Oscar Daniel'
}
```

---

### 🟢 Nivel D: Match por Nombre Completo

**Confianza:** 85-100% (según similitud)  
**Prioridad:** 4

#### Qué se Compara

- Apellido + Nombre normalizados del movimiento
- vs. Apellido + Nombre de todos los socios en la base de datos
- Usa algoritmo de similitud ponderada

#### Proceso

1. **Normalización:**
   - Normaliza apellido y nombre del movimiento
   - Normaliza apellido y nombre de cada socio

2. **Cálculo de Similitud Ponderada:**
   ```
   Similitud = (Similitud Apellido × 60%) + (Similitud Nombre × 40%)
   ```

3. **Validaciones Adicionales:**
   - También prueba orden invertido (nombre, apellido)
   - Compara nombre completo normalizado

4. **Umbral Mínimo:**
   - Requiere **mínimo 85% de similitud** para aceptar

5. **Resultado:**
   - Si encuentra match con ≥85% → **Match D con confianza = similitud calculada**
   - Si no → Continúa al siguiente nivel

#### Ejemplo: Match Exacto

**Movimiento:**
```javascript
{
  apellido_transferente: "COSTA",
  nombre_transferente: "OSCAR DANIEL"
}
```

**Socio en BD:**
```javascript
{
  id: 123,
  apellido: "Costa",
  nombre: "Oscar Daniel"
}
```

**Cálculo:**
```
Apellido: "COSTA" vs "COSTA" → Similitud: 100%
Nombre: "OSCAR DANIEL" vs "OSCAR DANIEL" → Similitud: 100%

Similitud ponderada = (100% × 0.6) + (100% × 0.4) = 100%
```

**Resultado:**
```javascript
{
  socio_id: 123,
  nivel: 'D',
  porcentaje_confianza: 100,
  razon: 'Match por nombre completo: 100% de similitud',
  nombre_completo: 'Costa Oscar Daniel'
}
```

#### Ejemplo: Match Parcial

**Movimiento:**
```javascript
{
  apellido_transferente: "MARTINELLI",
  nombre_transferente: "VERONICA"
}
```

**Socio en BD:**
```javascript
{
  id: 456,
  apellido: "Martinelli",
  nombre: "Verónica"
}
```

**Cálculo:**
```
Apellido: "MARTINELLI" vs "MARTINELLI" → Similitud: 100%
Nombre: "VERONICA" vs "VERONICA" → Similitud: 100%

Similitud ponderada = (100% × 0.6) + (100% × 0.4) = 100%
```

**Resultado:**
```javascript
{
  socio_id: 456,
  nivel: 'D',
  porcentaje_confianza: 100,
  razon: 'Match por nombre completo: 100% de similitud',
  nombre_completo: 'Martinelli Verónica'
}
```

#### Ejemplo: Nombre Incompleto (Rechazado)

**Movimiento:**
```javascript
{
  apellido_transferente: "COSTA",
  nombre_transferente: "OSCAR DANIEL"
}
```

**Socio en BD:**
```javascript
{
  id: 123,
  apellido: "Costa",
  nombre: "Oscar"  // Nombre incompleto
}
```

**Cálculo:**
```
Apellido: "COSTA" vs "COSTA" → Similitud: 100%
Nombre: "OSCAR DANIEL" vs "OSCAR" → Similitud: 60%

Similitud ponderada = (100% × 0.6) + (60% × 0.4) = 84%
```

**Resultado:**
```javascript
{
  socio_id: null,
  nivel: 'D',
  porcentaje_confianza: 0,
  razon: 'No se encontró match por nombre completo'
}
// ❌ No alcanza el umbral de 85%, continúa al siguiente nivel
```

---

### 🔵 Nivel E: Match por Similitud Levenshtein

**Confianza:** 60-80% (según similitud)  
**Prioridad:** 5

#### Qué se Compara

- Solo apellido del movimiento bancario
- vs. Apellido de todos los socios en la base de datos
- Usa algoritmo de distancia de Levenshtein

#### Algoritmo de Levenshtein

La distancia de Levenshtein calcula la cantidad mínima de ediciones (insertar, eliminar, sustituir caracteres) necesarias para convertir un string en otro.

**Cálculo de Similitud:**
```
Similitud = ((Longitud Máxima - Distancia) / Longitud Máxima) × 100
```

#### Proceso

1. **Normalización:**
   - Normaliza solo el apellido del movimiento
   - Normaliza apellido de cada socio

2. **Cálculo de Distancia:**
   - Calcula distancia de Levenshtein entre apellidos
   - Convierte a porcentaje de similitud

3. **Rango de Aceptación:**
   - Requiere similitud entre **60% y 80%** para aceptar
   - Si es > 80% → Debería ser nivel D (se descarta)
   - Si es < 60% → Muy baja confianza (se descarta)

4. **Resultado:**
   - Si encuentra match en rango válido → **Match E con confianza = similitud calculada**
   - Si no → Continúa al siguiente nivel

#### Ejemplo: Match Válido

**Movimiento:**
```javascript
{
  apellido_transferente: "GONZALEZ"
}
```

**Socio en BD:**
```javascript
{
  id: 789,
  apellido: "Gonzáles"  // Con 's' al final
}
```

**Cálculo:**
```
Apellido movimiento: "GONZALEZ" (8 caracteres)
Apellido socio: "GONZALES" (8 caracteres)

Distancia de Levenshtein:
- 'Z' → 'S' (sustitución): 1 edición

Similitud = ((8 - 1) / 8) × 100 = 87.5%
```

**Resultado:**
```javascript
{
  socio_id: 789,
  nivel: 'E',
  porcentaje_confianza: 88,  // Redondeado
  razon: 'Match por similitud de apellido: 88%',
  nombre_completo: 'Gonzáles Juan'
}
```

#### Ejemplo: Match Rechazado (Muy Alta Similitud)

**Movimiento:**
```javascript
{
  apellido_transferente: "MARTINELLI"
}
```

**Socio en BD:**
```javascript
{
  id: 456,
  apellido: "Martinelli"
}
```

**Cálculo:**
```
Apellido movimiento: "MARTINELLI" (10 caracteres)
Apellido socio: "MARTINELLI" (10 caracteres)

Distancia de Levenshtein: 0
Similitud = ((10 - 0) / 10) × 100 = 100%
```

**Resultado:**
```javascript
{
  socio_id: null,
  nivel: 'E',
  porcentaje_confianza: 0,
  razon: 'No se encontró match por similitud'
}
// ❌ Similitud > 80%, debería haber sido nivel D (no se procesó correctamente)
```

---

### ⚪ Nivel F: Sin Match

**Confianza:** 0%  
**Prioridad:** 6 (último)

#### Qué Significa

- No se encontró coincidencia con ningún socio en ningún nivel anterior
- El movimiento requiere **revisión manual**
- Se marca con estado `nuevo` y nivel de match `F`

#### Proceso

1. Si ningún nivel anterior encontró match, se marca como nivel F
2. El movimiento queda pendiente de revisión manual
3. Un usuario puede asignar manualmente el socio desde la interfaz

#### Ejemplo

**Movimiento:**
```javascript
{
  concepto: "Transferencia Recibida - De Fulano, Desconocido / 12345678",
  apellido_transferente: "FULANO",
  nombre_transferente: "DESCONOCIDO",
  dni: "12345678"
}
```

**Validaciones:**
- ❌ Nivel A: No tiene CUIT/CUIL
- ❌ Nivel B: DNI no existe en la base de datos
- ❌ Nivel C: No se puede generar CUIL válido
- ❌ Nivel D: Nombre no coincide con ningún socio
- ❌ Nivel E: Apellido no tiene similitud suficiente

**Resultado:**
```javascript
{
  socio_id: null,
  nivel: 'F',
  porcentaje_confianza: 0,
  razon: 'No se encontró coincidencia con ningún socio'
}
```

---

## Algoritmos de Similitud

### Normalización de Texto

Todos los textos se normalizan antes de comparar:

```javascript
function normalizarTexto(texto) {
  return texto
    .trim()
    .toUpperCase()
    .normalize('NFD')  // Descompone acentos
    .replace(/[\u0300-\u036f]/g, '')  // Remueve acentos
    .replace(/\s+/g, ' ')  // Normaliza espacios múltiples
    .replace(/[^A-Z0-9\s]/g, '')  // Remueve caracteres especiales
    .trim();
}
```

**Ejemplos:**
- `"José María"` → `"JOSE MARIA"`
- `"González"` → `"GONZALEZ"`
- `"  Pérez   López  "` → `"PEREZ LOPEZ"`

### Distancia de Levenshtein

Algoritmo que calcula la cantidad mínima de ediciones necesarias para convertir un string en otro.

**Operaciones:**
1. **Inserción:** Agregar un carácter
2. **Eliminación:** Quitar un carácter
3. **Sustitución:** Cambiar un carácter

**Ejemplo:**
```
String 1: "GONZALEZ"  (8 caracteres)
String 2: "GONZALES"  (8 caracteres)

Ediciones necesarias:
- 'Z' → 'S' (sustitución): 1 edición

Distancia = 1
Similitud = ((8 - 1) / 8) × 100 = 87.5%
```

### Similitud de Nombre Completo

Combina similitud de apellido y nombre con pesos:

```
Similitud Total = (Similitud Apellido × 60%) + (Similitud Nombre × 40%)
```

**Peso del Apellido (60%):**
- El apellido es más importante para identificar una persona
- Es menos probable que cambie o se escriba mal

**Peso del Nombre (40%):**
- El nombre puede tener variaciones (José, Jose; María, Maria)
- Es más flexible

**Ejemplo:**
```
Apellido movimiento: "COSTA"
Apellido socio: "COSTA"
→ Similitud apellido: 100%

Nombre movimiento: "OSCAR DANIEL"
Nombre socio: "OSCAR"
→ Similitud nombre: 60%

Similitud total = (100% × 0.6) + (60% × 0.4) = 84%
```

---

## Ejemplos Prácticos

### Ejemplo 1: Match Perfecto por CUIT

**Extracto Bancario:**
```
11/11/2025	0	Casa Central	4805	266931	Transferencia Recibida  - De Costa, Oscar Daniel / - Var / 20115274059	84.000,00	17.550.898,21
```

**Paso 1: Parsing**
- Fecha: `11/11/2025`
- Referencia: `266931`
- Concepto: `"Transferencia Recibida - De Costa, Oscar Daniel / - Var / 20115274059"`
- Importe: `84.000,00` ✅ (positivo, es ingreso)

**Paso 2: Extracción**
```javascript
{
  apellido: "COSTA",
  nombre: "OSCAR DANIEL",
  dni: "20115274",  // Extraído del CUIT
  cuit_cuil: "20115274059"  // Encontrado en concepto
}
```

**Paso 3: Matching**

1. **Nivel A:**
   - Busca CUIT `20115274059` en BD
   - ✅ Encuentra socio ID 123
   - **Match A - 100% confianza**

**Resultado Final:**
```javascript
{
  movimiento_id: 1,
  socio_id: 123,
  nivel_match: 'A',
  porcentaje_confianza: 100,
  estado: 'procesado'  // Se puede procesar automáticamente
}
```

---

### Ejemplo 1b: Extracción con Múltiples Números (Prioriza CUIT/CUIL de 11 dígitos)

**Extracto Bancario:**
```
5/11/2025	0	Casa Central	4805	99691720	Transferencia Recibida  - De Vollenweider/guillermo / 0027185442 - Var / 20271854421	108.000,00	16.588.376,17
```

**Paso 1: Parsing**
- Fecha: `5/11/2025`
- Referencia: `99691720`
- Concepto: `"Transferencia Recibida - De Vollenweider/guillermo / 0027185442 - Var / 20271854421"`
- Importe: `108.000,00` ✅ (positivo, es ingreso)

**Paso 2: Extracción (NUEVA LÓGICA)**

El concepto contiene **dos números**:
- `0027185442` (10 dígitos) - Número de referencia, **NO es CUIT/CUIL**
- `20271854421` (11 dígitos) - **ES CUIT/CUIL**, se toma como prioridad

**Proceso de extracción:**
1. Busca números de 11 dígitos con word boundaries: `\b\d{11}\b`
2. Encuentra: `20271854421` (11 dígitos) → Identifica como CUIT/CUIL
3. Extrae DNI del CUIT/CUIL: `27185442` (posiciones 2-9)
4. Ignora el número `0027185442` (no es CUIT ni DNI válido)

```javascript
{
  apellido: "VOLLENWEIDER",
  nombre: "GUILLERMO",
  cuit_cuil: "20271854421",  // CUIT/CUIL de 11 dígitos (prioridad)
  dni: "27185442"            // DNI extraído del CUIT/CUIL (posiciones 2-9)
  // Nota: El número "0027185442" es ignorado
}
```

**Paso 3: Matching**

1. **Nivel A:**
   - Busca CUIT `20271854421` en BD
   - ✅ Encuentra socio ID 789
   - **Match A - 100% confianza**

**Resultado Final:**
```javascript
{
  movimiento_id: 2,
  socio_id: 789,
  nivel_match: 'A',
  porcentaje_confianza: 100,
  estado: 'procesado'
}
```

---

### Ejemplo 2: Match por DNI con Validación de Nombre

**Extracto Bancario:**
```
10/11/2025	453	Santa Rosa	1257	8546323	Credito Transf Por Online Banking - De Raul Elziar Fissore / Varios - Cuo / 20124679150	106.400,00	17.477.697,75
```

**Paso 1: Extracción**
```javascript
{
  apellido: "FISSORE",
  nombre: "RAUL ELZIAR",
  dni: "20124679",  // Extraído del CUIT
  cuit_cuil: null
}
```

**Paso 2: Matching**

1. **Nivel A:**
   - No hay CUIT/CUIL explícito → ❌

2. **Nivel B:**
   - Busca DNI `20124679` en BD
   - ✅ Encuentra socio ID 456
   - Valida nombre:
     ```
     Nombre movimiento: "FISSORE RAUL ELZIAR"
     Nombre socio: "Fissore Raul Elziar"
     → Similitud: 100% ✅
     ```
   - **Match B - 95% confianza**

**Resultado Final:**
```javascript
{
  movimiento_id: 2,
  socio_id: 456,
  nivel_match: 'B',
  porcentaje_confianza: 95,
  estado: 'procesado'
}
```

---

### Ejemplo 3: Match por Nombre Completo

**Extracto Bancario:**
```
8/11/2025	0	Casa Central	4805	222626	Transferencia Recibida - De Perez Gilligan, Maria / Cuota Nov - Cuo / 27146117355	92.400,00	17.713.270,83
```

**Paso 1: Extracción**
```javascript
{
  apellido: "PEREZ GILLIGAN",
  nombre: "MARIA",
  dni: "27146117",  // Extraído del CUIT
  cuit_cuil: null
}
```

**Paso 2: Matching**

1. **Nivel A:** ❌ No hay CUIT/CUIL
2. **Nivel B:** ❌ DNI no coincide con ningún socio
3. **Nivel C:** ❌ No se puede validar bidireccionalmente
4. **Nivel D:**
   - Busca por nombre completo
   - Compara con todos los socios:
     ```
     "PEREZ GILLIGAN MARIA" vs "Perez Gilligan Maria"
     → Similitud: 100% ✅
     ```
   - **Match D - 100% confianza**

**Resultado Final:**
```javascript
{
  movimiento_id: 3,
  socio_id: 789,
  nivel_match: 'D',
  porcentaje_confianza: 100,
  estado: 'procesado'
}
```

---

### Ejemplo 4: Sin Match (Requiere Revisión Manual)

**Extracto Bancario:**
```
6/11/2025	0	Casa Central	4806	60706741	Transferencia Recibida - De David Javier Salvi / - Var / 20214041236	28.000,00	16.762.560,60
```

**Paso 1: Extracción**
```javascript
{
  apellido: "SALVI",
  nombre: "DAVID JAVIER",
  dni: "20214041",  // Extraído del CUIT
  cuit_cuil: null
}
```

**Paso 2: Matching**

1. **Nivel A:** ❌ No hay CUIT/CUIL
2. **Nivel B:** ❌ DNI no existe en BD
3. **Nivel C:** ❌ No se puede validar
4. **Nivel D:** ❌ Nombre no coincide (similitud < 85%)
5. **Nivel E:** ❌ Apellido no tiene similitud suficiente
6. **Nivel F:** ✅ Sin match

**Resultado Final:**
```javascript
{
  movimiento_id: 4,
  socio_id: null,
  nivel_match: 'F',
  porcentaje_confianza: 0,
  estado: 'nuevo',  // Requiere revisión manual
  razon: 'No se encontró coincidencia con ningún socio'
}
```

---

## Flujo Completo del Proceso

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────┐
│  1. Carga de Extracto Bancario (.txt)          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  2. Limpieza del Archivo                        │
│     - Eliminar encabezados                      │
│     - Eliminar líneas de saldo                  │
│     - Descartar egresos (importe negativo)      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  3. Parsing de Líneas                           │
│     - Extraer fecha                             │
│     - Extraer referencia bancaria               │
│     - Extraer concepto                          │
│     - Extraer importe                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  4. Extracción de Datos del Concepto            │
│     - Apellido y Nombre                         │
│     - CUIT/CUIL                                 │
│     - DNI                                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  5. Matching Jerárquico                         │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel A: CUIT/CUIL exacto (100%)   │    │
│     └──────────────┬──────────────────────┘    │
│                    │ NO                          │
│                    ▼                              │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel B: DNI exacto (95%)          │    │
│     └──────────────┬──────────────────────┘    │
│                    │ NO                          │
│                    ▼                              │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel C: CUIL generado (98%)       │    │
│     └──────────────┬──────────────────────┘    │
│                    │ NO                          │
│                    ▼                              │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel D: Nombre completo (85%)     │    │
│     └──────────────┬──────────────────────┘    │
│                    │ NO                          │
│                    ▼                              │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel E: Levenshtein (60-80%)      │    │
│     └──────────────┬──────────────────────┘    │
│                    │ NO                          │
│                    ▼                              │
│     ┌─────────────────────────────────────┐    │
│     │ Nivel F: Sin match (0%)            │    │
│     └─────────────────────────────────────┘    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  6. Guardar Movimiento en BD                    │
│     - Con socio identificado (si hay match)     │
│     - Con nivel de match                        │
│     - Con porcentaje de confianza               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  7. Procesamiento                               │
│     - Match A o B: Automático                   │
│     - Match C, D, E: Revisión manual            │
│     - Match F: Revisión manual obligatoria      │
└─────────────────────────────────────────────────┘
```

### Pasos Detallados

#### Paso 1: Carga del Extracto

El usuario carga un archivo `.txt` desde la interfaz de conciliación bancaria.

#### Paso 2: Limpieza y Filtrado

El sistema limpia automáticamente el archivo y descarta egresos.

#### Paso 3: Parsing

Cada línea válida se parsea y se extraen las columnas relevantes.

#### Paso 4: Extracción

Del concepto se extraen nombre, CUIT/CUIL y DNI.

#### Paso 5: Matching

Se ejecuta el algoritmo jerárquico de 6 niveles.

#### Paso 6: Almacenamiento

Los movimientos se guardan en la tabla `movimientos_bancarios` con:
- Información extraída
- Socio identificado (si hay match)
- Nivel de match
- Porcentaje de confianza
- Estado (`nuevo`, `procesado`, `descartado`)

#### Paso 7: Procesamiento

- **Match A o B:** Alta confianza, se puede procesar automáticamente
- **Match C, D, E:** Requiere confirmación manual
- **Match F:** Requiere asignación manual del socio

---

## Consideraciones Técnicas

### Normalización

Toda la normalización se realiza para:
- Eliminar diferencias de formato (mayúsculas/minúsculas, acentos)
- Facilitar las comparaciones
- Mejorar la precisión del matching

### Priorización

El sistema prioriza:
1. **Exactitud** sobre similitud
2. **Documentos únicos** (CUIT, DNI) sobre nombres
3. **Validaciones cruzadas** para reducir falsos positivos

### Validaciones de Seguridad

- **Nivel B:** Valida similitud de nombre aunque DNI coincida
- **Nivel D:** Requiere mínimo 85% de similitud
- **Nivel E:** Solo acepta entre 60-80% (evita falsos positivos)

### Performance

- **Nivel A y B:** Búsqueda directa por índice (muy rápido)
- **Nivel C, D, E:** Búsqueda secuencial (más lento pero aceptable)
- Se detiene en el primer match para optimizar

---

## Archivos del Sistema

### Archivos Principales

1. **`app/utils/parseExtractoBancario.ts`**
   - Parsing del archivo `.txt`
   - Limpieza y filtrado
   - Extracción de datos del concepto

2. **`app/utils/matchingAlgoritmo.ts`**
   - Implementación de los 6 niveles de matching
   - Función principal: `ejecutarMatching()`

3. **`app/utils/normalizarTexto.ts`**
   - Funciones de normalización
   - Extracción de datos del concepto
   - Normalización de CUIT, DNI, nombres

4. **`app/utils/calcularSimilitud.ts`**
   - Algoritmo de Levenshtein
   - Cálculo de porcentajes de similitud
   - Similitud de nombres completos

5. **`app/conciliacion/ConciliacionClient.tsx`**
   - Interfaz de usuario
   - Carga de archivos
   - Visualización de resultados

---

## Conclusión

El sistema de conciliación bancaria utiliza un algoritmo inteligente de matching que combina:

- ✅ **Parsing robusto** de extractos bancarios
- ✅ **Extracción inteligente** de datos del concepto
- ✅ **Matching jerárquico** de 6 niveles con diferentes porcentajes de confianza
- ✅ **Validaciones de seguridad** para reducir falsos positivos
- ✅ **Revisión manual** para casos complejos

Este sistema permite procesar automáticamente la mayoría de los movimientos bancarios mientras mantiene la flexibilidad para casos especiales que requieren intervención humana.

---

**Última actualización:** Diciembre 2025  
**Versión del documento:** 1.0

