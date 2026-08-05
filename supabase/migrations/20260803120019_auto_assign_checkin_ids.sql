-- 19: Auto-assign queue_id (every insert) and appointment_id (once a department
-- is attached) so every client — web store + mobile app — is consistent.
create or replace function public.assign_checkin_ids()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.queue_id is null then
    new.queue_id := public.next_queue_id();
  end if;
  if new.department_id is not null and new.appointment_id is null then
    new.appointment_id := public.next_appt_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_checkin_ids on public.checkins;
create trigger trg_assign_checkin_ids
  before insert or update on public.checkins
  for each row execute function public.assign_checkin_ids();
