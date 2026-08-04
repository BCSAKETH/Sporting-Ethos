# Sporting Ethos — Real-Time Patient Check-In, Live Queue & Ambient Charting

A single responsive web app that confirms patient check-ins **instantly** — on screen, out
loud, and with a verified receipt — turns the waiting room into a live managed queue, and
adds two high-impact extensions: **ambient AI charting** of consultations and a
**filterable performance dashboard with Excel export**.

Built for GigPoint Hackathon 2026 · Track 4 (Healthcare Tech).

## Stack

- **React (Vite) + Tailwind CSS** — frontend (clean, minimalist, light)
- **Supabase (Postgres + Realtime)** — DB & sub-second live updates
- **Browser SpeechSynthesis** — voice announcements, always on (free, built-in)
- **Web Crypto (SHA-256)** — receipt verification hash
- **FastAPI + Groq (Whisper + Llama 3.3 70B)** — ambient charting backend
- **jsPDF** — consultation PDF · **SheetJS (xlsx)** — Excel export · **qrcode.react** — QR

> Runs with **zero setup** in *local mock mode* (realtime across browser tabs). With
> Supabase configured it's cross-**device** (phone → laptop). Charting needs the FastAPI
> backend + a free Groq key.

## Quick start (frontend)

```bash
npm install
npm run dev     # open the printed NETWORK url (http://192.168.x.x:5173) so phones can scan
```

Routes:

- `/` — expert / reception dashboard: **Live Queue · Reports · Settings** (sound is on automatically)
- `/checkin` — patient check-in (what the universal QR opens)

### Ambient charting backend (optional but recommended)

```bash
cd backend
pip install -r requirements.txt
# add a free key (https://console.groq.com/keys) to backend/.env:  GROQ_API_KEY=gsk_...
python -m uvicorn main:app --port 8000
```

`GET http://localhost:8000/health` → `"groq_configured": true` when the key is loaded.
Without it (or without the backend), charting returns a clearly-labelled sample.

## Demo flow

1. On the laptop, open the dashboard at the **network URL** (`http://192.168.x.x:5173`, not
   `localhost`) so the QR is phone-scannable.
2. **Settings** → download / show the universal QR.
3. On a phone (same Wi-Fi), scan it → enter name (+ age/gender/appt) → **Check in**.
4. Dashboard **Live Queue** highlights the card, chimes, and announces *"‹name› has arrived."*
5. **Call next** → patient's phone shows "It's your turn". Start the **Ambient charting**
   panel → speak → **Stop & generate** → structured notes + **Download PDF**.
6. **Reports** → filter by gender / age group / status → **Download Excel**.

## Deploy

- **Frontend (Vercel):** push to GitHub, import, add `VITE_SUPABASE_*` env vars, deploy.
  QR codes then point at the public URL automatically.
- **Charting backend:** host `backend/` on any Python host; set `VITE_CHART_API_URL` in the
  frontend env to its URL.

## Data model (`checkins`)

`id` · `name` · `appointment_id` · `check_in_time` · `status`
(`waiting`/`in_consult`/`done`/`left`/`no_show`/`paused`) · `priority` · `gender` · `age` ·
`hash` (SHA-256) · `notes` (jsonb AI chart).

## Mobile app

[`mobile/`](./mobile) is the Android patient app (Expo + React Native + TypeScript) —
auth, hospital/department/doctor booking, profile with medical history, and QR-based
walk-in check-in, sharing this same Supabase project. See
[`mobile/README.md`](./mobile/README.md). The normalized schema behind it lives in
[`supabase/migrations/`](./supabase/migrations) at the repo root (this file,
`supabase-schema.sql`, is the original kiosk-only schema and is left as-is for history).

## Docs

Full write-ups in [`docs/`](./docs): Solution Architecture · User Flow · Implementation Plan.

## Security note

Kiosk-mode RLS is intentionally open for the demo. The Groq key stays server-side in
`backend/.env` (git-ignored). Tighten RLS and rotate keys before any real deployment.
