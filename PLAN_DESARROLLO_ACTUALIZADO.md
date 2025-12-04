# Plan de Desarrollo Actualizado - Club Náutico Embalse

**Fecha:** Diciembre 2025  
**Versión del Plan:** 2.0  
**Estado:** Fase 5 Completada - En desarrollo activo

---

## 📋 Resumen Ejecutivo

### Estado Actual
- **Módulos Completados:** 4 de 8 (50%)
- **Funcionalidades Principales:** 95%+ completadas en módulos existentes
- **Última Fase:** Fase 5 - Migración de Modales a Rutas ✅

### Progreso por Módulo

| Módulo | Estado | Completitud |
|--------|--------|-------------|
| 1. Gestión de Socios | ✅ Completo | 100% |
| 2. Gestión de Visitas | ✅ Completo | 100% |
| 3. Gestión de Embarcaciones | ✅ Completo | 100% |
| 4. Sistema de Facturación | ✅ Completo | 100% |
| 5. Dashboard Principal | ⏳ Parcial | 30% |
| 6. Conciliación Bancaria | ⏳ Pendiente | 0% |
| 7. Portal de Autogestión | ⏳ Pendiente | 0% |
| 8. Configuración del Sistema | ⏳ Pendiente | 0% |

---

## ✅ Fases Completadas

### Fase 0: Verificación y Preparación ✅
- Verificación de compilación
- Limpieza de componentes no usados
- Documentación inicial

### Fase 1: Completar Gestión de Socios ✅
- Alta de nuevo socio
- Detalle con resumen de cuenta
- Historial unificado de movimientos
- Validaciones completas

### Fase 2: Módulo de Embarcaciones ✅
- CRUD completo
- Cambio de propietario con validaciones
- Búsqueda y filtrado

### Fase 3: Completar Gestión de Visitas ✅
- CRUD completo
- Resumen del mes
- Validaciones de estado

### Fase 4: Sistema de Facturación ✅
- Generación masiva de cupones
- Vista previa con selección
- Gestión de cupones
- Registro de pagos

### Fase 5: Migración de Modales a Rutas ✅
- Eliminación de todos los modales
- Migración a rutas
- Componentes client creados
- Optimizaciones de queries

---

## 🚀 Próximas Fases Planificadas

### Fase 6: Dashboard Principal Mejorado

**Prioridad:** Alta  
**Estimación:** Media  
**Dependencias:** Ninguna

#### Objetivos
- Mejorar el dashboard con métricas avanzadas
- Agregar gráficos e información visual
- Accesos rápidos a funciones comunes

#### Tareas Específicas

**6.1 Métricas Adicionales**
- [ ] Total de ingresos del mes
- [ ] Total de ingresos del año
- [ ] Cupones pendientes
- [ ] Deuda total acumulada
- [ ] Visitas del mes actual
- [ ] Socios inactivos
- [ ] Embarcaciones sin propietario activo

**6.2 Gráficos y Visualizaciones**
- [ ] Gráfico de ingresos por mes (últimos 12 meses)
- [ ] Gráfico de visitas por mes
- [ ] Gráfico de estado de cupones (pendientes, pagados, vencidos)
- [ ] Gráfico de socios por estado
- [ ] Gráfico de tipos de embarcaciones

**6.3 Accesos Rápidos**
- [ ] Botón "Nuevo Socio"
- [ ] Botón "Nueva Embarcación"
- [ ] Botón "Cargar Visita"
- [ ] Botón "Generar Cupones"
- [ ] Botón "Registrar Pago"
- [ ] Enlaces a reportes comunes

**6.4 Actualizaciones en Tiempo Real**
- [ ] Actualización automática de métricas
- [ ] Indicadores de cambios recientes
- [ ] Notificaciones de acciones importantes

**Archivos a Modificar:**
- `app/page.tsx` - Dashboard principal
- `app/components/DashboardStats.tsx` - Componente de estadísticas

---

### Fase 7: Configuración del Sistema

**Prioridad:** Alta  
**Estimación:** Media  
**Dependencias:** Usado por todos los módulos

#### Objetivos
- Crear página de configuración centralizada
- Permitir gestión de parámetros del sistema
- Configurar datos del club y bancarios

