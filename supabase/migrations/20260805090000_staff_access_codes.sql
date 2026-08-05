-- 16: live staff access-code verification for the web "Clinical & ER Portal"
-- (src/pages/Expert.jsx).
--
-- That portal authenticates staff with a short access code instead of a
-- Supabase Auth login (no session at all — it's a plain anon request). Until
-- now `findDoctorByCode()` (src/lib/store.js) queried columns that don't
-- exist on `doctors` (`access_code`, `is_active`, `full_name`), so every
-- lookup silently failed and fell back to a hardcoded JS dictionary
-- (MOCK_DOCTORS_BY_CODE) — i.e. the portal was never actually reading live
-- staff data.
--
-- This adds a real, hashed access-code column plus a SECURITY DEFINER RPC
-- that verifies a code and returns only the minimal info the portal needs.
-- The RPC (not direct table access) is what's exposed to `anon`/`authenticated`
-- specifically so the codes/hashes themselves are never selectable — only
-- "yes, this code matched, here's who you are."
--
-- No access codes are seeded here. Seeding a real code means writing its
-- plaintext into the query that creates it, which must never land in a
-- committed migration file — see docs/migrations.md for how the bootstrap
-- admin code was issued out-of-band.

alter table public.doctors
  add column if not exists access_code_hash text unique;

comment on column public.doctors.access_code_hash is
  'bcrypt hash (pgcrypto crypt()) of the staff access code for the Clinical & ER Portal. Never store the plaintext code.';

create or replace function public.verify_staff_access_code(p_code text)
returns table (
  id uuid,
  full_name text,
  department_id uuid,
  department_name text,
  is_admin boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    d.id,
    d.first_name || ' ' || d.last_name as full_name,
    d.department_id,
    dep.name as department_name,
    (d.department_id is null) as is_admin
  from public.doctors d
  left join public.departments dep on dep.id = d.department_id
  where d.status = 'active'
    and d.access_code_hash is not null
    and p_code is not null
    and d.access_code_hash = extensions.crypt(p_code, d.access_code_hash)
  limit 1;
$$;

revoke all on function public.verify_staff_access_code(text) from public;
grant execute on function public.verify_staff_access_code(text) to anon, authenticated;
