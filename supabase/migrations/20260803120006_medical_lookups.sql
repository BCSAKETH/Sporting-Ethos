-- 06: normalized medical lookups (diseases, allergies) + patient join tables

create table if not exists public.diseases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icd_code text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_diseases_updated_at on public.diseases;
create trigger set_diseases_updated_at
  before update on public.diseases
  for each row execute function public.set_updated_at();

create table if not exists public.patient_diseases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  disease_id uuid not null references public.diseases(id) on delete restrict,
  status text not null default 'active' check (status in ('active','resolved','chronic')),
  diagnosed_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, disease_id)
);

create index if not exists idx_patient_diseases_patient on public.patient_diseases(patient_id);

drop trigger if exists set_patient_diseases_updated_at on public.patient_diseases;
create trigger set_patient_diseases_updated_at
  before update on public.patient_diseases
  for each row execute function public.set_updated_at();

create table if not exists public.allergies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_allergies_updated_at on public.allergies;
create trigger set_allergies_updated_at
  before update on public.allergies
  for each row execute function public.set_updated_at();

create table if not exists public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  allergy_id uuid not null references public.allergies(id) on delete restrict,
  severity text check (severity in ('mild','moderate','severe')),
  reaction text,
  diagnosed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, allergy_id)
);

create index if not exists idx_patient_allergies_patient on public.patient_allergies(patient_id);

drop trigger if exists set_patient_allergies_updated_at on public.patient_allergies;
create trigger set_patient_allergies_updated_at
  before update on public.patient_allergies
  for each row execute function public.set_updated_at();
