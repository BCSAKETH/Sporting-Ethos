-- 08: link the existing kiosk `checkins` table into the normalized schema
--
-- Additive only (per project policy: never destroy data, prefer ALTER TABLE).
-- RLS on checkins is intentionally left untouched here: the web kiosk and the
-- reception dashboard are both anonymous, no-login surfaces today, and stay
-- that way. These new columns are nullable so existing rows are unaffected;
-- the mobile app populates them when a logged-in patient uses spot check-in.

alter table public.checkins
  add column if not exists patient_id uuid references public.profiles(id) on delete set null,
  add column if not exists hospital_id uuid references public.hospitals(id) on delete set null,
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists doctor_id uuid references public.doctors(id) on delete set null,
  add column if not exists appointment_ref uuid references public.appointments(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_checkins_patient on public.checkins(patient_id);
create index if not exists idx_checkins_appointment_ref on public.checkins(appointment_ref);

drop trigger if exists set_checkins_updated_at on public.checkins;
create trigger set_checkins_updated_at
  before update on public.checkins
  for each row execute function public.set_updated_at();
