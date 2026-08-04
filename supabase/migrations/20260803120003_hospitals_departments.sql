-- 03: hospitals and departments

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_hospitals_updated_at on public.hospitals;
create trigger set_hospitals_updated_at
  before update on public.hospitals
  for each row execute function public.set_updated_at();

do $$ begin
  create type public.department_type as enum ('OPD', 'IPD', 'SUPPORT');
exception when duplicate_object then null; end $$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  department_type public.department_type not null,
  icon text,
  color text,
  floor text,
  location text,
  consultation_fee numeric(10,2),
  operating_hours jsonb,
  contact_number text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hospital_id, code)
);

create index if not exists idx_departments_hospital on public.departments(hospital_id);
create index if not exists idx_departments_type on public.departments(department_type);

drop trigger if exists set_departments_updated_at on public.departments;
create trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();
