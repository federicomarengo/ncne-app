# Verificación de Base de Datos - Club Náutico Embalse

**Fecha:** Diciembre 2025  
**Fase:** 0 - Verificación

---

## Tablas Usadas en el Código Actual

Según el análisis del código fuente, las siguientes tablas están siendo utilizadas:

### ✅ Tablas en Uso

1. **`socios`**
   - **Uso:** Lectura, actualización, eliminación
   - **Archivos:**
     - `app/socios/page.tsx` - Listado
     - `app/page.tsx` - Dashboard (conteo)
     - `app/components/modals/EditarSocioModal.tsx` - Actualización
     - `app/components/modals/ConfirmarEliminarModal.tsx` - Eliminación
   - **Estado:** ✅ Implementado

2. **`visitas`**
   - **Uso:** Inserción
   - **Archivos:**
     - `app/components/modals/CargarVisitaModal.tsx` - Creación
   - **Estado:** ✅ Implementado (parcial)

3. **`configuracion`**
   - **Uso:** Verificación de conexión
   - **Archivos:**
     - `verify_connection.js` - Test de conexión
   - **Estado:** ⚠️ No usado en la aplicación principal

---

## Comparación con Esquema SQL

### Tablas del Esquema SQL (`001_esquema.sql`)

| Tabla | En Código | En Esquema SQL | Estado |
|-------|-----------|----------------|--------|
| `configuracion` | ⚠️ Solo test | ✅ Definida | Pendiente verificar |
| `socios` | ✅ Usada | ✅ Definida | ✅ Implementado |
| `embarcaciones` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `visitas` | ✅ Usada | ✅ Definida | ✅ Parcial |
| `planes_financiacion` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `cuotas_plan` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `cupones` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `items_cupon` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `pagos` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `pagos_cupones` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `pagos_cuotas` | ❌ No usada | ✅ Definida | ❌ No implementado |
| `movimientos_bancarios` | ❌ No usada | ✅ Definida | ❌ No implementado |

---

## Campos de Tabla `socios` - Comparación

### Campos según Esquema SQL
```sql
- id (SERIAL PRIMARY KEY)
- numero_socio (INTEGER UNIQUE NOT NULL)
- nombre_completo (VARCHAR(255) NOT NULL)
- dni (VARCHAR(20) UNIQUE NOT NULL)
- cuit_cuil (VARCHAR(20))
- email (VARCHAR(255) NOT NULL)
- telefono (VARCHAR(50))
- direccion (TEXT)
- localidad (VARCHAR(100))  ⚠️ FALTA EN TIPO
- fecha_nacimiento (DATE)    ⚠️ FALTA EN TIPO
- estado (VARCHAR(20) NOT NULL DEFAULT 'activo')
- fecha_ingreso (DATE)
- observaciones (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Campos en Tipo TypeScript Actual
```typescript
// app/types/socios.ts
- id: number
- numero_socio: number
- nombre_completo: string
- dni: string
- cuit_cuil?: string | null
- email: string
- telefono?: string | null
- direccion?: string | null
- estado: EstadoSocio
- fecha_ingreso?: string | Date | null
- observaciones?: string | null
- created_at?: string
- updated_at?: string
```

### Campos Faltantes en Tipo TypeScript
- ❌ `localidad?: string`
- ❌ `fecha_nacimiento?: Date | string`

### Campos Faltantes en Formularios
- ❌ `localidad` - No está en EditarSocioModal
- ❌ `fecha_nacimiento` - No está en EditarSocioModal

---

## Campos de Tabla `embarcaciones` - Comparación

### Campos según Esquema SQL
```sql
- id (SERIAL PRIMARY KEY)
- socio_id (INTEGER NOT NULL) FK
- matricula (VARCHAR(100) UNIQUE)
- nombre (VARCHAR(255) NOT NULL)
- tipo (VARCHAR(50) NOT NULL)
- astillero (VARCHAR(50))
- modelo (VARCHAR(255))
- eslora_pies (DECIMAL(6, 2) NOT NULL)
- eslora_metros (DECIMAL(6, 2))
- manga_metros (DECIMAL(6, 2))
- puntal_metros (DECIMAL(6, 2))
- calado (DECIMAL(6, 2))
- tonelaje (DECIMAL(8, 2))
- anio_construccion (INTEGER)
- motor_info (VARCHAR(255))
- hp (DECIMAL(6, 2))
- observaciones (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Estado en Código
- ❌ No existe tipo TypeScript para embarcaciones
- ❌ No existe página funcional
- ❌ No existe CRUD

---

## Campos de Tabla `visitas` - Comparación

### Campos según Esquema SQL
```sql
- id (SERIAL PRIMARY KEY)
- socio_id (INTEGER NOT NULL) FK
- fecha_visita (DATE NOT NULL)
- cantidad_visitantes (INTEGER NOT NULL)
- costo_unitario (DECIMAL(10, 2) NOT NULL)
- monto_total (DECIMAL(10, 2) NOT NULL)
- estado (VARCHAR(30) DEFAULT 'pendiente')
- cupon_id (INTEGER) FK
- fecha_generacion_cupon (DATE)
- observaciones (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Estado en Código
- ✅ Se usa en CargarVisitaModal
- ✅ Campos principales implementados
- ⚠️ No se usa `cupon_id` ni `fecha_generacion_cupon` (se asignarán cuando se implemente facturación)

---

## Acciones Requeridas

### Inmediatas (Fase 0)
1. ⚠️ **Verificar en Supabase** que las tablas existan con la estructura correcta
2. ⚠️ **Verificar** que la tabla `configuracion` tenga un registro inicial
3. ⚠️ **Verificar** relaciones de foreign keys

### Fase 1
1. ✅ Agregar campos faltantes a tipo `Socio`:
   - `localidad?: string`
   - `fecha_nacimiento?: Date | string`

2. ✅ Agregar campos faltantes a `EditarSocioModal`:
   - Campo de localidad
   - Campo de fecha de nacimiento

### Fase 2
1. ✅ Crear tipo TypeScript para `Embarcacion`
2. ✅ Implementar CRUD completo de embarcaciones
3. ✅ Verificar que la tabla `embarcaciones` exista en Supabase

---

## Scripts SQL a Ejecutar

Si las tablas no existen en Supabase, se debe ejecutar el script:
- `Club Nautico Embalse/Propuesta de software/migrations/001_esquema.sql`

**Nota:** Verificar antes de ejecutar que no se eliminen datos existentes.

---

## Verificación de Conexión

Para verificar la conexión a Supabase, ejecutar:
```bash
node verify_connection.js
```

Este script verifica:
- ✅ Variables de entorno configuradas
- ✅ Conexión a Supabase
- ✅ Acceso a tabla `configuracion`

---

**Documento creado en:** Fase 0 - Verificación  
**Próxima actualización:** Al verificar estructura en Supabase








