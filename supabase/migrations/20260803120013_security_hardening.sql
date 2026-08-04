-- 13: address advisor warnings from the previous migrations
-- - pin search_path on set_updated_at (mutable search_path warning)
-- - trigger-only functions should not be directly callable via PostgREST RPC
--   (they still fire from triggers fine; Postgres does not gate trigger
--   execution on the invoking role's EXECUTE privilege on the function)

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_appointment_activity() from public, anon, authenticated;
revoke execute on function public.log_appointment_status_change() from public, anon, authenticated;
revoke execute on function public.notify_appointment_status() from public, anon, authenticated;

-- is_admin() is intentionally left callable: RLS policies invoke it in the
-- context of the querying role (including anon), so revoking would break
-- policy evaluation for every table that references it.
