# Sporting Ethos — User Flow

**GigPoint Hackathon 2026 · Track 4 (Healthcare Tech) · Milestone 1**
**Project:** Real-Time Patient Check-In, Live Queue, Ambient Charting & Pharmacy

---

## 1. Roles & access

| Role | URL | Access | Does |
|---|---|---|---|
| **Patient** | `/checkin` | via QR | Check in, receipt, live position, "your turn", visit summary |
| **Reception** | `/` | open (kiosk) | Live queue, ＋ Add patient, reports/Excel, QR, call expert |
| **Expert** | `/expert` | code `ethos` | Current consultation, ambient charting, mark done, call reception |
| **Pharmacy** | `/pharmacy` | code `pharmacy` | Dispense by appointment ID, billing, inventory |

## 2. Patient flow

```
  [ Universal QR at reception ]  (one code for everyone)
            │ scan
            ▼
   /checkin   ── language switch: EN / हिन्दी / తెలుగు ──   ♿ A+ (large text + voice guide)
   • Full name (required)
   • Age + Gender (optional)
            │ tap "Check in"
            ▼
   Sequential appointment ID (APT-####) assigned automatically  ─► appears on dashboards instantly
            │
            ▼
   ✅ "You're checked in" — queue position ring + estimated wait
      + collapsible receipt (logo, timestamp, UUID, SHA-256 hash, Verified)
            │ page stays live
            ▼
   🔔 "It's your turn" — chime + voice in the chosen language
   📝 "Your visit summary" — once the consultation is charted
   ✅ "Consultation complete"
```

- **No appointment ID is typed** — it is auto-generated in sequence for everyone.
- **Accessibility mode (♿ A+):** enlarges the UI and reads the prompts aloud in the selected
  language — for elderly / injured / non-English speakers.

## 3. Reception flow (`/`)

```
   Live Queue · Reports · Settings   +   ＋ Add patient · 🔔 Call expert · Expert · Pharmacy links
            │
   NEW ARRIVAL (pushed <1s): card highlights · chime · voice "‹name› has arrived"
            ▼
   Per patient: Call next · Pause · Left (LWBS) · Emergency (jump queue)
   ＋ Add patient: register a desk walk-in (auto sequential ID, source = reception)
   🔔 Call expert → rings the Expert Console (blink + chime)
   Incoming "expert is calling" → blinking banner + chime + voice
```

## 4. Expert flow (`/expert`, code-gated)

```
   Now Consulting (hero): patient name + age/gender chips + live timer
     └─ Ambient charting: ● Start recording → Stop & generate
             audio → FastAPI → Groq Whisper (transcript) → Groq Llama (structured JSON)
             → Summary / Symptoms / Prescriptions / Actions → ⬇ Download PDF
             → saved to Supabase → patient sees "Your visit summary"
     └─ ✓ Mark consultation done
   Waiting queue (sidebar): Call each patient · toggle Emergency
   🔔 Call reception → rings the Reception dashboard (blink + chime)
```

## 5. Pharmacy flow (`/pharmacy`, code-gated)

```
   Tabs: Counter · Inventory

   COUNTER:
     type Appointment ID → find patient
       → patient's prescribed medicines (from AI consultation) AUTO-MATCH to inventory
       → editable order (qty +/−, add/remove any stocked medicine)
       → Take payment → generates BILL PDF (tied to appointment ID)
                       → decrements stock → records sale (→ Reports revenue)
       (re-opening a paid appointment shows the bill again to re-download)

   INVENTORY:
     add / edit / remove medicines (name, ₹ price, stock, category); low-stock highlighted
```

## 6. Reports flow (`/` → Reports)

```
   Filters: Scope (Today | All time) · Gender · Age group · Status
   KPIs: Attended · Completed (%) · Avg wait · LWBS rate % · Waiting now · Pharmacy revenue ₹
   Insights: most common gender · busiest age group · peak arrival hour
   Charts: gender donut · status donut · age bars · arrivals trend · booking-type donut
           · Top reasons / conditions (from consultations)
   Table: name, age, gender, booking (Pre-booked/Walk-in + APT), reason, status, times
   ⬇ Download Excel (.xlsx of the filtered list, incl. reason + pharmacy bill)
```

## 7. Status lifecycle

```
                    ┌──────────► paused ──────────┐
                    │                             │
   check in ──► waiting ──► in_consult ──► done   │
                    │            ▲               (resume)
                    │            └───────────────┘
                    ├──► left      (walked out / LWBS)
                    └──► no_show   (booked but never arrived)
```

Any card can be **re-queued** to waiting if a status was set by mistake.

## 8. Edge cases handled

| Scenario | Behaviour |
|---|---|
| Desk walk-in | ＋ Add patient → auto sequential ID, source = reception (Walk-in) |
| Stepped away | Pause → stays listed, not called |
| Patient left | Left → LWBS counter +1, queue reorders |
| Emergency arrival | Emergency → jumps to #1, all ETAs update on phones |
| Wrong status | Re-queue |
| Mic / AI unavailable | Charting falls back to a labelled sample |
| Prescription not stocked | Shown; pharmacist adds any inventory item manually |
| Low stock | Highlighted red in inventory; decremented on each sale |
| Phone can't scan QR | Settings warns to open the dashboard on the LAN address (192.168.x.x) |
| Non-English / low-tech / elderly | Language switch (EN/HI/TE) + accessibility voice-guide |
| Network flaky | Local mock mode keeps the app running (realtime across tabs) |
