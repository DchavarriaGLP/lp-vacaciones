-- =====================================================================
-- 0003_app_users_password.sql
-- Funciones de autenticación propia (sin Supabase Auth).
-- Passwords hasheados con bcrypt via pgcrypto: crypt() / gen_salt('bf').
-- Idempotente.
--
-- NOTA: si la tabla app_users fue creada originalmente con FK a auth.users
-- (esquema viejo), este bloque la elimina y asegura las columnas nuevas.
-- En una instalación limpia (0001) las columnas ya existen; los ALTER
-- usan IF NOT EXISTS y son no-ops.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Asegurar columnas (no-op si ya existen por 0001)
alter table app_users add column if not exists password_hash    text;
alter table app_users add column if not exists password_changed boolean not null default false;
alter table app_users alter column email drop not null;

-- Eliminar FK heredada a auth.users si existiera (esquema viejo)
do $$
declare fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'app_users'::regclass
    and contype = 'f'
    and confrelid = (select oid from pg_class where relname = 'users'
                     and relnamespace = (select oid from pg_namespace where nspname = 'auth'));
  if fk_name is not null then
    execute format('alter table app_users drop constraint %I', fk_name);
  end if;
exception when undefined_table then
  null; -- esquema auth no existe (instalación limpia)
end $$;

-- ---------- verify_password ----------
-- Compara una contraseña en claro contra un hash bcrypt almacenado.
create or replace function verify_password(p_hash text, p_password text)
returns boolean
language sql
stable
as $$
  select case
           when p_hash is null then false
           else crypt(p_password, p_hash) = p_hash
         end;
$$;

-- ---------- admin_reset_password ----------
-- Resetea la contraseña de un usuario y marca password_changed = false.
-- Devuelve true si el usuario existe.
create or replace function admin_reset_password(p_user_id uuid, p_new_password text)
returns boolean
language plpgsql
as $$
declare
  v_found boolean;
begin
  update app_users
     set password_hash    = crypt(p_new_password, gen_salt('bf')),
         password_changed = false,
         updated_at        = now()
   where id = p_user_id
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

-- ---------- set_user_password ----------
-- Permite a un usuario cambiar su propia contraseña (marca changed = true).
create or replace function set_user_password(p_user_id uuid, p_new_password text)
returns boolean
language plpgsql
as $$
declare
  v_found boolean;
begin
  update app_users
     set password_hash    = crypt(p_new_password, gen_salt('bf')),
         password_changed = true,
         updated_at        = now()
   where id = p_user_id
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;
