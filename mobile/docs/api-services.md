# API / Services Reference

There is no separate backend API — the app talks directly to Supabase (Postgres +
Auth + Realtime + eventually Storage) via `@supabase/supabase-js`, gated entirely by
Row Level Security (see [database.md](database.md)). The `services/` folder is the
repository layer: every Supabase call in the app lives in exactly one of these files.
Screens never import `lib/supabase` directly — they go through a `features/*/use*.ts`
hook, which wraps a service function in TanStack Query.

| Service | Key functions | Backs |
| --- | --- | --- |
| `auth.service.ts` | `signInWithPassword`, `signUpWithPassword`, `signOut`, `sendPasswordResetEmail`, `updatePassword` | `(auth)` screens, `reset-password.tsx` |
| `profile.service.ts` | `getMyProfile`, `updateMyProfile` | Profile tab |
| `medicalLookups.service.ts` | `listDiseases`, `listAllergies`, `listMyDiseases`, `listMyAllergies`, `addPatient*`, `removePatient*` | Profile tab's conditions/allergies sections |
| `hospitals.service.ts` | `getPrimaryHospital` (this deployment has exactly one hospital, no picker) | Booking flow, QR check-in |
| `departments.service.ts` | `listDepartments` (with doctor counts via a `doctors(count)` embed), `getDepartment` | Departments tab |
| `doctors.service.ts` | `listDoctors` (filterable), `getDoctor`, `getDoctorAvailability` | Doctors tab, doctor profile, booking |
| `appointments.service.ts` | `listMyAppointments`, `getAppointment`, `getBookedSlots`, `bookAppointment`, `cancelAppointment` | Booking screen, Appointments tab |
| `checkins.service.ts` | `listHospitalQueue`, `spotCheckIn`, `subscribeToHospitalQueue` (queue math lives in `utils/queue.ts`, re-exported here) | `/scan` QR check-in |
| `notifications.service.ts` | `listMyNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `subscribeToMyNotifications` | Notifications screen, dashboard bell |
| `deviceTokens.service.ts` | `registerDeviceToken` | `hooks/usePushNotifications.ts` |

## Conventions

- Every function returns already-`throw`n-on-error data (`if (error) throw error`), so
  callers (TanStack Query hooks) get normal promise rejection/`isError` behavior for
  free.
- List functions return `[]` rather than `null`/`undefined` on an empty result.
- Filtering/searching happens server-side (Postgres `ilike`/`eq`/`gte`), not by fetching
  everything and filtering in JS — see `doctors.service.ts`'s `listDoctors(filters)`.
- Mutations that change data another screen depends on invalidate the relevant
  `constants/queryKeys.ts` key in their `useMutation({ onSuccess })` — see
  `features/appointments/useAppointments.ts` invalidating the appointments list after
  booking or cancelling.
- Two tables (`notifications`, `checkins`) also expose a `subscribeTo*` function that
  opens a Supabase Realtime channel and invalidates the query on any change, instead of
  polling.

## RPCs

`is_admin()` and `next_appt_id()` are Postgres functions callable via PostgREST RPC.
`next_appt_id()` is the pre-existing sequence used by the web kiosk for `APT-0001`-style
IDs and isn't called from the mobile app. `is_admin()` is used internally by RLS
policies; the mobile app never calls it directly (there's no admin UI in this app).
