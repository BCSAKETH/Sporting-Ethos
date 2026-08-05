-- The staff web console and the patient mobile app both use the Supabase ANON
-- key. Departments/doctors/availability are non-sensitive reference data the
-- UI must read to show real UUIDs — otherwise the app falls back to mock string
-- ids like 'dept-neuro' that fail UUID inserts (walk-in check-in, staff
-- department assignment). Grant the anon role SELECT on these reference tables.
create policy departments_read_anon on public.departments
  for select to anon using (true);

create policy doctors_read_anon on public.doctors
  for select to anon using (true);

create policy doctor_availability_read_anon on public.doctor_availability
  for select to anon using (true);
