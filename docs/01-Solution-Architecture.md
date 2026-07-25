# Sporting Ethos — Solution Architecture

**GigPoint Hackathon 2026 · Track 4 (Healthcare Tech) · Milestone 1**
**Project:** Real-Time Patient Check-In, Live Queue, Ambient Charting & Pharmacy

---

## 1. Business context

**Sporting Ethos** is a high-performance sports & healthcare centre specialising in sports
science, sports medicine, rehabilitation, physiotherapy, nutrition, psychology, and athlete
development. Patients book in advance and check in on arrival by scanning a QR code and
submitting a few details.

## 2. Problem statement

Once a patient checks in, a confirmation email is generated as proof — but there is a
**delay** before it appears. During that gap the healthcare expert has **no immediate,
trustworthy signal** that the patient has arrived. Check-ins get overlooked → inaccurate
consultation records, operational inefficiency, wasted appointment slots, and lost revenue.

**Core problem:** *the expert doesn't get fast, reliable confirmation that a patient has
checked in — and that uncertainty costs the business.* The brief suggests real-time
audio/visual confirmation and encourages going beyond it.

## 3. Solution overview

A single responsive web app (plus a small AI microservice) with **role-based views** that
removes the uncertainty, turns the waiting room into a **live managed queue**, and extends
into **ambient charting**, **pharmacy billing**, and **analytics** — the full clinic loop.

Confirmation is delivered on **four channels at once**, so it is impossible to miss:
1. **On-screen** — the patient's card flashes and appears at the top of the live queue.
2. **Audible** — a chime plays.
3. **Voice** — the browser speaks *"‹name› has arrived."*
4. **Verifiable receipt** — a SHA-256-hashed digital proof for the patient.

### Roles

| Role | View | Purpose |
|---|---|---|
| **Patient** | `/checkin` (mobile, via QR) | Check in, get receipt + live position + "your turn", read visit summary |
| **Reception** | `/` | Live queue, add walk-ins, reports, QR, reception↔expert intercom |
| **Expert / Doctor** | `/expert` (code) | Current consultation, **ambient charting**, mark done, call reception |
| **Pharmacy** | `/pharmacy` (code) | Dispense by appointment ID, billing, inventory |

## 4. System architecture

```
   PATIENT (phone)                         STAFF (laptop / tablet)
   Universal QR → /checkin                 Reception /   ·  Expert /expert  ·  Pharmacy /pharmacy
   • name, age, gender                     • live queue, metrics, voice+chime+highlight
   • sequential APT-#### assigned          • status controls, emergency priority, add patient
   • receipt + live position               • ambient charting, mark done, intercom
   • "your turn" (voice, in language)      • pharmacy: match Rx → bill → payment → stock
   • visit summary                         • reports: demographics, reasons, revenue, Excel
        │  INSERT / READ / REALTIME                │  READ / UPDATE / REALTIME / RPC
        ▼                                          ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                          SUPABASE                               │
   │  Postgres tables: checkins, medicines                           │
   │  Sequence: appt_seq  +  RPC next_appt_id()  (sequential IDs)    │
   │  Realtime: postgres_changes broadcast (<1s) + intercom broadcast│
   │  Row Level Security (kiosk-mode policies)                       │
   └────────────────────────────────────────────────────────────────┘

   AMBIENT CHARTING (separate microservice):
   dashboard audio ─► FastAPI (localhost:8000)
                        ├─ Groq Whisper-large-v3   → transcript
                        └─ Groq Llama 3.3 70B (JSON) → { summary, symptoms,
                                                        prescriptions, actions }
                      ─► saved to checkins.notes  +  consultation PDF  +  patient summary
```

**Real-time:** every screen subscribes to Supabase Realtime on `checkins`; an `INSERT`
broadcasts and all dashboards re-render in **under a second** (no polling). Each subscriber
uses a uniquely-named channel so multiple live views coexist. The reception↔expert
**intercom** uses a separate Realtime *broadcast* channel (ephemeral, no DB writes).

