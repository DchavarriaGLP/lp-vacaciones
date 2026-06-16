-- =====================================================================
-- 0005_admin_functions.sql
-- Funciones de administración añadidas para el panel admin:
--  - set_user_password / admin_reset_password (reset de contraseñas)
--  - create_app_user (alta de usuarios desde la UI)
-- También: elimina la FK heredada a auth.users y pone default en id.
-- Idempotente.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Quitar FK heredada a auth.users (auth propio) y default de id
alter table app_users drop constraint if exists app_users_id_fkey;
alter table app_users alter column id set default gen_random_uuid();

-- Reset de contraseña por admin (vuelve a 12345 / password_changed=false)
create or replace function public.admin_reset_password(p_user_id uuid, p_new_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_found boolean;
begin
  update app_users set password_hash = crypt(p_new_password, gen_salt('bf')),
                       password_changed = false, updated_at = now()
   where id = p_user_id returning true into v_found;
  return coalesce(v_found, false);
end; $$;

-- Cambio de contraseña por el propio usuario (password_changed=true)
create or replace function public.set_user_password(p_user_id uuid, p_new_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_found boolean;
begin
  update app_users set password_hash = crypt(p_new_password, gen_salt('bf')),
                       password_changed = true, updated_at = now()
   where id = p_user_id returning true into v_found;
  return coalesce(v_found, false);
end; $$;

-- Alta de usuario nuevo con contraseña por defecto. Devuelve false si ya existe.
create or replace function public.create_app_user(
  p_username text, p_email text, p_role text, p_password text
) returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from app_users where username = lower(p_username)) then
    return false;
  end if;
  insert into app_users (id, username, email, role, password_hash, password_changed)
  values (gen_random_uuid(), lower(p_username), p_email, p_role::user_role,
          crypt(p_password, gen_salt('bf')), false);
  return true;
end; $$;
