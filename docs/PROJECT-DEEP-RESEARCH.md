# Sporting Ethos — Deep Research / Full Codebase Audit

*A complete, file-level understanding of the project as it stands: two apps + one shared
Supabase backend + an AI charting layer. ~12,900 lines of source.*

---

## 1. Topology (the whole system at a glance)

```
                         ┌─────────────────────────── SUPABASE ───────────────────────────┐
                         │  Auth (auth.users) · Postgres (15 migrations) · Realtime · RLS  │
                         │  profiles · hospitals · departments · doctors · doctor_avail     │
                         │  appointments · appointment_status_history · diseases/allergies  │
                         │  notifications · device_tokens · activity_logs                   │
                         │  checkins  ← the bridge table both apps read/write               │
                         └───────▲───────────────────────────────────────────▲─────────────┘
                                 │ authenticated (patient)                    │ anon / kiosk (staff)
          ┌──────────────────────┴───────────┐                 ┌─────────────┴─────────────────────┐
          │  MOBILE APP (patients, Android)   │                 │  WEB APP (staff)                   │
          │  Expo + RN + TypeScript           │                 │  React + Vite + Tailwind (purple)  │
          │  signup/login · profile · book    │                 │  /  Reception  · /expert  ·        │
          │  doctors · departments · QR scan  │                 │  /pharmacy · /checkin              │
          │  notifications · medications      │                 │  + /api Node functions (Groq)      │
          └───────────────────────────────────┘                 └────────────────────────────────────┘
```

**Two front-ends, one backend.** Patients live in the mobile app (real auth, appointments,
medical profile). Staff live in the web app (reception queue, clinical/ER console, pharmacy).
The `checkins` table is the shared spine — a QR/desk check-in (from either app) flows into the
same live queue.

## 2. Repository layout

```
/                      Web app (React/Vite) — staff console
  src/pages/           Dashboard, Expert, Pharmacy, PatientCheckIn
  src/components/      QueueCard, MetricsStrip, ReportsPanel, Charts, ConsultationPanel,
                       Receipt, Logo, DatePickerModal, SpeechInput, AppBanner
  src/lib/             store, chart, bill, hash, i18n, intercom, supabase, voice
  api/                 chart.js, health.js  (Vercel Node serverless — Groq charting)
  backend/  + main.py  FastAPI charting service (local dev; also main.py at root)
  supabase/migrations/ 15 SQL migrations (the real schema)
  docs/                M1–M3 docs, build prompts, this research
  mobile/              Full Expo/React Native patient app (own package.json + docs)
  platform-tools/      Android adb (to run the mobile app on a device)
  dist/ node_modules/  build + deps
```

## 3. Database (Supabase — 15 migrations, production-grade)

Migrations `20260803120001…15`, additive-only ("never destroy data, prefer ALTER TABLE").

**Enums:** `user_role`(patient/doctor/admin) · `gender_type` · `blood_group_type` ·
`department_type`(OPD/IPD/SUPPORT) · `doctor_status`(active/on_leave/inactive) ·
`appointment_status` · `appointment_priority`(normal/urgent/emergency) ·
`consultation_mode`(in_person/video).

**Tables**
- **profiles** — `id → auth.users`, full_name, gender, blood_group, DOB, height/weight (BMI),
  phone, etc. Auto-created by the `handle_new_user()` trigger on signup.
- **hospitals** → **departments** (type, icon, color, is_active) → **doctors**
  (hospital_id, department_id, profile_id, first_name/last_name, specialization,
  years_experience, languages[], consultation_fee, status) → **doctor_availability**
  (weekday, start/end/break times, appointment_duration_minutes).
- **appointments** — patient_id, doctor_id, department_id, hospital_id, scheduled_datetime,
  status, priority, consultation_mode, reason_for_visit. **appointment_status_history** +
  triggers `log_appointment_status_change`, `log_appointment_activity`,
  `notify_appointment_status` (auto-writes a notification row on status change).
