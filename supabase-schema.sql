-- Sporting Ethos — Supabase schema
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.

create extension if not exists "pgcrypto";

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  appointment_id text,
  check_in_time timestamptz not null default now(),
  status text not null default 'waiting',
  priority text not null default 'normal',
  gender text,
  age int,
  hash text,
  notes jsonb
);

-- Enable Realtime so the dashboard receives inserts/updates instantly.
alter publication supabase_realtime add table public.checkins;

-- Row Level Security: this is a kiosk-style demo app with no user accounts,
-- so we allow anonymous read/write. Tighten this before any real deployment.
alter table public.checkins enable row level security;

create policy "anon can read"   on public.checkins for select using (true);
create policy "anon can insert" on public.checkins for insert with check (true);
create policy "anon can update" on public.checkins for update using (true) with check (true);
create policy "anon can delete" on public.checkins for delete using (true);
