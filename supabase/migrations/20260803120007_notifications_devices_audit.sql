-- 07: notifications, push device tokens, and a generic activity audit log

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_patient on public.notifications(patient_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_tokens_patient on public.device_tokens(patient_id);

drop trigger if exists set_device_tokens_updated_at on public.device_tokens;
create trigger set_device_tokens_updated_at
  before update on public.device_tokens
  for each row execute function public.set_updated_at();

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_entity on public.activity_logs(entity_table, entity_id);
create index if not exists idx_activity_logs_actor on public.activity_logs(actor_id);

create or replace function public.log_appointment_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_entity_id uuid;
begin
  v_entity_id := coalesce(new.id, old.id);
  insert into public.activity_logs (actor_id, action, entity_table, entity_id, meta)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id,
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

drop trigger if exists appointments_activity_log on public.appointments;
create trigger appointments_activity_log
  after insert or update or delete on public.appointments
  for each row execute function public.log_appointment_activity();

-- Auto-notify the patient whenever their appointment status changes.
create or replace function public.notify_appointment_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.notifications (patient_id, title, body, data)
    values (
      new.patient_id,
      case new.status
        when 'confirmed' then 'Appointment confirmed'
        when 'checked_in' then 'You are checked in'
        when 'in_consult' then 'It is your turn'
        when 'completed' then 'Visit completed'
        when 'cancelled' then 'Appointment cancelled'
        when 'no_show' then 'Marked as no-show'
        else 'Appointment update'
      end,
      'Your appointment status is now ' || new.status,
      jsonb_build_object('appointment_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_notify_status on public.appointments;
create trigger appointments_notify_status
  after insert or update on public.appointments
  for each row execute function public.notify_appointment_status();
