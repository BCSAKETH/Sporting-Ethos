# Master Build Prompt — Sporting Ethos

*A single consolidated prompt capturing every requirement requested across the build.
Paste this into any capable AI/dev agent to reproduce the full system.*

---

You are building **Sporting Ethos** — a real-time, full-stack clinic operations platform for
a high-performance sports & healthcare centre (sports science, sports medicine, rehab,
physiotherapy, nutrition, psychology, athlete development). Built for GigPoint Hackathon 2026,
Track 4 (Healthcare Tech).

## Problem
Patients book appointments, then check in on arrival via QR. Today a confirmation email is
delayed, so the healthcare expert has no immediate, trustworthy signal that a patient has
arrived → missed check-ins, inaccurate records, wasted slots, lost revenue. **Eliminate that
uncertainty with instant, multi-channel confirmation, and extend it into a full clinic loop.**

## Stack
- **Frontend:** React (Vite) + Tailwind CSS. Clean, minimalist theme (final look: "Ivory &
  Lavender" — ivory `#FAF8F5` surfaces, purple accents). Light theme, no dark mode.
- **DB + realtime:** Supabase (Postgres + Realtime). Sub-second cross-device updates.
- **AI charting:** Groq (Whisper-large-v3 + Llama 3.3 70B). Deploy as a FastAPI service for
  local dev AND as native Vercel Node serverless functions (`/api/*.js`) for production.
- **Voice:** browser SpeechSynthesis (multilingual). **PDF:** jsPDF. **Excel:** SheetJS.
  **QR:** qrcode.react.
- **Deploy:** Vercel (frontend + `/api` Node functions), GitHub repo. Keep any Python out of
  the deployed repo so Vercel detects a clean Vite project.

## Roles & access (credential-gated where noted)
| Role | Route | Access |
|---|---|---|
| Patient | `/checkin` | via universal QR |
| Reception | `/` | open kiosk |
| Expert / Doctor / ER Nurse | `/expert` | doctor/nurse access code |
| Pharmacy | `/pharmacy` | pharmacy code (`pharmacy`) |

## Core requirements

1. **Universal QR check-in** — ONE QR for everyone (not per-patient). No manual appointment-ID
   entry: assign a **sequential** appointment ID automatically (`APT-0001, APT-0002…`) via a
   Postgres sequence + `next_appt_id()` RPC. Capture name (required) + optional age + gender.
2. **Booking types** derived from source: **Pre-booked** (self QR check-in) vs **Walk-in**
   (added at the desk). Reception has a **"＋ Add patient"** action for desk walk-ins.
3. **Live queue dashboard** (reception/expert), updates in **<1 second** via Supabase Realtime.
   Multi-sensory arrival confirmation: on-screen highlight + chime + **voice ("‹name› has
   arrived")**. **Sound is always on** (auto-prime on first interaction, no button).
4. **Status lifecycle:** waiting → in_consult → done, plus left (LWBS) / no_show / paused;
   any card can be re-queued.
5. **Emergency priority** — flag jumps a patient to #1 and recalculates everyone's position +
   ETA live on all phones (predictive/algorithmic triage).
6. **Call next** — notifies the patient's phone with a chime + spoken "it's your turn" (in the
   patient's chosen language).
7. **Verifiable receipt** — branded, with logo, timestamp, UUID, and SHA-256 hash. Must work on
   insecure origins (phone over http LAN): fall back gracefully when `crypto.subtle` /
   `crypto.randomUUID` are unavailable (still produce a valid UUID + a hash).

## Expert console (`/expert`, credential-gated)
- Doctor/ER-nurse login by access code (lookup against a **doctors** table; support an ER nurse
  code). Show the doctor's name + **department**; filter the queue by department.
- **"Now Consulting" hero:** big patient name, age/gender chips, live consult timer.
- **Ambient "Zero-Click Charting":** record the consultation → Groq Whisper transcribes →
  Groq Llama structures into **{ summary, symptoms, prescriptions, actions }** → show notes →
  **Download PDF** → save to Supabase → surface as the patient's **"visit summary"** on their
  phone. Degrade gracefully to a labelled sample if mic/key unavailable.
- **Mark done.** Recording/charting lives ONLY here (not on reception).
- **Two-way intercom:** "Call reception" ↔ "Call expert" via Supabase Realtime broadcast; the
  incoming-call banner **blinks** + chimes + speaks.

## Pharmacy module (`/pharmacy`, code-gated) — the revenue engine
- **Counter tab:** enter an **Appointment ID** → look up the patient → pull their **prescribed
  medicines from the AI consultation notes** → **auto-match to inventory** (name → price →
  stock). Add/remove items, adjust qty, see the **total** → **Take payment** → generate a
  **branded PDF bill/invoice tied to the appointment ID** → decrement stock → record the sale.
  Re-opening a paid appointment shows the bill again.
- **Inventory tab:** add / edit / remove medicines (name, ₹ price, stock, category); low-stock
  highlight. (`medicines` table.)

## Reports / performance dashboard (reception → Reports tab)
- Filters: **Scope (Today / All time), Gender, Age group (Child/Teen/Adult/Senior), Status.**
- KPI cards: Attended, Completed (%), Avg wait, **LWBS rate %**, Waiting now, **Pharmacy
  revenue ₹**.
- Charts (dependency-free SVG or a chart lib): **gender donut, status donut, age bars,
  arrivals-over-day trend, booking-type donut**, and **"Top reasons / conditions"** tallied
  from consultation symptoms.
- Insights: most common gender, busiest age group, peak arrival hour.
- Patient table (name, age, gender, booking, **reason from consult**, status, times) with
  Booked/Walk-in tags.
- **Download Excel (.xlsx)** of the filtered list (incl. reason + pharmacy bill).

## Inclusion
- **Language switch: English / हिन्दी / తెలుగు** on the patient check-in + confirmation
  (translate UI text and the spoken "it's your turn" announcement).
- **Accessibility mode:** large-text toggle + **voice-guided** check-in that reads prompts
  aloud in the chosen language (for elderly / injured athletes / non-English speakers).

## Data model
- **checkins:** id (uuid), name, appointment_id (sequential), check_in_time, status, priority,
  gender, age, source (self/reception), department_id, hash, notes (jsonb: AI chart),
  pharmacy (jsonb: paid bill {bill_no, items[], total, paid, paid_at}).
- **medicines:** id, name, price, stock, category.
- **departments** and **doctors** (doctors have access codes, department_id, is_nurse).
- Sequence `appt_seq` + function `next_appt_id()`. RLS kiosk-mode (open) for the demo.

## Non-functional / polish
- Everything runs with a local **mock fallback** if Supabase isn't configured (realtime across
  tabs) so it always demos.
- Premium but clean UI: consistent cards, subtle depth, blinking intercom, animated metrics,
  favicon + title. **God-level polish on the Reports and Expert screens especially.**
- Security: Groq key server-side only; simple role codes; note production hardening (phone-OTP
  auth, role-based RLS, per-clinic `clinic_id` scaling) as roadmap.

## Deliverables
- Working MVP validated end-to-end on Supabase.
- **Milestone 1 docs:** Solution Architecture, User Flow, Implementation Plan.
- **Milestone 2:** Functional MVP + validated workflow.
- **Milestone 3:** 10-minute demo/presentation (problem → analysis → solution → live demo →
  business impact). Export docs to PDF; deploy to a public Vercel URL.

## Measured impact to show on-screen
"Confirmed in <1 second" (real scan→dashboard latency), live waiting/LWBS/no-show counters,
pharmacy revenue ₹, top conditions — proving fewer missed check-ins, recovered slots/revenue,
smoother flow, and inclusive access.
