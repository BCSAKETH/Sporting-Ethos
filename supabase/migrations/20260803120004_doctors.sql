-- 04: doctors and their weekly availability

do $$ begin
  create type public.doctor_status as enum ('active', 'on_leave', 'inactive');
exception when duplicate_object then null; end $$;

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  qualifications text,
  specialization text,
  years_experience int check (years_experience is null or years_experience >= 0),
  biography text,
  languages text[] not null default '{}',
  consultation_fee numeric(10,2),
  profile_photo_url text,
  phone text,
  email text unique,
  status public.doctor_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doctors_department on public.doctors(department_id);
create index if not exists idx_doctors_hospital on public.doctors(hospital_id);
create index if not exists idx_doctors_status on public.doctors(status);

drop trigger if exists set_doctors_updated_at on public.doctors;
create trigger set_doctors_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  appointment_duration_minutes int not null default 15 check (appointment_duration_minutes > 0),
  max_patients int check (max_patients is null or max_patients > 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, weekday),
  check (end_time > start_time)
);

create index if not exists idx_doctor_availability_doctor on public.doctor_availability(doctor_id);

drop trigger if exists set_doctor_availability_updated_at on public.doctor_availability;
create trigger set_doctor_availability_updated_at
  before update on public.doctor_availability
  for each row execute function public.set_updated_at();
