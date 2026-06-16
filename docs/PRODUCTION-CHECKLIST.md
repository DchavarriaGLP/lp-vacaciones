# Checklist de Producción — LP Vacaciones

## 1. Base de datos (Supabase) — orden obligatorio
Ejecutar en SQL Editor, en orden:

- [ ] `supabase/migrations/0001_initial_schema.sql`
- [ ] `supabase/migrations/0002_seed_base_data.sql`
- [ ] `supabase/migrations/0003_app_users_password.sql`
- [ ] `supabase/migrations/0004_seed_users.sql`

Verificación post-migración:
```sql
select count(*) from app_users;                    -- >= 2 (más empleados)
select username, role from app_users where role in ('admin','manager');
select verify_password((select password_hash from app_users where username='daniel.chavarria'), '12345'); -- true
```

## 2. Variables de entorno (Vercel → Project Settings → Environment Variables)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview — nunca exponer al cliente)
- [ ] `SESSION_SECRET` (≥16 chars; `openssl rand -base64 32`). **Sin esto, prod lanza error al firmar cookies.**
- [ ] `NEXT_PUBLIC_APP_URL`

## 3. Build y calidad
- [ ] `npm ci` sin errores
- [ ] `npm run typecheck` → 0 errores  ✅ verificado
- [ ] `npm run test` → todos pasan  ✅ 9/9 verificado
- [ ] `npm run build` (Vercel) sin errores
- [ ] CI verde (`.github/workflows/ci.yml`)

## 4. Verificación funcional (smoke test post-deploy)
- [ ] `GET /api/health` → `{ status: "ok" }`
- [ ] Login `daniel.chavarria` / `12345` → entra como **admin**
- [ ] Login `antonella` / `12345` → entra como **manager**
- [ ] `/admin/usuarios` lista usuarios con estado de contraseña y permite **resetear**
- [ ] Cambiar rol de un usuario funciona
- [ ] Crear solicitud de vacaciones → aparece en `/aprobaciones` del manager
- [ ] Aprobar/rechazar actualiza saldo y notifica
- [ ] Usuario no autenticado es redirigido a `/login`
- [ ] Usuario `employee` NO puede entrar a `/admin/usuarios` (redirige a `/dashboard`)

## 5. Seguridad (verificado en código)
- [x] Cookie `lp_session`: HttpOnly + SameSite=Lax + **Secure en producción**
- [x] Firma HMAC-SHA256 con comparación en tiempo constante
- [x] `SESSION_SECRET` obligatorio en producción (sin default inseguro)
- [x] Passwords con bcrypt (`pgcrypto`), nunca en texto plano ni en logs
- [x] Rate limiting en `/api/auth/login` (10 intentos / 15 min por IP)
- [x] Server actions de admin validan rol antes de ejecutar
- [x] `service_role` solo en server-side
- [ ] **Pendiente recomendado:** que cada usuario cambie su contraseña por defecto (`set_user_password`)
- [ ] **Pendiente recomendado:** habilitar RLS en Supabase como defensa en profundidad

## 6. Post-deploy
- [ ] Trigger deploy hook:
  `curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_9thtX1DleqW7OYWQcbqKLQyvD2Zu/9OrYQ61C0o"`
- [ ] Monitoreo de `/api/health` (uptime check)
- [ ] Revisar logs de Vercel tras el primer login real
