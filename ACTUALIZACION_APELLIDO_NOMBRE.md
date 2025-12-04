# Actualización: Separación de Apellido y Nombre

**Fecha:** Diciembre 2025  
**Estado:** ✅ Completada

---

## Resumen

Se actualizó el módulo de socios para usar campos separados `apellido` y `nombre` en lugar de `nombre_completo`, según el esquema SQL y la especificación funcional.

---

## Cambios Realizados

### 1. Tipo TypeScript Actualizado

**Archivo:** `app/types/socios.ts`

**Cambios:**
- ❌ Eliminado: `nombre_completo: string`
- ✅ Agregado: `apellido: string`
- ✅ Agregado: `nombre: string`
- ✅ Agregada función helper: `getNombreCompleto(socio)` que retorna `"Apellido, Nombre"`

---

### 2. Filtros Actualizados

**Archivos:**
- `app/utils/filterSocios.ts`
- `app/utils/filterEmbarcaciones.ts`

**Cambios:**
- Búsqueda ahora busca en `apellido` y `nombre` por separado
- Según especificación: "Por nombre o apellido"

---

### 3. Formularios Actualizados

**Archivos:**
- `app/components/modals/NuevoSocioModal.tsx`
- `app/components/modals/EditarSocioModal.tsx`

**Cambios:**
- Campo único "Nombre Completo" reemplazado por dos campos:
  - "Apellido *" (obligatorio)
  - "Nombre *" (obligatorio)
- Validaciones actualizadas:
  - Apellido: obligatorio
  - Nombre: obligatorio
- Consultas a Supabase actualizadas para insertar/actualizar `apellido` y `nombre`

---

### 4. Tablas Actualizadas

**Archivos:**
- `app/components/SociosTable.tsx`
- `app/components/SociosTableSimple.tsx`

**Cambios:**
- Columna "NOMBRE COMPLETO" renombrada a "APELLIDO Y NOMBRE"
- Uso de función `getNombreCompleto()` para mostrar formato "Apellido, Nombre"

---

### 5. Modales Actualizados

**Archivos actualizados:**
- `app/components/modals/DetalleSocioModal.tsx`
- `app/components/modals/ConfirmarEliminarModal.tsx`
- `app/components/modals/CargarVisitaModal.tsx`

**Cambios:**
- DetalleSocioModal: Muestra apellido y nombre en campos separados
- Otros modales: Usan `getNombreCompleto()` para mostrar nombre completo

---

### 6. Módulo de Embarcaciones Actualizado

**Archivos actualizados:**
- `app/types/embarcaciones.ts` - Tipo de relación con socio
- `app/components/EmbarcacionesTable.tsx`
- `app/components/modals/NuevaEmbarcacionModal.tsx`
- `app/components/modals/EditarEmbarcacionModal.tsx`
- `app/components/modals/DetalleEmbarcacionModal.tsx`
- `app/components/modals/ConfirmarEliminarEmbarcacionModal.tsx`
- `app/embarcaciones/page.tsx`
- `app/utils/filterEmbarcaciones.ts`

**Cambios:**
- Consultas SQL actualizadas para seleccionar `apellido` y `nombre` en lugar de `nombre_completo`
- Todas las visualizaciones usan `getNombreCompleto()` para mostrar el nombre del socio
- Búsqueda actualizada para buscar en apellido y nombre del socio

---

## Consultas SQL Actualizadas

### Antes:
```typescript
.select('id, numero_socio, nombre_completo')
```

### Después:
```typescript
.select('id, numero_socio, apellido, nombre')
```

**Archivos con consultas actualizadas:**
- `app/embarcaciones/page.tsx`
- `app/components/modals/NuevaEmbarcacionModal.tsx`
- `app/components/modals/EditarEmbarcacionModal.tsx`

---

## Función Helper

Se creó la función `getNombreCompleto()` en `app/types/socios.ts`:

```typescript
export function getNombreCompleto(socio: Socio | null | undefined): string {
  if (!socio) return '';
  return `${socio.apellido}, ${socio.nombre}`.trim();
}
```

**Uso:** Se usa en todos los lugares donde se necesita mostrar el nombre completo del socio.

---

## Validaciones Actualizadas

### NuevoSocioModal
- ✅ Apellido: obligatorio
- ✅ Nombre: obligatorio
- ✅ DNI: obligatorio, único, 7-8 dígitos
- ✅ Email: obligatorio, único, formato válido
- ✅ Teléfono: obligatorio

### EditarSocioModal
- ✅ Apellido: obligatorio
- ✅ Nombre: obligatorio
- ✅ Todos los demás campos mantienen sus validaciones

---

## Búsqueda Actualizada

### filterSocios.ts
Ahora busca en:
- Apellido (contiene término de búsqueda)
- Nombre (contiene término de búsqueda)
- DNI
- Número de socio

### filterEmbarcaciones.ts
Ahora busca en:
- Matrícula
- Nombre de embarcación
- Apellido del socio
- Nombre del socio
- Número de socio

---

## Archivos Modificados

### Tipos y Utilidades
1. ✅ `app/types/socios.ts`
2. ✅ `app/types/embarcaciones.ts`
3. ✅ `app/utils/filterSocios.ts`
4. ✅ `app/utils/filterEmbarcaciones.ts`

### Componentes de Socios
5. ✅ `app/components/SociosTable.tsx`
6. ✅ `app/components/SociosTableSimple.tsx`
7. ✅ `app/components/modals/NuevoSocioModal.tsx`
8. ✅ `app/components/modals/EditarSocioModal.tsx`
9. ✅ `app/components/modals/DetalleSocioModal.tsx`
10. ✅ `app/components/modals/ConfirmarEliminarModal.tsx`
11. ✅ `app/components/modals/CargarVisitaModal.tsx`

### Componentes de Embarcaciones
12. ✅ `app/components/EmbarcacionesTable.tsx`
13. ✅ `app/components/modals/NuevaEmbarcacionModal.tsx`
14. ✅ `app/components/modals/EditarEmbarcacionModal.tsx`
15. ✅ `app/components/modals/DetalleEmbarcacionModal.tsx`
16. ✅ `app/components/modals/ConfirmarEliminarEmbarcacionModal.tsx`
17. ✅ `app/embarcaciones/page.tsx`

**Total:** 17 archivos modificados

---

## Verificación

- ✅ Compilación exitosa sin errores
- ✅ Sin errores de linter
- ✅ Tipos TypeScript correctos
- ✅ Todas las referencias a `nombre_completo` eliminadas
- ✅ Consultas SQL actualizadas correctamente

---

## Compatibilidad con Base de Datos

**Importante:** La base de datos debe tener la estructura correcta según el esquema SQL:
- Campo `apellido VARCHAR(255) NOT NULL`
- Campo `nombre VARCHAR(255) NOT NULL`
- **NO** debe existir campo `nombre_completo`

Si la base de datos aún tiene `nombre_completo`, se debe:
1. Ejecutar migración SQL para agregar `apellido` y `nombre`
2. Migrar datos de `nombre_completo` a los nuevos campos
3. Eliminar campo `nombre_completo`

---

## Notas Técnicas

- La función `getNombreCompleto()` formatea como "Apellido, Nombre" para mantener consistencia
- Los formularios validan que ambos campos (apellido y nombre) sean obligatorios
- La búsqueda es más flexible ahora, buscando en ambos campos por separado
- Todas las consultas SQL fueron actualizadas para usar los nuevos campos

---

**Actualización completada exitosamente** ✅  
**Lista para usar con el esquema SQL correcto**








