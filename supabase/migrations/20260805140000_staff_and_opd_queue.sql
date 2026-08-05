-- Staff and OPD Queue Management Migration

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('reception', 'doctor', 'pharmacist', 'admin')),
  access_code text not null,
  department_id uuid references public.departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index access_code for fast PIN lookup
create index if not exists idx_staff_access_code on public.staff(access_code);
create index if not exists idx_staff_role on public.staff(role);

-- Updated_at trigger
drop trigger if exists set_staff_updated_at on public.staff;
create trigger set_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- RLS policies
alter table public.staff enable row level security;

drop policy if exists "Allow public read access for staff login" on public.staff;
create policy "Allow public read access for staff login"
  on public.staff for select
  using (true);

drop policy if exists "Allow staff modifications" on public.staff;
create policy "Allow staff modifications"
  on public.staff for all
  using (true)
  with check (true);

-- Seed default staff users for testing
insert into public.staff (id, name, role, access_code, is_active)
values
  ('a1111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', '9999', true),
  ('b2222222-2222-2222-2222-222222222222', 'Reception Desk 1', 'reception', '1111', true),
  ('c3333333-3333-3333-3333-333333333333', 'Central Pharmacy', 'pharmacist', '3333', true)
on conflict (id) do nothing;

-- Seed default doctor for General Medicine
insert into public.staff (id, name, role, access_code, department_id, is_active)
select 
  'd4444444-4444-4444-4444-444444444444',
  'Dr. Rajesh Kumar (General Medicine)',
  'doctor',
  '2222',
  id,
  true
from public.departments
where code = 'GENMED'
limit 1
on conflict (id) do nothing;
