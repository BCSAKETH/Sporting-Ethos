-- 15: scope down to a single hospital (product decision: this deployment is
-- for one hospital only, not a multi-hospital network).
--
-- Removes the second demo hospital (Sporting Ethos North Campus / SEH-DEL)
-- seeded in migration 10. Safe: it has zero appointments and zero checkins
-- (verified before writing this migration), so the cascade only removes its
-- own departments, doctors and doctor_availability rows — no patient data is
-- touched. The `hospitals` table itself is kept (departments/doctors/
-- appointments still correctly reference it via FK) rather than removed,
-- since that would mean re-normalizing every table that hangs off it for no
-- benefit — there's just one row in it now.

delete from public.hospitals where code = 'SEH-DEL';
