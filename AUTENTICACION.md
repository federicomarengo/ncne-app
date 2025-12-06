# Sistema de Autenticación

## Descripción

Se ha implementado un sistema de autenticación completo usando **Supabase Auth** para proteger el acceso a la aplicación administrativa del Club Náutico Embalse.

## Características

- ✅ Login con email y contraseña
- ✅ Protección de rutas mediante middleware
- ✅ Sesiones persistentes
- ✅ Logout seguro
- ✅ Verificación de autenticación en tiempo real
- ✅ Redirección automática a login si no está autenticado

## Configuración Inicial

### 1. Habilitar Supabase Auth

En el dashboard de Supabase:

1. Ve a **Authentication** → **Providers**
2. Habilita **Email** provider
3. Configura las opciones según tus necesidades:
   - **Enable email confirmations**: Opcional (recomendado desactivar para desarrollo)
   - **Secure email change**: Opcional

### 2. Crear Usuario Administrador

#### Opción A: Desde el Dashboard de Supabase

1. Ve a **Authentication** → **Users**
2. Click en **Add user** → **Create new user**
3. Ingresa:
   - **Email**: `admin@clubnautico.com` (o el que prefieras)
   - **Password**: Una contraseña segura
   - **Auto Confirm User**: ✅ (marcar para no requerir confirmación de email)
4. Click en **Create user**

#### Opción B: Desde la aplicación (requiere crear primero un usuario)

Una vez creado el primer usuario, puedes crear más desde la aplicación o desde Supabase.

### 3. Variables de Entorno

Asegúrate de tener configuradas estas variables en Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

**⚠️ IMPORTANTE**: NO uses `SUPABASE_SERVICE_ROLE_KEY` en el frontend. Esa clave bypasea RLS y solo debe usarse en operaciones del servidor.

## Estructura de Archivos

```
app/
├── login/
│   └── page.tsx              # Página de login
├── api/
│   └── auth/
│       ├── login/
│       │   └── route.ts      # API de login
│       ├── logout/
│       │   └── route.ts      # API de logout
│       └── user/
│           └── route.ts      # API para obtener usuario actual
├── components/
│   ├── Header.tsx            # Muestra usuario autenticado
│   └── Sidebar.tsx            # Incluye botón de logout
├── LayoutWrapper.tsx          # Verifica autenticación
└── utils/
    └── auth.ts                # Helpers de autenticación

middleware.ts                  # Protege todas las rutas
```

## Rutas Protegidas

Todas las rutas están protegidas excepto:
- `/login` - Página de login
- `/portal/*` - Portal de socios (tiene su propia autenticación)
- `/api/portal/*` - APIs del portal

## Flujo de Autenticación

1. **Usuario accede a cualquier ruta** → Middleware verifica autenticación
2. **Si no está autenticado** → Redirige a `/login`
3. **Usuario ingresa credenciales** → Se autentica con Supabase Auth
4. **Sesión se guarda en cookies** → Automáticamente gestionado por Supabase SSR
5. **Usuario navega** → Middleware verifica sesión en cada request
6. **Usuario hace logout** → Se limpia la sesión y redirige a `/login`

## Personalización

### Agregar Metadata al Usuario

Puedes agregar metadata personalizada al crear usuarios:

```typescript
// En Supabase Dashboard o desde código
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: {
    nombre: 'Juan Pérez',
    rol: 'administrador',
  }
});
```

Esta metadata se mostrará en el Header.

### Cambiar Contraseña

Los usuarios pueden cambiar su contraseña desde Supabase Dashboard:
1. **Authentication** → **Users**
2. Seleccionar usuario
3. Click en **Reset password** o **Change password**

### Configurar Políticas RLS (Opcional)

Si quieres usar Row Level Security en Supabase:

```sql
-- Ejemplo: Solo permitir que usuarios autenticados vean datos
CREATE POLICY "Usuarios autenticados pueden leer"
ON socios FOR SELECT
TO authenticated
USING (true);
```

## Troubleshooting

### Problema: "Siempre logueado el mismo usuario"

**Causa**: Probablemente estás usando `SERVICE_ROLE_KEY` en lugar de `ANON_KEY`.

**Solución**: 
1. Verifica variables de entorno en Vercel
2. Asegúrate de usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Reinicia el deployment

### Problema: No puedo hacer login

**Causa**: Usuario no existe o email no confirmado.

**Solución**:
1. Verifica que el usuario existe en Supabase Dashboard
2. Si requiere confirmación, confirma el email o desactiva "Enable email confirmations"

### Problema: Redirección infinita

**Causa**: Middleware está bloqueando `/login`.

**Solución**: Verifica que `/login` esté en la lista de rutas públicas en `middleware.ts`.

## Seguridad

- ✅ Las contraseñas se almacenan hasheadas (bcrypt)
- ✅ Las sesiones se gestionan mediante cookies httpOnly
- ✅ El middleware verifica autenticación en cada request
- ✅ Las rutas API pueden protegerse adicionalmente usando `requireAuth()`

## Próximos Pasos (Opcional)

- [ ] Implementar recuperación de contraseña
- [ ] Agregar roles y permisos
- [ ] Implementar 2FA (autenticación de dos factores)
- [ ] Agregar logs de auditoría de autenticación
- [ ] Implementar sesiones con expiración configurable