- **diseases / patient_diseases**, **allergies / patient_allergies** (with severity).
- **notifications**, **device_tokens** (push), **activity_logs** (audit).
- **checkins** — the original kiosk queue table, **ALTERed** to add `patient_id`,
  `hospital_id`, `department_id`, `doctor_id`, `appointment_ref` (+ the existing sequential
  `appointment_id` APT-####, gender, age, source, hash, notes jsonb, pharmacy jsonb).
- Sequence `appt_seq` + function `next_appt_id()` for sequential IDs.

**Security:** migration 09 = RLS on every table (own-record / `is_admin()` / authenticated-read
patterns); 13 = security hardening; 14 = performance hardening (indexes); 15 = single-hospital
scoping. Seeds (10–12) populate hospitals, departments, doctors, diseases, allergies.

> **Note:** the `checkins` table keeps **open/anon RLS** so the kiosk web app (no login) can
> read/write it; the rest of the schema is properly locked to authenticated users.

## 4. Web app (staff console) — React + Vite + Tailwind ("Ivory & Lavender")

**Theme:** ivory `#FAF8F5` surfaces, white cards, purple accents (`purple-600/700/950`).
**Routes** (`src/main.jsx`): `/` Dashboard · `/expert` Expert · `/pharmacy` Pharmacy ·
`/checkin` PatientCheckIn · `*` → `/`.

**Pages**
- **Dashboard (`/`, reception)** — tabs **Live Queue / Reports / Settings**; metrics strip;
  ＋Add patient (desk walk-in); call-expert intercom (blinking banner); universal QR download.
- **Expert (`/expert`)** — "Clinical & ER Portal". Login by **doctor/ER-nurse access code**
  (`findDoctorByCode`), shows the doctor + department, **filters the queue by department**,
  "Now Consulting" hero, ambient charting (ConsultationPanel), a past-notes AI summary
  (`generateGroqConsultationSummary`), mark-done, two-way intercom.
- **Pharmacy (`/pharmacy`)** — code-gated. **Counter:** find patient by appointment ID → match
  prescriptions (from AI notes) to inventory → order + qty → **Take payment → PDF bill** +
  stock decrement. **Inventory:** add/edit/remove medicines, low-stock highlight.
- **PatientCheckIn (`/checkin`)** — universal QR flow; name + optional age/gender; language
  switch (EN/HI/TE) + accessibility voice mode; sequential IDs; insecure-context fallbacks.

**`src/lib/` (the web data + services layer)**
- **store.js** — the abstraction over Supabase *or* a localStorage **mock fallback**. Exports:
  STATUS, sortQueue, isActive, ageGroup, listCheckins, `nextApptId` (RPC), bookingType,
  `listDepartments` (Supabase or MOCK_DEPARTMENTS), `findDoctorByCode` (doctors.access_code or
  a MOCK_DOCTORS_BY_CODE dict incl. `101–106`, `ethos`, `nurse`/`201`), createCheckin (with
  department_id), updateStatus, findCheckinByAppointment, medicines CRUD + subscribeMedicines,
  savePharmacyBill, saveNotes, setPriority, resetAll, subscribe (realtime, unique channel).
- **chart.js** — (1) `generateNotes` records audio → **base64 JSON → `/api/chart`** → Groq
  Whisper+Llama structured notes, degrading to a sample; (2) `downloadBillPDF`/receipt via
  jsPDF; (3) `generateGroqConsultationSummary` — **direct browser→Groq** call for a 2-sentence
  past-notes summary.
- **bill.js** (PDF invoice), **hash.js** (SHA-256 with insecure-context FNV fallback),
  **i18n.js** (EN/HI/TE), **intercom.js** (Supabase broadcast, mock BroadcastChannel),
  **supabase.js** (client + `isSupabaseConfigured`), **voice.js** (SpeechSynthesis, always-on).
- **components:** Charts (SVG donut/bars/trend), ReportsPanel (KPIs, filters, Excel, reasons),
  ConsultationPanel (record→notes→PDF), QueueCard, MetricsStrip, Receipt, DatePickerModal,
  **SpeechInput** (voice-to-text field), AppBanner, Logo.

## 5. Mobile app (patients) — Expo SDK 57 · React Native 0.86 · TypeScript (strict)

**Stack:** Expo Router (file routes) · Supabase (Auth+Postgres+Realtime) · TanStack Query ·
Zustand · React Hook Form + Zod · NativeWind (Tailwind) · Reanimated · Lucide · Expo
Camera/Notifications/SecureStore. Theme = purple (`primary #8B5CF6`). **EAS** build config.

**Clean layered architecture**
- **lib/supabase.ts** — typed client using a custom **`LargeSecureStore`**: encrypts the
  Supabase session with a random AES-256 key (aes-js), stores the blob in AsyncStorage and the
  key in Expo SecureStore (the documented Expo workaround); pauses token refresh when
  backgrounded.
- **providers/AuthProvider** hydrates session + profile on launch and on every auth event;
  **store/authStore** (Zustand: session, profile, isInitializing).
- **services/** — one typed module per entity: auth (signin/signup/reset/updatePassword),
  appointments (list/get/**getBookedSlots**/book/cancel), **checkins** (listHospitalQueue,
  getMyCheckin, **spotCheckIn** → writes the shared `checkins` table, `subscribeToHospitalQueue`
  realtime), doctors (filtered search + availability), departments (with doctor counts),
  profile, notifications (list/mark-read/subscribe), medicalLookups (diseases/allergies toggles),
  hospitals, deviceTokens.
