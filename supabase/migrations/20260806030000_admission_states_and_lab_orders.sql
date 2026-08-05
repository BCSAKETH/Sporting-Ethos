-- Expand admission lifecycle: recommended → admitted → ready_for_discharge → discharged
alter table public.admissions drop constraint if exists admissions_status_check;
alter table public.admissions add constraint admissions_status_check
  check (status in ('admission_recommended','admitted','ready_for_discharge','discharged'));

-- Doctor-ordered diagnostic lab tests with dual fulfillment.
create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid references public.checkins(id),
  appointment_id text,
  patient_id uuid references public.profiles(id),
  patient_name text not null,
  test_name text not null,
  category text,
  prep_instructions text,
  status text not null default 'pending' check (status in ('pending','scheduled','completed_internal','completed_external')),
  fulfillment_type text check (fulfillment_type in ('internal','external')),
  scheduled_slot timestamptz,
  result_url text,
  result_notes text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.lab_orders enable row level security;
create policy lab_orders_anon_all on public.lab_orders for all to anon using (true) with check (true);
alter table public.lab_orders replica identity full;
alter publication supabase_realtime add table public.lab_orders;

-- Storage bucket for uploaded lab result PDFs/images (public read for demo).
insert into storage.buckets (id, name, public)
values ('lab-results', 'lab-results', true)
on conflict (id) do nothing;

create policy "lab_results_anon_read" on storage.objects
  for select to anon using (bucket_id = 'lab-results');
create policy "lab_results_anon_write" on storage.objects
  for insert to anon with check (bucket_id = 'lab-results');
