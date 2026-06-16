-- =====================================================================
-- 0004_seed_users.sql
-- Usuarios iniciales del sistema.
-- Contraseña por defecto para todos: 12345 (bcrypt via pgcrypto).
-- Orden obligatorio: ejecutar DESPUÉS de 0003.
-- Idempotente (on conflict username).
--
-- Usuarios garantizados:
--   daniel.chavarria  -> admin
--   antonella         -> manager (asistente RRHH)
--
-- Los ~212 empleados restantes se generan automáticamente a partir de la
-- tabla employees (ver bloque "AUTO-PROVISIÓN" al final): por cada employee
-- con username que no tenga app_user, se crea uno con rol 'employee' y
-- contraseña 12345, y se enlaza employees.user_id.
-- =====================================================================

-- ---------- Usuarios críticos ----------
insert into app_users (username, email, role, password_hash, password_changed)
values
  ('daniel.chavarria', 'dchavarria@glp.com.pa', 'admin',
   crypt('12345', gen_salt('bf')), false),
  ('antonella', null, 'manager',
   crypt('12345', gen_salt('bf')), false)
on conflict (username) do update
  set role = excluded.role;

-- ---------- AUTO-PROVISIÓN desde employees ----------
-- Crea un app_user por cada employee sin usuario, con contraseña 12345.
insert into app_users (username, email, role, password_hash, password_changed)
select e.username,
       e.email,
       'employee'::user_role,
       crypt('12345', gen_salt('bf')),
       false
from employees e
where e.username is not null
  and not exists (select 1 from app_users u where u.username = e.username)
on conflict (username) do nothing;

-- Enlazar employees.user_id con app_users por username
update employees e
   set user_id = u.id
  from app_users u
 where u.username = e.username
   and (e.user_id is null or e.user_id <> u.id);
