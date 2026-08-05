-- ============================================================
-- IPD: wards → rooms → beds → admissions, + structured Rx on checkins
-- ============================================================

create sequence if not exists public.admission_seq start 1;
create or replace function public.next_admission_id()
returns text language sql security definer set search_path = public as $$
  select 'ADM-' || lpad(nextval('public.admission_seq')::text, 4, '0');
$$;

create table if not exists public.wards (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals(id),
  department_id uuid references public.departments(id),
  name text not null,
  floor text,
  total_beds int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards(id) on delete cascade,
  room_number text not null,
  room_type text not null check (room_type in ('Private','Semi-Private','General','ICU')),
  floor text,
  total_beds int not null default 0,
  daily_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_number text not null,
  status text not null default 'Available' check (status in ('Occupied','Available','Cleaning','Reserved')),
  created_at timestamptz not null default now(),
  unique (room_id, bed_number)
);

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  admission_no text unique not null default public.next_admission_id(),
  patient_id uuid references public.profiles(id),
  patient_name text not null,
  department_id uuid references public.departments(id),
  ward_id uuid references public.wards(id),
  room_id uuid references public.rooms(id),
  bed_id uuid references public.beds(id),
  doctor_id uuid references public.doctors(id),
  nurse_name text,
  admission_date timestamptz not null default now(),
  expected_discharge timestamptz,
  discharge_date timestamptz,
  room_charges numeric not null default 0,
  status text not null default 'admitted' check (status in ('admitted','discharged')),
  created_at timestamptz not null default now()
);

-- Prevent double-booking: at most ONE active (admitted) admission per bed.
create unique index if not exists uniq_active_bed_admission
  on public.admissions (bed_id)
  where (status = 'admitted' and bed_id is not null);

-- Structured prescriptions alongside free-text consult notes.
alter table public.checkins add column if not exists prescriptions jsonb;

-- RLS — same anon-key access the rest of this single-hospital app uses.
alter table public.wards enable row level security;
alter table public.rooms enable row level security;
alter table public.beds enable row level security;
alter table public.admissions enable row level security;

create policy wards_anon_all on public.wards for all to anon using (true) with check (true);
create policy rooms_anon_all on public.rooms for all to anon using (true) with check (true);
create policy beds_anon_all on public.beds for all to anon using (true) with check (true);
create policy admissions_anon_all on public.admissions for all to anon using (true) with check (true);

-- Realtime — room/bed cards update live on admit/discharge.
alter table public.beds replica identity full;
alter table public.admissions replica identity full;
alter table public.rooms replica identity full;
alter publication supabase_realtime add table public.wards, public.rooms, public.beds, public.admissions;
