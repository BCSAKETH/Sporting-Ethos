-- 05: appointments and their status history

do $$ begin
  create type public.appointment_status as enum
    ('requested','confirmed','checked_in','in_consult','completed','cancelled','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_priority as enum ('normal','urgent','emergency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.consultation_mode as enum ('in_person','video');
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  status public.appointment_status not null default 'requested',
  priority public.appointment_priority not null default 'normal',
  consultation_mode public.consultation_mode not null default 'in_person',
  appointment_type text not null default 'consultation',
  reason_for_visit text,
  scheduled_datetime timestamptz not null,
  token_number text,
  checkin_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_patient on public.appointments(patient_id, scheduled_datetime);
create index if not exists idx_appointments_doctor on public.appointments(doctor_id, scheduled_datetime);
create index if not exists idx_appointments_hospital_department
  on public.appointments(hospital_id, department_id, scheduled_datetime);
create index if not exists idx_appointments_status on public.appointments(status);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  status public.appointment_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appt_status_history_appt
  on public.appointment_status_history(appointment_id, created_at);

-- Every insert/status change is appended to the audit trail automatically.
create or replace function public.log_appointment_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.appointment_status_history (appointment_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_log_status on public.appointments;
create trigger appointments_log_status
  after insert or update on public.appointments
  for each row execute function public.log_appointment_status_change();
