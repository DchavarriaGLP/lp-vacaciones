-- =====================================================================
-- 0008_saldo_base_devengo.sql
-- Modelo de saldo de vacaciones que NO se resetea:
--   dias_base  = saldo a fecha de corte (mayor entre el saldo del Excel
--                y el devengo legal del periodo vigente desde el ingreso)
--   fecha_base = fecha de corte (desde la cual el frontend suma el devengo)
-- El saldo mostrado por la app = dias_base + (días desde fecha_base)*(30/365).
-- Mantiene alertas de riesgo legal (>60 días).
-- Idempotente.
-- =====================================================================

alter table employees add column if not exists dias_base  numeric;
alter table employees add column if not exists fecha_base date;

-- Base = MAX(saldo actual/Excel, devengo del periodo vigente desde el ingreso)
-- Devengo periodo vigente = meses desde el último aniversario * (30/11), tope 30.
update employees
set dias_base = greatest(
      coalesce(dias_base, dias_pendientes, 0),
      least(30, round((date_part('month', age(current_date, hire_date))::numeric) * (30.0/11.0), 1))
    ),
    fecha_base = current_date
where hire_date is not null;

-- Empleados sin fecha de ingreso: base = saldo actual
update employees
set dias_base = coalesce(dias_base, dias_pendientes, 0), fecha_base = current_date
where dias_base is null;

-- Sincronizar dias_pendientes con la base (el devengo futuro lo calcula la app)
update employees set dias_pendientes = dias_base;
