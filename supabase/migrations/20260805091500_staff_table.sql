-- 17: live hospital staff & access-code system
--
-- The web app's staff login (src/pages/AccessGate.jsx -> verifyStaffAccessCode)
-- and the Admin portal's staff management (src/pages/Admin.jsx ->
-- listStaff/addStaff/updateStaff/deleteStaff) were already built against a
-- `staff` table that never existed, so every environment silently ran on a
-- localStorage mock list seeded with well-known default PINs
-- (admin=9999, reception=1111, doctor=2222, pharmacist=3333) that were shown
-- directly on the public login screen. This creates the real table.
--
-- Access codes are stored in PLAIN TEXT, matching the already-built Admin UI,
-- which displays and edits PINs directly (the staff roster shows
-- "🔑 {access_code}" and offers "Edit / Reset PIN"). See docs/migrations.md
-- for the security tradeoff this implies and why it was still the right call
-- here (matches the pattern already established for `checkins`/`medicines`
-- in this project, and hashing would break the existing "admin can see/reset
-- a staff member's PIN" UI, which is an intentional design choice, not a bug).

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin', 'reception', 'doctor', 'pharmacist')),
  access_code text not null unique,
  department_id uuid references public.departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_department on public.staff(department_id);
create index if not exists idx_staff_role on public.staff(role);

drop trigger if exists set_staff_updated_at on public.staff;
create trigger set_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- No Supabase Auth session backs this login — AccessGate checks the access
-- code directly, pre-auth, exactly like the pre-existing checkins/medicines
-- kiosk tables in this project. So `staff` has to be reachable by the `anon`
-- role for the login check (and the Admin portal's own CRUD calls, which run
-- as the same anon role — there's no server-side session to scope them to)
-- to work at all. This is a real, known tradeoff: anyone holding the public
-- anon key can also read or write this table, including every plaintext
-- access code. Flagged explicitly to the user; not a silent decision.
alter table public.staff enable row level security;

drop policy if exists "staff_anon_all" on public.staff;
create policy "staff_anon_all" on public.staff for all using (true) with check (true);
