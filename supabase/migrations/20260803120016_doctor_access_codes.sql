-- 16: Doctor Access Codes & Kiosk Department Access
--
-- 1) Adds `access_code` (unique text) to `public.doctors` for staff portal lookup.
-- 2) Updates seeded doctors with standardized staff access codes.
-- 3) Adds SECURITY DEFINER RPC `get_doctor_by_code(p_code)` for secure staff login.
-- 4) Opens public read access on active `departments` for staff kiosk/queue filtering.

alter table public.doctors
  add column if not exists access_code text unique;

create index if not exists idx_doctors_access_code on public.doctors(access_code);

-- Seed access codes for doctors in Mumbai & Delhi hospitals
update public.doctors set access_code = '101' where email = 'aarav.sharma@sportingethos.health';
update public.doctors set access_code = '102' where email = 'rohan.mehta@sportingethos.health';
update public.doctors set access_code = '103' where email = 'vikram.singh@sportingethos.health';
update public.doctors set access_code = '104' where email = 'priya.nair@sportingethos.health';
update public.doctors set access_code = '105' where email = 'ishaan.verma@sportingethos.health';
update public.doctors set access_code = '106' where email = 'sanjay.gupta@sportingethos.health';
update public.doctors set access_code = '107' where email = 'neha.kulkarni@sportingethos.health';
update public.doctors set access_code = '108' where email = 'ananya.rao@sportingethos.health';
update public.doctors set access_code = '109' where email = 'kavita.iyer@sportingethos.health';
update public.doctors set access_code = '110' where email = 'ritu.chawla@sportingethos.health';

-- RPC function for staff portal authentication by access code
create or replace function public.get_doctor_by_code(p_code text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  full_name text,
  specialization text,
  department_id uuid,
  department_name text,
  is_nurse boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    d.id,
    d.first_name,
    d.last_name,
    (d.first_name || ' ' || d.last_name) as full_name,
    d.specialization,
    d.department_id,
    dept.name as department_name,
    false as is_nurse
  from public.doctors d
  left join public.departments dept on dept.id = d.department_id
  where lower(d.access_code) = lower(trim(p_code))
    and d.status = 'active'
  limit 1;
$$;

grant execute on function public.get_doctor_by_code(text) to anon, authenticated;

-- Allow anon kiosk and web staff console to read active departments
drop policy if exists "departments_read_authenticated" on public.departments;
drop policy if exists "departments_read_public" on public.departments;
create policy "departments_read_public" on public.departments
  for select using (is_active = true);
