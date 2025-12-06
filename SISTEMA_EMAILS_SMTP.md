# Sistema de Envío de Emails con SMTP

Este documento describe la implementación del sistema de envío de emails para cupones del Club Náutico Embalse.

## ✅ Implementación Completada

Se han completado las 4 fases del sistema de envío de emails:

### Fase 1: Configuración Base ✅
- ✅ Migración `010_configuracion_email.sql` - Tablas `configuracion_email` y `envios_email`
- ✅ Tipos TypeScript en `app/types/email.ts`
- ✅ Utilidad de envío en `app/utils/email/enviarEmail.ts`
- ✅ API de prueba en `app/api/emails/test/route.ts`
- ✅ Sección de configuración SMTP en pantalla de configuración

### Fase 2: Template y Generación ✅
- ✅ Template HTML profesional en `app/components/emails/EmailCuponTemplate.tsx`
- ✅ Generador de emails en `app/utils/email/generarEmailCupon.ts`
- ✅ Componente de vista previa en `app/components/emails/VistaPreviewEmail.tsx`

### Fase 3: Envío Individual ✅
- ✅ API de preview en `app/api/emails/preview/[cuponId]/route.ts`
- ✅ API de envío individual en `app/api/emails/enviar-cupon/route.ts`
- ✅ Botón de envío en `DetalleCuponModal.tsx`

### Fase 4: Envío Masivo ✅
- ✅ Pantalla de envío masivo en `app/cupones/enviar-emails/`
- ✅ API de envío masivo en `app/api/emails/enviar-masivo/route.ts`
- ✅ Enlace en Sidebar

## 📦 Dependencias Requeridas

Para que el sistema funcione, es necesario instalar la librería `nodemailer`:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## 🔧 Configuración Inicial

### 1. Ejecutar la Migración

Ejecuta la migración SQL en tu base de datos Supabase:

```bash
# Ubicación del archivo
D:\Club Nautico Embalse\Propuesta de software\migrations\010_configuracion_email.sql
```

### 2. Configurar el Servidor SMTP

1. Accede a la pantalla de **Configuración** en la aplicación
2. Desplázate hasta la sección **"Configuración de Email (SMTP)"**
3. Completa los siguientes datos de tu servidor de hosting:

#### Datos requeridos:
- **Host SMTP**: Por ejemplo, `mail.tudominio.com.ar`
- **Puerto**: 
  - `587` para STARTTLS (recomendado)
  - `465` para SSL/TLS
- **Usuario SMTP**: El email completo (ej: `no-reply@tudominio.com.ar`)
- **Contraseña**: La contraseña del email
- **Seguridad**: Selecciona TLS o SSL según tu servidor
- **Email Remitente**: El email que aparecerá como remitente
- **Nombre del Remitente**: Por ejemplo, "Club Náutico Embalse"

4. Habilita el sistema de emails
5. Haz clic en **"Guardar Configuración"**
6. Prueba la configuración con el botón **"Enviar Email de Prueba"**

### 3. Consultar con tu Hosting

Si no conoces los datos de tu servidor SMTP, contacta a tu proveedor de hosting y pregunta por:
- Servidor SMTP (hostname)
- Puerto a utilizar (587 o 465)
- Si requiere autenticación (generalmente sí)
- Tipo de encriptación (TLS/SSL)

## 🚀 Uso del Sistema

### Envío Individual

1. Ve a **Cupones** en el menú lateral
2. Haz clic en cualquier cupón para ver su detalle
3. En el modal de detalle:
   - Haz clic en **"👁️ Vista Previa"** para ver cómo se verá el email
   - Haz clic en **"📧 Enviar por Email"** para enviarlo al socio

### Envío Masivo Mensual

1. Ve a **"Enviar Emails"** en el menú lateral
2. Selecciona el **mes** y **año** del período
3. El sistema carga automáticamente todos los cupones de ese período
4. Revisa la lista de socios:
   - Los socios con email aparecen seleccionados automáticamente
   - Los socios sin email están marcados en rojo
5. Puedes:
   - Seleccionar/deseleccionar socios individualmente
   - Usar "Seleccionar todos" / "Deseleccionar todos"
   - Filtrar por "Con email" / "Sin email" / "Todos"
