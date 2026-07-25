# Sporting Ethos — Milestone 2: Functional MVP & Validated Workflow

**GigPoint Hackathon 2026 · Track 4 (Healthcare Tech)**
**Deliverable:** Functional MVP/Prototype + validated end-to-end workflow

---

## 1. What was built

A complete, working clinic operations system that eliminates check-in uncertainty and
extends into charting, pharmacy billing, and analytics — one responsive web app + a small
AI backend, live on Supabase.

**Core (the brief's problem — solved):**
- **Universal QR check-in** — one code for everyone; sequential auto appointment IDs (APT-0001…).
- **Sub-second live queue** for the expert/reception (Supabase Realtime, no refresh).
- **Multi-sensory arrival confirmation** — on-screen highlight + chime + spoken *"‹name› has arrived."*
- **Verifiable receipt** — SHA-256 hash, UUID, timestamp.
- **Full status lifecycle** — waiting → in_consult → done, plus left (LWBS) / no-show / paused.
- **Emergency priority** — jumps the queue; all positions/ETAs recalculate on every phone.
- **Call-next** rings the patient's phone (chime + voice, in their language).

**High-impact extensions:**
- **Ambient AI charting** (FastAPI + Groq Whisper + Llama 3.3 70B): consultation audio →
  transcript → structured notes (Symptoms/Prescriptions/Actions) → PDF → patient visit summary.
- **Pharmacy** (`/pharmacy`): dispense by appointment ID → prescriptions auto-matched to
  inventory → bill + payment → **PDF invoice** + stock decrement; plus inventory management.
- **Reports** — KPIs, demographic donuts/bars, arrivals trend, **top reasons/conditions
  (from consultations)**, **pharmacy revenue**, and one-click **Excel export**.
- **Expert Console** (`/expert`) + **reception intercom** (two-way call bell).
- **Reception "＋ Add patient"** (desk walk-in registration).
- **3 languages** (English/Hindi/Telugu) + **accessibility mode** (large text + voice guide).

## 2. Architecture (brief)

```
Patient phone ─┐                         ┌─ Reception dashboard (/)
Universal QR   ├─ INSERT/READ ─► SUPABASE ◄─ Expert console (/expert)
               │   Postgres + Realtime    ├─ Pharmacy (/pharmacy)
               │   (<1s broadcast)        └─ Reports / Excel
Ambient charting: dashboard audio ─► FastAPI ─► Groq (Whisper + Llama) ─► notes + PDF
```

**Stack:** React (Vite) + Tailwind · Supabase (Postgres + Realtime) · FastAPI + Groq ·
Web SpeechSynthesis (voice) · Web Crypto (SHA-256) · jsPDF (receipt/bill) · SheetJS (Excel).

## 3. End-to-end workflow — validated

| # | Flow | Result |
|---|---|---|
| 1 | Scan QR → check in (name/age/gender) | Sequential APT-#### assigned; row in Postgres |
| 2 | Dashboard receives arrival | Appears in **<1s** ("Confirmed in <1s") + highlight + chime + voice |
| 3 | Call next | Patient phone shows "It's your turn" + chime/voice; status → in_consult |
| 4 | Expert records consultation | Groq returns real structured notes (verified live) |
| 5 | Mark done | Notes saved; patient sees visit summary |
| 6 | Pharmacy: enter APT id | Prescriptions auto-matched to inventory → bill → payment → PDF, stock ↓ |
| 7 | Reports | Live demographics, reasons, and pharmacy revenue; Excel export |
| 8 | Emergency flag | Patient jumps to #1; all ETAs update |

All verified against the **live Supabase database**; production build passes (0 errors).

## 4. Roles & access

| Role | URL | Access |
|---|---|---|
| Reception | `/` | open (kiosk) |
| Expert | `/expert` | code `ethos` |
| Pharmacy (counter + inventory) | `/pharmacy` | code `pharmacy` |
| Patient | `/checkin` | via QR |

## 5. How to run

```bash
# Frontend
npm install && npm run dev      # open the Network URL (192.168.x.x) for phones

# Ambient charting backend
cd backend && pip install -r requirements.txt
#   add GROQ_API_KEY to backend/.env (free: console.groq.com)
python -m uvicorn main:app --port 8000
```

Supabase is connected via `.env`; the dashboard badge shows **"Live"**.
