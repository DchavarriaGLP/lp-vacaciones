-- =====================================================================
-- 0002_seed_base_data.sql
-- Datos base: empresa, política de vacaciones por defecto (Panamá),
-- tipos de licencia. Idempotente.
-- =====================================================================

-- Empresa principal (ID fijo para poder referenciarla en seeds)
insert into companies (id, name, ruc, legal_rep)
values ('00000000-0000-0000-0000-000000000001', 'LP Development Corp', null, null)
on conflict (id) do nothing;

-- Política por defecto (Código de Trabajo de Panamá):
-- 30 días por cada 11 meses continuos = 2.7272 días/mes,
-- preaviso recomendado, pago 3 días antes (Art. 54),
-- fraccionamiento solo por convención colectiva (Art. 55) => allow_fraction false.
insert into vacation_policies (
  id, company_id, name, is_default,
  accrual_days_per_month, max_accumulated_days, max_accumulated_periods,
  allow_fraction, max_fractions, advance_notice_days,
  payment_lead_days, payment_calc_basis, approval_levels
) values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'Política Panamá (default)', true,
  2.7272, 60, 2,
  false, 2, 30,
  3, 'avg_11m', 1
) on conflict (id) do nothing;

-- Tipos de licencia básicos
insert into leave_types (code, name, name_es, is_paid, affects_balance, requires_document, legal_basis)
values
  ('VAC', 'Vacation',     'Vacaciones',           true,  true,  false, 'Código de Trabajo Art. 54-58'),
  ('SICK','Sick leave',   'Incapacidad / Enfermedad', true,  false, true,  'Caja de Seguro Social'),
  ('MAT', 'Maternity',    'Licencia de maternidad', true,  false, true,  'Código de Trabajo Art. 107'),
  ('UNPD','Unpaid leave', 'Licencia sin sueldo',  false, false, false, null)
on conflict (code) do nothing;
