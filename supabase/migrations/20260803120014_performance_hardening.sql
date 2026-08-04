-- 14: performance hardening per Supabase advisor (get_advisors, type=performance)
--
-- - Wrap auth.*()/is_admin() calls in `(select ...)` so Postgres evaluates them
--   once per query via an initplan instead of once per row.
-- - Split catalog "write admin" policies from FOR ALL to INSERT/UPDATE/DELETE,
--   removing the duplicate permissive SELECT policy that stacked with the
--   dedicated read policy on every catalog table.
-- - Add indexes for FK columns the advisor flagged as unindexed.

-- profiles ------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- catalog tables: one SELECT policy (authenticated) + write policies split
-- off SELECT so they don't stack as a second permissive SELECT policy -----
drop policy if exists "hospitals_read_authenticated" on public.hospitals;
create policy "hospitals_read_authenticated" on public.hospitals
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "hospitals_write_admin" on public.hospitals;
create policy "hospitals_write_admin" on public.hospitals
  for insert with check ((select public.is_admin()));
create policy "hospitals_update_admin" on public.hospitals
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "hospitals_delete_admin" on public.hospitals
  for delete using ((select public.is_admin()));

drop policy if exists "departments_read_authenticated" on public.departments;
create policy "departments_read_authenticated" on public.departments
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments
  for insert with check ((select public.is_admin()));
create policy "departments_update_admin" on public.departments
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "departments_delete_admin" on public.departments
  for delete using ((select public.is_admin()));

drop policy if exists "doctors_read_authenticated" on public.doctors;
create policy "doctors_read_authenticated" on public.doctors
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "doctors_write_admin" on public.doctors;
create policy "doctors_write_admin" on public.doctors
  for insert with check ((select public.is_admin()));
create policy "doctors_update_admin" on public.doctors
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "doctors_delete_admin" on public.doctors
  for delete using ((select public.is_admin()));

drop policy if exists "doctor_availability_read_authenticated" on public.doctor_availability;
create policy "doctor_availability_read_authenticated" on public.doctor_availability
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "doctor_availability_write_admin" on public.doctor_availability;
create policy "doctor_availability_write_admin" on public.doctor_availability
  for insert with check ((select public.is_admin()));
create policy "doctor_availability_update_admin" on public.doctor_availability
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "doctor_availability_delete_admin" on public.doctor_availability
  for delete using ((select public.is_admin()));

drop policy if exists "diseases_read_authenticated" on public.diseases;
create policy "diseases_read_authenticated" on public.diseases
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "diseases_write_admin" on public.diseases;
create policy "diseases_write_admin" on public.diseases
  for insert with check ((select public.is_admin()));
create policy "diseases_update_admin" on public.diseases
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "diseases_delete_admin" on public.diseases
  for delete using ((select public.is_admin()));

drop policy if exists "allergies_read_authenticated" on public.allergies;
create policy "allergies_read_authenticated" on public.allergies
  for select using ((select auth.role()) = 'authenticated');
drop policy if exists "allergies_write_admin" on public.allergies;
create policy "allergies_write_admin" on public.allergies
  for insert with check ((select public.is_admin()));
create policy "allergies_update_admin" on public.allergies
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "allergies_delete_admin" on public.allergies
  for delete using ((select public.is_admin()));

-- appointments -----------------------------------------------------------
drop policy if exists "appointments_select_own_or_admin" on public.appointments;
create policy "appointments_select_own_or_admin" on public.appointments
  for select using (patient_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert with check (patient_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "appointments_update_own_or_admin" on public.appointments;
create policy "appointments_update_own_or_admin" on public.appointments
  for update using (patient_id = (select auth.uid()) or (select public.is_admin()))
  with check (patient_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "appointments_delete_admin" on public.appointments;
create policy "appointments_delete_admin" on public.appointments
  for delete using ((select public.is_admin()));

drop policy if exists "appt_history_select_own_or_admin" on public.appointment_status_history;
create policy "appt_history_select_own_or_admin" on public.appointment_status_history
  for select using (
    (select public.is_admin()) or exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.patient_id = (select auth.uid())
    )
  );

-- patient medical data -----------------------------------------------------
drop policy if exists "patient_diseases_all_own_or_admin" on public.patient_diseases;
create policy "patient_diseases_all_own_or_admin" on public.patient_diseases
  for all using (patient_id = (select auth.uid()) or (select public.is_admin()))
  with check (patient_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "patient_allergies_all_own_or_admin" on public.patient_allergies;
create policy "patient_allergies_all_own_or_admin" on public.patient_allergies
  for all using (patient_id = (select auth.uid()) or (select public.is_admin()))
  with check (patient_id = (select auth.uid()) or (select public.is_admin()));

-- notifications & devices ---------------------------------------------------
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications
  for select using (patient_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));
drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert with check ((select public.is_admin()));

drop policy if exists "device_tokens_all_own" on public.device_tokens;
create policy "device_tokens_all_own" on public.device_tokens
  for all using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));

-- audit ----------------------------------------------------------------------
drop policy if exists "activity_logs_select_admin" on public.activity_logs;
create policy "activity_logs_select_admin" on public.activity_logs
  for select using ((select public.is_admin()));

-- missing FK indexes flagged by the performance advisor ---------------------
create index if not exists idx_appointment_status_history_changed_by on public.appointment_status_history(changed_by);
create index if not exists idx_appointments_department on public.appointments(department_id);
create index if not exists idx_checkins_department on public.checkins(department_id);
create index if not exists idx_checkins_doctor on public.checkins(doctor_id);
create index if not exists idx_checkins_hospital on public.checkins(hospital_id);
create index if not exists idx_doctors_profile on public.doctors(profile_id);
create index if not exists idx_patient_allergies_allergy on public.patient_allergies(allergy_id);
create index if not exists idx_patient_diseases_disease on public.patient_diseases(disease_id);
