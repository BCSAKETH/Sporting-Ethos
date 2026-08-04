-- 02: profiles (extends auth.users with patient/doctor/admin data)

do $$ begin
  create type public.user_role as enum ('patient', 'doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender_type as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.blood_group_type as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text not null default '',
  avatar_url text,
  gender public.gender_type,
  date_of_birth date,
  blood_group public.blood_group_type,
  height_cm numeric(5,2) check (height_cm is null or height_cm > 0),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg > 0),
  bmi numeric(5,2) generated always as (
    case
      when height_cm is not null and height_cm > 0 and weight_kg is not null and weight_kg > 0
        then round((weight_kg / ((height_cm / 100.0) ^ 2))::numeric, 2)
      else null
    end
  ) stored,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row whenever a new Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