## 5. Technology stack & rationale

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast, component-based, instant HMR |
| Styling | Tailwind CSS | Clean, minimalist, light UI; shared `.card`/`.input` primitives |
| DB + realtime | Supabase (Postgres + Realtime) | Cross-device <1s updates with minimal backend code |
| Sequential IDs | Postgres sequence + `next_appt_id()` RPC | Guaranteed unique, ordered `APT-####` |
| Voice | Browser SpeechSynthesis (multi-lang) | Free, offline, zero dependency; always on |
| Receipt / bill | Web Crypto SHA-256 · jsPDF | Tamper-evident proof; branded PDF receipt & pharmacy bill |
| Ambient charting | FastAPI + **Groq** (Whisper + Llama 3.3 70B) | Free tier, blazing-fast transcription + structuring |
| Excel export | SheetJS (xlsx) | Real `.xlsx` for management reports |
| QR | qrcode.react | Renders + exports the universal check-in QR |
| i18n | Lightweight custom dictionary | English / Hindi / Telugu, no heavy dependency |
| Hosting (target) | Vercel (frontend) + Python host (backend) | One-click static deploy; public URL |

## 6. Data model

**`checkins`** (one row per patient visit)

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (pk) | Unique reference, on the receipt |
| `name` | text | Patient name |
| `appointment_id` | text | **Sequential** `APT-####` (auto-assigned) |
| `check_in_time` | timestamptz | Arrival time (queue order, latency, reports) |
| `status` | text | `waiting`/`in_consult`/`done`/`left`/`no_show`/`paused` |
| `priority` | text | `normal`/`emergency` (emergency jumps the queue) |
| `gender` | text | Male/Female/Other — reports filter |
| `age` | int | Age → grouped Child/Teen/Adult/Senior |
| `source` | text | `self` (Pre-booked via QR) / `reception` (Walk-in, desk) |
| `hash` | text | SHA-256 of `appointment_id\|name\|check_in_time\|id` |
| `notes` | jsonb | AI consultation notes {summary, symptoms, prescriptions, actions} |
| `pharmacy` | jsonb | Paid bill {bill_no, items[], total, paid, paid_at} |

**`medicines`** (pharmacy inventory)

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (pk) | Medicine ID |
| `name` | text | Medicine name |
| `price` | numeric | Unit price (₹) |
| `stock` | int | Units in stock (decremented on sale) |
| `category` | text | Category tag |

**Sequence** `appt_seq` + **function** `next_appt_id()` → returns `APT-` + zero-padded next value.

**Booking type (derived):** `source = 'reception'` → **Walk-in**; else → **Pre-booked**.

## 7. Security & privacy

- Kiosk-style app; role screens (`/expert`, `/pharmacy`) are gated by simple access codes
  (env-configurable). For the hackathon, RLS allows anonymous read/write so any device works.
- The **Groq API key lives only on the FastAPI server** (`backend/.env`), never in the browser.
- No sensitive data in URLs; the universal QR carries only the check-in path.
- **Production hardening (roadmap):** phone-OTP patient auth, role-based RLS for
  reception/expert/pharmacy, per-clinic scoping, minimal PII retention, key rotation.

## 8. Scalability

- Cloud-native: Supabase scales DB + realtime; the frontend is static/CDN-served.
- Hardware: a phone (patient) + any screen (staff) — nothing to install.
- Multi-clinic: a `clinic_id` column + per-clinic realtime channel extends the same design
  from one room to a nationwide chain.

## 9. Measured impact (shown on-screen)

- **"Confirmed in <1 second"** — real scan→dashboard latency.
- Live counters — waiting, in-consult, done, LWBS, no-show.
- **Pharmacy revenue (₹)** and **top conditions** (from consultations) in Reports, exportable to Excel.
