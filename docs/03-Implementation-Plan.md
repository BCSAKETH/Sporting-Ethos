# Sporting Ethos — Implementation Plan

**GigPoint Hackathon 2026 · Track 4 (Healthcare Tech) · Milestone 1**
**Project:** Real-Time Patient Check-In, Live Queue, Ambient Charting & Pharmacy

---

## 1. Feature scope & status (all ✅ built & validated live on Supabase)

**Core — check-in confirmation (the brief)**
1. ✅ Universal QR check-in; **sequential auto appointment IDs** (APT-0001…); no manual ID entry
2. ✅ Sub-second live queue (Supabase Realtime)
3. ✅ Multi-sensory arrival alert — highlight + chime + voice ("‹name› has arrived"), **sound always on**
4. ✅ Queue order + position + live auto-reorder
5. ✅ Branded, verifiable receipt (logo + timestamp + UUID + SHA-256 hash)
6. ✅ Live metrics (measured confirm latency, waiting, LWBS, no-show)
7. ✅ Status flow: waiting → in_consult → done, plus left / no_show / paused

**Queue intelligence**
8. ✅ Emergency priority → jumps queue + recalculates every position/ETA on all phones
9. ✅ Call Next → patient's phone chimes + speaks "It's your turn" (in their language)
10. ✅ Reception ＋ Add patient (desk walk-in registration)

**Ambient AI charting**
11. ✅ FastAPI + Groq (Whisper + Llama 3.3 70B): audio → transcript → structured notes → PDF → patient summary
12. ✅ Expert Console (`/expert`, code-gated) + two-way reception↔expert **intercom**

**Pharmacy & revenue**
13. ✅ Pharmacy counter (`/pharmacy`): dispense by appointment ID, **auto-match Rx → inventory**, add/remove, **payment → bill PDF**, stock decrement
14. ✅ Inventory management (add/edit/remove medicines, ₹ price, stock, low-stock alerts)
15. ✅ Pharmacy revenue in Reports + Excel

**Analytics**
16. ✅ Reports: KPIs, gender/status donuts, age bars, arrivals trend, **booking type**, **top reasons/conditions from consultations**, **pharmacy revenue**, Excel export

**Inclusion**
17. ✅ Language switch — **English / हिन्दी / తెలుగు** (UI + voice)
18. ✅ Accessibility mode — large text + voice-guided check-in

**Roadmap (post-hackathon):** phone-OTP patient auth · role-based RLS · multi-clinic (`clinic_id`) · Gemini single-call charting.

## 2. Architecture decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| App shape | One responsive web app, role-based views + one AI microservice | No installs; one codebase |
| DB + realtime | Supabase (Postgres + Realtime) | Cross-device <1s with minimal server code |
| Appointment IDs | Postgres sequence + `next_appt_id()` RPC | Guaranteed unique, sequential |
| Check-in | Universal QR, no manual ID | Simplest; ID auto-assigned |
| Voice | Browser SpeechSynthesis (multi-lang), always on | Free, offline, nothing to remember |
| Ambient charting | FastAPI + **Groq** | 100% free tier; Whisper + Llama are extremely fast |
| Pharmacy revenue | Bill JSON on the check-in row | One source powers bill PDF + revenue report |
| Reports export | SheetJS `.xlsx` | Real Excel management can use |
| Theme | Clean, minimalist, light | Clinical, trustworthy, glanceable |
| Deploy | Vercel (frontend) + Python host (backend) | One-click static deploy; public URL |

## 3. Build phases (delivered)

| Phase | Work | Status |
|---|---|---|
| Scaffold | Vite + React + Tailwind; `checkins` schema; store with mock fallback | ✅ |
| Check-in | Universal QR → mobile form → Supabase → confirmation + receipt | ✅ |
| Live queue | Realtime queue, highlight + chime + voice on arrival | ✅ |
| Status + emergency | Call next / done / left / no-show / paused; priority + ETA | ✅ |
| Sequential IDs | Postgres sequence + RPC; removed manual ID field | ✅ |
| Reception tools | ＋ Add patient; intercom to expert | ✅ |
| Ambient charting | FastAPI + Groq; record → notes → PDF → patient summary | ✅ |
| Expert console | Credential gate, Now-Consulting hero, waiting queue, intercom | ✅ |
| Pharmacy | Counter (match Rx → bill → payment → stock) + inventory | ✅ |
| Reports | KPIs, charts, reasons, booking type, revenue, Excel | ✅ |
| Inclusion | Languages (EN/HI/TE) + accessibility mode | ✅ |
| Polish | Minimalist light UI, favicon, focus states, shared primitives | ✅ |

## 4. Validation (tested end-to-end, live Supabase)

- ✅ Check-in → sequential ID → dashboard in **<1s**; cross-device verified.
- ✅ Status transitions update live, no reload; emergency reorders everyone.
- ✅ Ambient charting with a **real Groq key** returns genuine structured notes.
- ✅ Pharmacy: lookup by appointment ID → Rx auto-matched → payment → bill PDF → stock decremented → revenue in Reports.
- ✅ Reports filters + Excel export; language switch + accessibility voice.
- ✅ **Production build passes (0 errors).**

## 5. Milestones & timeline (per brief, all due 25/07/2026)

| Task (brief) | Deliverable | Status |
|---|---|---|
| Understand problem/context/users | Problem framing (this doc set) | ✅ |
| Research + finalise approach | Multi-channel + ambient AI + pharmacy | ✅ |
| Solution architecture, user flow, implementation plan | **These 3 documents (M1)** | ✅ |
| Develop core features | Check-in, queue, voice, receipt, status | ✅ |
| Integrate + validate end-to-end | Supabase + Groq + realtime validated (M2) | ✅ |
| Functional MVP/prototype | Full app running (M2 doc) | ✅ |
| Concise presentation | Demo script + pitch (M3 doc) | ✅ |

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wi-Fi flaky at demo | Local mock mode (realtime across tabs) |
| Browser blocks audio | Sound auto-primes on first interaction; highlight + chime still convey |
| Supabase free-tier pause | One-click restore; keys wired |
| Charting backend/key down | Falls back to a labelled sample |
| Phone can't reach localhost QR | Open dashboard on the LAN address before exporting the QR |
| Groq key exposure | Kept server-side in `backend/.env`; regenerate after the event |

## 7. Roles & access

| Role | URL | Code |
|---|---|---|
| Reception | `/` | open |
| Expert | `/expert` | `ethos` (env `VITE_EXPERT_CODE`) |
| Pharmacy | `/pharmacy` | `pharmacy` (env `VITE_PHARMACY_CODE`) |
| Patient | `/checkin` | via QR |

## 8. How to run

```bash
# Frontend
npm install && npm run dev      # open the Network URL (http://192.168.x.x:5173) for phones

# Ambient charting backend
cd backend && pip install -r requirements.txt
#   put GROQ_API_KEY=... in backend/.env  (free: https://console.groq.com/keys)
python -m uvicorn main:app --port 8000
```

Supabase is connected via `.env`; the dashboard badge shows **"Live"**.
Database objects: tables `checkins`, `medicines`; sequence `appt_seq`; function `next_appt_id()`.