6. Haz clic en **"📧 Enviar N Emails"**
7. Confirma la acción
8. El sistema enviará los emails uno por uno, mostrando el progreso en tiempo real

## 📧 Características del Email

El email enviado incluye:

### Diseño Profesional
- ✅ Responsive (se ve bien en móvil y desktop)
- ✅ Colores del club
- ✅ Header con logo/nombre del club

### Información del Cupón
- ✅ Saludo personalizado con nombre del socio
- ✅ Número de cupón destacado
- ✅ Monto total grande y visible
- ✅ Fecha de vencimiento
- ✅ Desglose completo de cargos (cuota social, amarra, visitas, etc.)
- ✅ Lista de embarcaciones del socio

### Información de Pago
- ✅ Datos bancarios en recuadro destacado
- ✅ CBU en formato monoespaciado para fácil lectura
- ✅ Alias bancario (si está configurado)
- ✅ Instrucciones de cómo enviar el comprobante

### Acciones
- ✅ Botón "Ver Mi Historial" → Link al portal de socios
- ✅ Instrucciones claras de pago
- ✅ Datos de contacto del club en el footer

## 🔍 Tracking de Envíos

El sistema registra todos los envíos en la tabla `envios_email` con:
- ✅ Fecha y hora del envío
- ✅ Estado (pendiente, enviado, error)
- ✅ Email destino
- ✅ Asunto
- ✅ Mensaje de error (si falló)
- ✅ Número de intentos

## 🛠️ Troubleshooting

### Error: "No hay configuración de email activa"
**Solución**: Ve a Configuración y completa la sección de Email SMTP.

### Error al enviar: "No se pudo conectar al servidor SMTP"
**Posibles causas**:
1. Host SMTP incorrecto
2. Puerto incorrecto
3. Firewall bloqueando la conexión
4. Credenciales incorrectas

**Solución**: Verifica los datos con tu proveedor de hosting.

### Error: "El socio no tiene email configurado"
**Solución**: Ve a la ficha del socio y agrega su email.

### Los emails llegan a spam
**Solución**: 
1. Configura SPF, DKIM y DMARC en tu dominio
2. Usa un email del mismo dominio del hosting
3. No uses palabras como "gratis", "urgente" en el asunto
4. Pide a los socios que agreguen tu email a contactos

## 📝 Variables de Entorno

Opcionalmente, puedes configurar:

```env
# .env.local
NEXT_PUBLIC_PORTAL_URL=https://tudominio.com.ar/portal
```

Si no se configura, por defecto usa `http://localhost:3000/portal`

## 🎯 Mejoras Futuras (No Implementadas)

Posibles mejoras para futuras versiones:
- [ ] Código QR con CBU para pago rápido desde apps bancarias
- [ ] Tracking de aperturas de email
- [ ] Reenvío automático de emails fallidos
- [ ] Programación de envíos (enviar automáticamente el día X de cada mes)
- [ ] Templates personalizables desde la UI
- [ ] Envío de recordatorios de vencimiento

## 📚 Archivos Creados

### Configuración y Tipos
- `migrations/010_configuracion_email.sql`
- `app/types/email.ts`

### Utilidades
- `app/utils/email/enviarEmail.ts`
- `app/utils/email/generarEmailCupon.ts`

### Componentes
- `app/components/ConfiguracionEmailSection.tsx`
- `app/components/emails/EmailCuponTemplate.tsx`
- `app/components/emails/VistaPreviewEmail.tsx`

### Pantallas
- `app/cupones/enviar-emails/page.tsx`
- `app/cupones/enviar-emails/EnviarEmailsClient.tsx`

### APIs
- `app/api/emails/test/route.ts`
- `app/api/emails/preview/[cuponId]/route.ts`
- `app/api/emails/enviar-cupon/route.ts`
- `app/api/emails/enviar-masivo/route.ts`

### Modificaciones
- `app/configuracion/ConfiguracionClient.tsx` - Agregada sección de email
- `app/components/Sidebar.tsx` - Agregado enlace "Enviar Emails"
- `app/components/modals/DetalleCuponModal.tsx` - Agregado botón enviar email

## 🎉 ¡Sistema Listo!

El sistema está completamente implementado y listo para usar. Solo falta:
1. Instalar `nodemailer`
2. Ejecutar la migración
3. Configurar tu servidor SMTP
4. ¡Comenzar a enviar emails!

