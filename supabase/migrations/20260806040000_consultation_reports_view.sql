-- consultation_reports as a view over checkins that carry doctor notes / e-Rx.
-- Exposes patient_name + prescriptions_jsonb per the spec, queryable by
-- patient_id or patient_name. security_invoker so anon RLS on checkins applies.
create or replace view public.consultation_reports
  with (security_invoker = true) as
select
  c.id,
  c.patient_id,
  c.name            as patient_name,
  c.department_id,
  c.appointment_id,
  c.notes,
  c.prescriptions   as prescriptions_jsonb,
  c.check_in_time   as created_at
from public.checkins c
where c.notes is not null or c.prescriptions is not null;

grant select on public.consultation_reports to anon, authenticated;