- **features/** — React Query hooks + Zod schemas + Jest tests: useAuth/useSignIn/etc.,
  useMyAppointments/useBookAppointment/useBookedSlots, useHospitalQueue/useSpotCheckIn,
  useDoctors, useProfile (+ diseases/allergies toggles), useNotifications, **useMedications**
  (currently local AsyncStorage with seeded defaults — a deferred module).
- **app/** (screens, Expo Router): `(auth)` login/signup/forgot/reset; `(tabs)` index (home),
  appointments, departments, doctors, profile; `booking/[doctorId]`, `doctor/[id]`, `scan` (QR
  camera), `notifications`. **components/ui** (Button, ScreenContainer, VoiceTextField,
  CalendarPickerModal), **hooks/usePushNotifications**, **utils** (qr, slots, queue, health +
  tests), **types/database.ts** (990-line generated Supabase types) + models.
- **docs/** — architecture, database, migrations, api-services, deployment, developer, folder
  structure (its own full documentation set).

**Built vs deferred (per mobile/README):** built = auth, profile (BMI/allergies/conditions),
Hospital→Department→Doctor→Slot→Appointment booking, My Appointments, doctor directory+search,
in-app notifications, QR walk-in check-in. Deferred (schema-ready) = doctor/admin portals,
prescriptions, lab orders, medicine ordering, reports/PDF viewer, insurance, telemedicine.

## 6. AI charting / backend layer

Three paths, all Groq (Whisper-large-v3 + Llama-3.3-70b):
1. **`api/chart.js` + `api/health.js`** — Vercel Node serverless. Accept JSON `{audioBase64,
   transcript}` → Whisper → Llama → `{summary, symptoms, prescriptions, actions}`; graceful
   mock without a key. This is the production path (same-origin `/api/*`).
2. **`backend/main.py` / `main.py`** — FastAPI equivalent for local dev (loads `backend/.env`).
3. **`generateGroqConsultationSummary`** (web chart.js) — a **direct browser→Groq** call using
   `VITE_GROQ_API_KEY` to summarize a patient's past notes for the doctor.

## 7. Key findings & watch-outs (audit view)

- **Web doctor/department data is effectively mock/kiosk.** The web uses the **anon** key with
  no login, and RLS locks `doctors`/`departments` to authenticated users — so `findDoctorByCode`
  and `listDepartments` in practice fall back to the **hardcoded dictionaries**
  (`MOCK_DOCTORS_BY_CODE`, `MOCK_DEPARTMENTS`). Also the real `doctors` table has **no
  `access_code`/`full_name`/`is_active` columns** (it uses first_name/last_name/status), so the
  Supabase branch of `findDoctorByCode` won't match — the mock dict is what actually authorizes
  the web Expert login. ➜ To make it "real", add `access_code` + a read policy (or a SECURITY
  DEFINER RPC) for doctors.
- **`VITE_GROQ_API_KEY` in the browser** (for `generateGroqConsultationSummary`) exposes the key
  in the client bundle. Prefer routing that through `/api` like the charting path.
- **`checkins` has open RLS** (intentional kiosk mode) — fine for the demo, tighten for prod.
- **Two check-in entry points** into the same table: web `/checkin` (anon) and mobile
  `spotCheckIn` (authenticated, ties `patient_id`). Both realtime-broadcast to the queue.
- **Mobile `useMedications`** is local-only (AsyncStorage) — a placeholder until a meds table.

## 8. Deployment

- **Web:** Vercel (Vite build → `dist`) + `/api` Node functions; `.vercelignore` excludes
  `backend/`, `mobile/`, `supabase/`, `scripts/`, `docs/`. The Python backend was removed from
  the deployed repo path so Vercel detects a clean Vite project (kept locally for dev).
- **Mobile:** Expo/EAS (`eas.json`) for Android dev/prod builds; camera QR + push need a dev
  build (not Expo Go). `platform-tools/` holds `adb` for on-device runs.
- **DB:** Supabase project `ieurjkuvrdmmnwursvdk` (migrations under `supabase/migrations`).

## 9. Test coverage

Mobile has **Jest** unit/component tests: `features/auth/schemas.test.ts`,
`features/booking/schemas.test.ts`, `features/profile/schemas.test.ts`, and
`utils/{slots,queue,health,qr}.test.ts`. Web has no automated tests (validated manually).
