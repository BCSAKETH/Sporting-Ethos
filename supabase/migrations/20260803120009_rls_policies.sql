-- 09: Row Level Security for every new table.
--
-- checkins and medicines are intentionally NOT touched here (see 08 and the
-- original supabase-schema.sql) — they keep the open, anonymous kiosk policy
-- the live web app depends on.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- profiles -------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- catalog tables: any authenticated user can read, only admin can write ---
alter table public.hospitals enable row level security;
drop policy if exists "hospitals_read_authenticated" on public.hospitals;
create policy "hospitals_read_authenticated" on public.hospitals
  for select using (auth.role() = 'authenticated');
drop policy if exists "hospitals_write_admin" on public.hospitals;
create policy "hospitals_write_admin" on public.hospitals
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.departments enable row level security;
drop policy if exists "departments_read_authenticated" on public.departments;
create policy "departments_read_authenticated" on public.departments
  for select using (auth.role() = 'authenticated');
drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.doctors enable row level security;
drop policy if exists "doctors_read_authenticated" on public.doctors;
create policy "doctors_read_authenticated" on public.doctors
  for select using (auth.role() = 'authenticated');
drop policy if exists "doctors_write_admin" on public.doctors;
create policy "doctors_write_admin" on public.doctors
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.doctor_availability enable row level security;
drop policy if exists "doctor_availability_read_authenticated" on public.doctor_availability;
create policy "doctor_availability_read_authenticated" on public.doctor_availability
  for select using (auth.role() = 'authenticated');
drop policy if exists "doctor_availability_write_admin" on public.doctor_availability;
create policy "doctor_availability_write_admin" on public.doctor_availability
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.diseases enable row level security;
drop policy if exists "diseases_read_authenticated" on public.diseases;
create policy "diseases_read_authenticated" on public.diseases
  for select using (auth.role() = 'authenticated');
drop policy if exists "diseases_write_admin" on public.diseases;
create policy "diseases_write_admin" on public.diseases
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.allergies enable row level security;
drop policy if exists "allergies_read_authenticated" on public.allergies;
create policy "allergies_read_authenticated" on public.allergies
  for select using (auth.role() = 'authenticated');
drop policy if exists "allergies_write_admin" on public.allergies;
create policy "allergies_write_admin" on public.allergies
  for all using (public.is_admin()) with check (public.is_admin());

-- appointments -----------------------------------------------------------
alter table public.appointments enable row level security;
drop policy if exists "appointments_select_own_or_admin" on public.appointments;
create policy "appointments_select_own_or_admin" on public.appointments
  for select using (patient_id = auth.uid() or public.is_admin());
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert with check (patient_id = auth.uid() or public.is_admin());
drop policy if exists "appointments_update_own_or_admin" on public.appointments;
create policy "appointments_update_own_or_admin" on public.appointments
  for update using (patient_id = auth.uid() or public.is_admin())
  with check (patient_id = auth.uid() or public.is_admin());
drop policy if exists "appointments_delete_admin" on public.appointments;
create policy "appointments_delete_admin" on public.appointments
  for delete using (public.is_admin());

alter table public.appointment_status_history enable row level security;
drop policy if exists "appt_history_select_own_or_admin" on public.appointment_status_history;
create policy "appt_history_select_own_or_admin" on public.appointment_status_history
  for select using (
    public.is_admin() or exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.patient_id = auth.uid()
    )
  );

-- patient medical data -----------------------------------------------------
alter table public.patient_diseases enable row level security;
drop policy if exists "patient_diseases_all_own_or_admin" on public.patient_diseases;
create policy "patient_diseases_all_own_or_admin" on public.patient_diseases
  for all using (patient_id = auth.uid() or public.is_admin())
  with check (patient_id = auth.uid() or public.is_admin());

alter table public.patient_allergies enable row level security;
drop policy if exists "patient_allergies_all_own_or_admin" on public.patient_allergies;
create policy "patient_allergies_all_own_or_admin" on public.patient_allergies
  for all using (patient_id = auth.uid() or public.is_admin())
  with check (patient_id = auth.uid() or public.is_admin());

-- notifications & devices ---------------------------------------------------
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications
  for select using (patient_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert with check (public.is_admin());

alter table public.device_tokens enable row level security;
drop policy if exists "device_tokens_all_own" on public.device_tokens;
create policy "device_tokens_all_own" on public.device_tokens
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- audit ----------------------------------------------------------------------
alter table public.activity_logs enable row level security;
drop policy if exists "activity_logs_select_admin" on public.activity_logs;
create policy "activity_logs_select_admin" on public.activity_logs
  for select using (public.is_admin());
