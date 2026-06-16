# LP Vacaciones — Sistema de Gestión de Vacaciones

Aplicación web para gestionar solicitudes de vacaciones bajo la legislación laboral
de Panamá (Código de Trabajo). Flujo de solicitud → aprobación (manager/admin) →
actualización de saldo → evento de nómina, con auditoría y notificaciones.

## Stack

- **Next.js 15** (App Router, React 19, Server Actions)
- **TypeScript** (strict)
- **Supabase** — usado **solo como base de datos PostgreSQL** (Auth propio, no Supabase Auth)
- **Tailwind CSS** + Radix UI
- **Zod** (validación), **Vitest** (tests)
- Deploy: **Vercel**

## Autenticación (propia, sin Supabase Auth)

- Cookie `lp_session`: **HttpOnly**, firmada con **HMAC-SHA256**, `Secure` en producción.
- Payload de sesión: `{ id, username, role, employeeId }`.
- Roles: `admin | manager | employee`.
- Contraseñas: **bcrypt** vía `pgcrypto` (`crypt()` / `gen_salt('bf')`).
- Verificación de clave en DB con la función `verify_password`.
- Rate limiting básico por IP en `/api/auth/login` (10 intentos / 15 min).

Archivos clave: `src/lib/auth/session.ts`, `src/app/api/auth/login/route.ts`,
`src/app/api/auth/logout/route.ts`, `src/middleware.ts`.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **solo server-side** |
| `SESSION_SECRET` | Secreto para firmar cookies. **Obligatorio en prod**, ≥16 chars. `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

## Base de datos — migraciones

Ejecutar **en orden** en el SQL Editor de Supabase (o `supabase db push`):

1. `supabase/migrations/0001_initial_schema.sql` — tablas, enums, índices, RPC `increment_used_days`.
2. `supabase/migrations/0002_seed_base_data.sql` — empresa, política Panamá por defecto, tipos de licencia.
3. `supabase/migrations/0003_app_users_password.sql` — funciones `verify_password`, `admin_reset_password`, `set_user_password`.
4. `supabase/migrations/0004_seed_users.sql` — usuarios `daniel.chavarria` (admin), `antonella` (manager) y auto-provisión de empleados.

Todas son **idempotentes** (seguras de re-ejecutar).

### Credenciales por defecto
- Todos los empleados: `nombre.apellido` / `12345`
- `daniel.chavarria` → admin
- `antonella` → manager (asistente RRHH)

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # validación de tipos
npm run test       # unit tests (Vitest)
npm run build      # build de producción
```

## Rutas

| Ruta | Rol | Descripción |
|---|---|---|
| `/login` | público | Inicio de sesión |
| `/dashboard` | todos | Panel principal |
| `/vacaciones` | todos | Mis solicitudes / nueva |
| `/aprobaciones` | manager, admin | Aprobar solicitudes |
| `/equipo` | manager, admin | Mi equipo |
| `/empleados` | admin | Lista de empleados |
| `/riesgo-legal` | admin | Riesgo legal |
| `/solicitudes` | admin | Todas las solicitudes |
| `/admin/usuarios` | admin | Gestión de usuarios y reset de contraseñas |
| `/api/health` | público | Health check |

## Despliegue (Vercel)

1. Configurar las variables de entorno del proyecto (incluido `SESSION_SECRET`).
2. Ejecutar las 4 migraciones en Supabase.
3. Deploy hook:
   ```bash
   curl -X POST "$VERCEL_DEPLOY_HOOK"
   ```

Ver `docs/PRODUCTION-CHECKLIST.md` para el checklist completo de producción.