#### Tareas Específicas

**7.1 Página Principal de Configuración**
- [ ] Crear ruta `/configuracion`
- [ ] Diseñar interfaz de configuración
- [ ] Secciones organizadas

**7.2 Datos del Club**
- [ ] Nombre del club
- [ ] Dirección
- [ ] Teléfono
- [ ] Email
- [ ] Logo (opcional)

**7.3 Datos Bancarios**
- [ ] CBU/CVU
- [ ] Alias
- [ ] Banco
- [ ] Tipo de cuenta
- [ ] Titular

**7.4 Costos y Tarifas**
- [ ] Cuota social base mensual
- [ ] Costo por visita
- [ ] Costo por amarra (si aplica)
- [ ] Porcentaje de intereses por mora
- [ ] Días de gracia para intereses

**7.5 Parámetros del Sistema**
- [ ] Fecha de corte mensual
- [ ] Días de vencimiento de cupones
- [ ] Configuración de emails
- [ ] Configuración de reportes

**Archivos a Crear:**
- `app/configuracion/page.tsx`
- `app/configuracion/ConfiguracionClient.tsx`
- Posibles subrutas según organización

---

### Fase 8: Conciliación Bancaria

**Prioridad:** Media  
**Estimación:** Alta (complejidad)  
**Dependencias:** Sistema de pagos

#### Objetivos
- Implementar carga de extractos bancarios
- Sistema de matching automático
- Registro de movimientos bancarios
- Conciliación manual

#### Tareas Específicas

**8.1 Carga de Extracto Bancario**
- [ ] Interfaz de carga (drag & drop y selector)
- [ ] Parser de archivos .txt
- [ ] Vista previa en la misma pantalla
- [ ] Validación de formato

**8.2 Extracción de Datos**
- [ ] Parser de columnas del extracto
- [ ] Extracción de información del concepto
- [ ] Reconocimiento de patrones (apellido, nombre, CUIT)
- [ ] Filtrado de movimientos (solo transferencias recibidas)

**8.3 Sistema de Matching Inteligente**
- [ ] Nivel A: Match por CUIT/CUIL (100% confianza)
- [ ] Nivel B: Match por DNI (95% confianza)
- [ ] Nivel C: Match bidireccional por CUIL generado (98%)
- [ ] Nivel D: Match por nombre completo (85%)
- [ ] Nivel E: Match por similitud (Levenshtein, 60-80%)
- [ ] Algoritmo de normalización de texto

**8.4 Detección de Duplicados**
- [ ] Por referencia bancaria
- [ ] Por criterios combinados (socio, monto, fecha)
- [ ] Interfaz de gestión de duplicados

**8.5 Procesamiento y Confirmación**
- [ ] Asignación automática de matches seguros
- [ ] Asignación manual de matches inciertos
- [ ] Confirmación masiva
- [ ] Registro de movimientos bancarios

**8.6 Log de Conciliación**
- [ ] Historial de operaciones
- [ ] Movimientos no procesados
- [ ] Estadísticas de matching

**Archivos a Crear:**
- `app/conciliacion/page.tsx`
- `app/conciliacion/ConciliacionClient.tsx`
- `app/types/movimientos_bancarios.ts`
- `app/utils/parseExtractoBancario.ts`
- `app/utils/matchingAlgoritmo.ts`
- `app/utils/normalizarTexto.ts`
- `app/utils/calcularSimilitud.ts`

---

### Fase 9: Portal de Autogestión para Socios

**Prioridad:** Baja  
**Estimación:** Alta  
**Dependencias:** Autenticación, Módulos de Socios y Facturación

#### Objetivos
- Crear portal para que socios consulten su información
- Dashboard del socio
- Consulta de cuenta y movimientos
- Descarga de comprobantes

#### Tareas Específicas

**9.1 Autenticación**
- [ ] Sistema de autenticación de socios
- [ ] Login con DNI o número de socio
- [ ] Recuperación de acceso
- [ ] Gestión de sesiones

**9.2 Dashboard del Socio**
- [ ] Vista general de cuenta
- [ ] Resumen de deuda
- [ ] Próximos vencimientos
- [ ] Movimientos recientes

