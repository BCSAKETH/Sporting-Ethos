-- The staff web console (anon key) must read patient profiles to populate the
-- Doctor's medical file (blood group, height, weight, phone, etc.).
create policy profiles_read_anon on public.profiles for select to anon using (true);

-- Pharmacy inventory tracks batches + expiry; the Add/Restock forms send these.
alter table public.medicines add column if not exists batches jsonb;
alter table public.medicines add column if not exists expiry_date date;
