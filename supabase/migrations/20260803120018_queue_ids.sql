-- 18: Queue tokens (Q-####) separate from appointment IDs (APT-####)
--
-- Every check-in gets a queue_id token. An appointment_id is only minted once a
-- department is assigned (direct dept pick, AI-triage confirm, or reception
-- forwarding a skipped patient).

create sequence if not exists queue_seq start 1;

create or replace function public.next_queue_id()
  returns text language sql security definer set search_path = public as $$
  select 'Q-' || lpad(nextval('queue_seq')::text, 4, '0')
$$;

grant execute on function public.next_queue_id() to anon, authenticated;

alter table public.checkins add column if not exists queue_id text;
create index if not exists idx_checkins_queue_id on public.checkins(queue_id);