**9.3 Consulta de Información**
- [ ] Detalle de cuenta completo
- [ ] Historial de cupones
- [ ] Historial de pagos
- [ ] Historial de visitas
- [ ] Información de embarcaciones

**9.4 Descarga de Comprobantes**
- [ ] Descarga de cupones en PDF
- [ ] Descarga de comprobantes de pago
- [ ] Exportación de resumen de cuenta

**9.5 Información del Club**
- [ ] Datos de contacto
- [ ] Datos bancarios para transferencias
- [ ] Normativas y reglamentos

**Archivos a Crear:**
- `app/portal/page.tsx` (o subdirectorio)
- Sistema de autenticación
- Componentes del portal

---

## 📊 Priorización de Tareas

### Prioridad Alta (Siguiente Sprint)
1. ✅ ~~Migración de modales a rutas~~ (Completado)
2. ⏳ Dashboard Principal Mejorado
3. ⏳ Configuración del Sistema

### Prioridad Media (Próximos Sprints)
4. ⏳ Conciliación Bancaria

### Prioridad Baja (Futuro)
5. ⏳ Portal de Autogestión
6. ⏳ Reportes y Estadísticas Avanzadas

---

## 🔧 Mejoras Técnicas Pendientes

### Optimizaciones
- [ ] Aplicar `Promise.all()` en más páginas de detalle
- [ ] Agregar paginación en listados grandes
- [ ] Optimizar queries con selects específicos
- [ ] Implementar caché donde sea beneficioso

### Limpieza de Código
- [ ] Eliminar carpeta `app/components/modals/` (ya no se usa)
- [ ] Eliminar `app/components/ui/Modal.tsx` si no se usa
- [ ] Revisar y eliminar código duplicado
- [ ] Optimizar imports

### Testing
- [ ] Testing manual de todas las rutas
- [ ] Verificar validaciones
- [ ] Probar casos edge
- [ ] Verificar flujos completos

---

## 📈 Métricas del Proyecto

### Completitud General
- **Módulos completos:** 4/8 (50%)
- **Funcionalidades implementadas:** ~85% del sistema total
- **Código funcional:** ~8,000+ líneas
- **Componentes creados:** 50+

### Calidad
- ✅ Compilación sin errores
- ✅ TypeScript estricto
- ✅ Validaciones completas
- ✅ Manejo de errores
- ✅ Navegación consistente

---

## 🎯 Objetivos a Corto Plazo

### Próximos 2 Sprints

1. **Completar Dashboard Principal**
   - Agregar todas las métricas
   - Implementar gráficos básicos
   - Accesos rápidos

2. **Implementar Configuración**
   - Página de configuración
   - Gestión de parámetros
   - Datos del club

3. **Mejoras Técnicas**
   - Limpieza de código
   - Optimizaciones adicionales
   - Testing manual

---

## 📝 Notas de Desarrollo

### Patrones Establecidos
- ✅ Rutas dinámicas con `[id]`
- ✅ Server Components para carga inicial
- ✅ Client Components para interactividad
- ✅ Queries paralelas con `Promise.all()`
- ✅ Validaciones en frontend y backend

### Convenciones
- ✅ Rutas organizadas por módulo
- ✅ Componentes client en subcarpetas
- ✅ Tipos TypeScript centralizados
- ✅ Utilidades reutilizables
- ✅ Navegación con botones "Volver"

### Consideraciones Futuras
- Autenticación y autorización
- Permisos y roles
- Logs de auditoría
- Backup y recuperación
- Performance en producción

---

## 📚 Documentación de Referencia

1. **Especificación Funcional:** `Propuesta de software/Especificacion funcional/ESPECIFICACION_FUNCIONAL.md`
2. **Historial de Planes:** `HISTORIAL_PLANES.md`
3. **Estado Actual:** `ESTADO_ACTUAL.md`
4. **Resumen Completo:** `RESUMEN_COMPLETO_ACTUALIZADO.md`
5. **Migración de Modales:** `MIGRACION_COMPLETADA.md`

---

**Última actualización:** Diciembre 2025  
**Próxima revisión:** Al completar Fase 6 o cuando haya cambios significativos




