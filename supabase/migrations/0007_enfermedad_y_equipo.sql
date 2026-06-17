-- =====================================================================
-- 0007_enfermedad_y_equipo.sql
-- - Saldo de enfermedad (Art. 200 CT Panamá: 18 días/año, acumula hasta 36)
-- - Campos para ausencia por enfermedad con incapacidad adjunta
-- - Bucket de Storage para incapacidades
-- - Vinculación de manager_id desde jefe_directo (Mi Equipo)
-- Idempotente.
-- =====================================================================

-- Saldo de enfermedad
alter table employees add column if not exists dias_enfermedad numeric not null default 18;

-- Campos de solicitud de enfermedad
alter table vacation_requests add column if not exists request_type   text not null default 'vacation';
alter table vacation_requests add column if not exists incapacidad_url text;
alter table vacation_requests add column if not exists incapacidad_ref text;

-- Bucket privado para incapacidades
insert into storage.buckets (id, name, public)
values ('incapacidades','incapacidades', false)
on conflict (id) do nothing;

-- Vincular manager_id desde el texto jefe_directo (match por nombre/apellido sin acentos)
create or replace function pg_temp_unaccent_up(t text) returns text language sql immutable as $f$
  select upper(translate(coalesce(t,''),'áéíóúÁÉÍÓÚñÑüÜ','aeiouAEIOUnNuU'))
$f$;

update employees e
set manager_id = j.id
from employees j
where e.jefe_directo is not null and e.jefe_directo <> '' and e.manager_id is null
  and j.id <> e.id
  and pg_temp_unaccent_up(j.full_name) like pg_temp_unaccent_up(split_part(e.jefe_directo,' ',1))||'%'
  and pg_temp_unaccent_up(j.full_name) like '%'||pg_temp_unaccent_up(reverse(split_part(reverse(trim(e.jefe_directo)),' ',1)))||'%';

drop function if exists pg_temp_unaccent_up(text);

-- Recálculo de días de vacaciones = devengado del periodo vigente (reset anual, tope 30)
update employees
set dias_pendientes = least(30, round((date_part('month', age(current_date, hire_date))::numeric) * (30.0/11.0), 1))
where hire_date is not null;
