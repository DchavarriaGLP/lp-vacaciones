-- =====================================================================
-- 0001_initial_schema.sql
-- LP Vacaciones — Esquema inicial
-- Sistema de gestión de vacaciones (legislación Panamá)
-- Auth propio (cookie HMAC); Supabase se usa SOLO como base de datos.
-- Idempotente: seguro de re-ejecutar.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('employee','manager','hr','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employee_status as enum ('active','on_leave','on_vacation','terminated','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('draft','pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_decision as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('request_submitted','approved','rejected','balance_warning','reminder');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_calc_basis as enum ('avg_11m','last_base');
exception when duplicate_object then null; end $$;

-- ---------- companies ----------
create table if not exists companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  ruc         text,
  legal_rep   text,
  created_at  timestamptz not null default now()
);

-- ---------- projects ----------
create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  full_label  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- app_users ----------
-- Sin FK a auth.users: auth propio. password_hash via pgcrypto (bcrypt).
create table if not exists app_users (
  id                uuid primary key default uuid_generate_v4(),
  email             text,
  username          text not null unique,
  role              user_role not null default 'employee',
  password_hash     text,
  password_changed  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- employees ----------
create table if not exists employees (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  user_id         uuid references app_users(id) on delete set null,
  employee_code   text not null,
  cedula          text,
  full_name       text not null,
  first_name      text,
  last_name       text,
  genero          text,
  email           text not null,
  username        text not null,
  position        text,
  department      text,
  jefe_directo    text,
  manager_id      uuid references employees(id) on delete set null,
  hire_date       date not null,
  terminated_at   date,
  mes_vacaciones  text,
  dias_pendientes numeric not null default 0,
  monthly_salary  numeric,
  status          employee_status not null default 'active',
  role            user_role not null default 'employee',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- vacation_policies ----------
create table if not exists vacation_policies (
  id                      uuid primary key default uuid_generate_v4(),
  company_id              uuid references companies(id) on delete cascade,
  name                    text not null,
  is_default              boolean not null default false,
  accrual_days_per_month  numeric not null default 2.5,
  max_accumulated_days    numeric not null default 60,
  max_accumulated_periods integer not null default 2,
  allow_fraction          boolean not null default false,
  max_fractions           integer not null default 2,
  advance_notice_days     integer not null default 60,
  payment_lead_days       integer not null default 3,
  payment_calc_basis      payment_calc_basis not null default 'avg_11m',
  approval_levels         integer not null default 1,
  created_at              timestamptz not null default now()
);

-- ---------- leave_types ----------
create table if not exists leave_types (
  id                uuid primary key default uuid_generate_v4(),
  code              text not null unique,
  name              text not null,
  name_es           text not null,
  is_paid           boolean not null default true,
  affects_balance   boolean not null default true,
  max_days_per_year integer,
  requires_document boolean not null default false,
  legal_basis       text,
  active             boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ---------- vacation_balances ----------
create table if not exists vacation_balances (
  id                          uuid primary key default uuid_generate_v4(),
  employee_id                 uuid not null references employees(id) on delete cascade,
  policy_id                   uuid not null references vacation_policies(id) on delete restrict,
  period_year                 integer not null,
  accrued_days                numeric not null default 0,
  used_days                   numeric not null default 0,
  available_days              numeric not null default 0,
  accumulation_authorized_at  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (employee_id, period_year)
);

-- ---------- vacation_requests ----------
create table if not exists vacation_requests (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references companies(id) on delete cascade,
  employee_id       uuid not null references employees(id) on delete cascade,
  policy_id         uuid not null references vacation_policies(id) on delete restrict,
  leave_type_id     uuid references leave_types(id) on delete set null,
  start_date        date not null,
  end_date          date not null,
  business_days     integer not null,
  calendar_days     integer not null,
  reason            text,
  status            request_status not null default 'pending',
  fraction_index    integer not null default 1,
  fraction_total    integer not null default 1,
  short_notice      boolean not null default false,
  short_notice_ack  boolean not null default false,
  submitted_at      timestamptz,
  decided_at        timestamptz,
  decided_by        uuid references app_users(id) on delete set null,
  decision_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- approval_steps ----------
create table if not exists approval_steps (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  request_id   uuid not null references vacation_requests(id) on delete cascade,
  step_order   integer not null default 1,
  approver_id  uuid not null references app_users(id) on delete cascade,
  decision     approval_decision not null default 'pending',
  notes        text,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- audit_logs ----------
create table if not exists audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid references companies(id) on delete set null,
  actor_id      uuid not null,
  actor_email   text,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  before_state  jsonb,
  after_state   jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

-- ---------- notifications ----------
create table if not exists notifications (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid references companies(id) on delete set null,
  recipient_id  uuid not null references app_users(id) on delete cascade,
  type          notification_type not null,
  title         text not null,
  body          text,
  link_url      text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- payroll_events ----------
create table if not exists payroll_events (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  source_type   text not null,
  source_id     uuid,
  event_type    text not null,
  scheduled_at  date not null,
  calc_basis    payment_calc_basis,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Índices de rendimiento ----------
create index if not exists idx_app_users_username        on app_users (username);
create index if not exists idx_employees_user_id          on employees (user_id);
create index if not exists idx_employees_username         on employees (username);
create index if not exists idx_employees_manager_id       on employees (manager_id);
create index if not exists idx_employees_company          on employees (company_id);
create index if not exists idx_vac_balances_emp_year      on vacation_balances (employee_id, period_year);
create index if not exists idx_vac_requests_employee      on vacation_requests (employee_id);
create index if not exists idx_vac_requests_status        on vacation_requests (status);
create index if not exists idx_approval_steps_request     on approval_steps (request_id);
create index if not exists idx_approval_steps_approver    on approval_steps (approver_id);
create index if not exists idx_notifications_recipient    on notifications (recipient_id, read_at);
create index if not exists idx_payroll_events_employee    on payroll_events (employee_id);
create index if not exists idx_audit_logs_entity          on audit_logs (entity_type, entity_id);

-- ---------- RPC: increment_used_days ----------
-- Suma días usados y recalcula disponibles, de forma atómica.
create or replace function increment_used_days(
  p_employee_id uuid,
  p_period_year integer,
  p_days        numeric
) returns void
language sql
as $$
  update vacation_balances
     set used_days      = used_days + p_days,
         available_days = accrued_days - (used_days + p_days),
         updated_at     = now()
   where employee_id = p_employee_id
     and period_year = p_period_year;
$$;

-- ---------- Trigger updated_at ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger trg_app_users_updated   before update on app_users         for each row execute function set_updated_at();
  create trigger trg_employees_updated    before update on employees          for each row execute function set_updated_at();
  create trigger trg_balances_updated     before update on vacation_balances  for each row execute function set_updated_at();
  create trigger trg_requests_updated     before update on vacation_requests  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
