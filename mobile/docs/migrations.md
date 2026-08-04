# Migrations

Location: [`/supabase/migrations`](../../supabase/migrations) at the repo root (Supabase
CLI convention — shared by both apps, not nested under `mobile/`). The original
hackathon schema dump, `supabase-schema.sql` at the repo root, is left untouched as a
historical record; everything since is an additive, timestamped migration.

## Applied history

| File | Adds |
| --- | --- |
| `20260803120001_extensions_and_utils.sql` | `pgcrypto`, shared `set_updated_at()` trigger fn |
| `20260803120002_profiles.sql` | `profiles` table, `handle_new_user()` auto-provision trigger |
| `20260803120003_hospitals_departments.sql` | `hospitals`, `departments` |
| `20260803120004_doctors.sql` | `doctors`, `doctor_availability` |
| `20260803120005_appointments.sql` | `appointments`, `appointment_status_history` + audit trigger |
| `20260803120006_medical_lookups.sql` | `diseases`, `allergies` + patient join tables |
| `20260803120007_notifications_devices_audit.sql` | `notifications`, `device_tokens`, `activity_logs` + triggers |
| `20260803120008_alter_checkins.sql` | Additive FK columns on the existing `checkins` table |
| `20260803120009_rls_policies.sql` | `is_admin()` + RLS for every new table |
| `20260803120010_seed_hospitals_departments.sql` | 2 demo hospitals + full OPD/IPD/SUPPORT catalog |
| `20260803120011_seed_doctors.sql` | 18 demo doctors + weekly availability |
| `20260803120012_seed_medical_lookups.sql` | Common disease/allergy catalog |
| `20260803120013_security_hardening.sql` | Pins `search_path`, revokes public RPC access to trigger-only functions |
| `20260803120014_performance_hardening.sql` | Wraps `auth.*()`/`is_admin()` in `(select ...)`, splits catalog admin policies off `SELECT`, adds indexes on FK columns the advisor flagged |
| `20260803120015_single_hospital.sql` | Removes the second demo hospital — this deployment is scoped to one hospital; see [database.md](database.md) |

Applied via the Supabase MCP `apply_migration` tool directly against the live project
(no local Postgres in this environment) and mirrored here as files per "never overwrite
previous migrations."

## Adding a new migration

1. Create a new file: `supabase/migrations/<YYYYMMDDHHMMSS>_<description>.sql`, timestamp
   strictly after the last one.
2. Prefer `ALTER TABLE` over dropping/recreating; never destroy data.
3. Wrap `CREATE TYPE` in `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
   (Postgres has no `CREATE TYPE IF NOT EXISTS`) and use `CREATE TABLE IF NOT EXISTS` /
   `ADD COLUMN IF NOT EXISTS` so the migration is safe to re-run.
4. Apply it (via `mcp__claude_ai_Supabase__apply_migration` or the Supabase CLI once one
   is set up locally) and regenerate types:
   ```bash
   # from an environment with the Supabase MCP tools:
   generate_typescript_types → paste into mobile/types/database.ts
   ```
5. Run `get_advisors` (security + performance) after any DDL change — every new table
   needs RLS enabled, or it'll show up as a warning.
