# Sporting Ethos — Milestone 3: Presentation & Demo Script

**GigPoint Hackathon 2026 · Track 4 (Healthcare Tech)**
**Deliverable:** ~10-minute presentation / video (problem → analysis → solution → demo → impact)

---

## Slide / segment outline (with timings)

| # | Segment | Time | Say this |
|---|---|---|---|
| 1 | **Hook** | 0:30 | "At Sporting Ethos, a patient checks in — but the doctor finds out minutes later, from a delayed email. In that gap, patients get missed, slots get wasted, and revenue leaks." |
| 2 | **Problem** | 1:00 | The brief: check-in confirmation is delayed → experts have no real-time signal → missed check-ins → inaccurate records, inefficiency, lost revenue. |
| 3 | **Analysis** | 1:00 | Root cause = a slow, single-channel confirmation you have to *trust*. Fix = instant, **multi-channel, impossible-to-miss** confirmation + a live managed queue. |
| 4 | **Solution overview** | 1:00 | One responsive web app + a small AI backend. Roles: Patient · Reception · Expert · Pharmacy. Powered by Supabase realtime (<1s). |
| 5 | **LIVE DEMO** | 4:00 | *(script below)* |
| 6 | **Under the hood** | 0:45 | Supabase Postgres + Realtime, SHA-256 receipts, Groq Whisper+Llama for charting, all deployable & scalable (multi-clinic ready). |
| 7 | **Impact** | 1:00 | Confirmed in <1s, zero missed check-ins, LWBS visibility, recovered revenue, pharmacy revenue, accessibility in 3 languages. |
| 8 | **Close** | 0:45 | "We didn't just confirm check-ins — we removed uncertainty on every channel and turned the waiting room into a live, revenue-aware, inclusive system." |

## Live demo script (4 min) — phone + laptop side by side

1. **Check in (phone):** scan the QR → enter name → tap Check in. *Show the language switch (EN/हिं/తె) and the ♿ A+ accessibility button.*
2. **Instant confirmation (laptop):** the card **flashes, chimes, and says "‹name› has arrived"** in under a second. Point at the "Confirmed in <1s" metric.
3. **Emergency:** flag a waiting patient as Emergency → they jump to #1, everyone's ETA updates live on the phones.
4. **Call next:** the patient's phone rings + shows "It's your turn."
5. **Ambient charting (Expert console):** Start recording → speak a mock consultation → Stop → **real AI notes** (symptoms/prescriptions/actions) → Download PDF. Patient's phone shows the visit summary.
6. **Pharmacy:** open `/pharmacy` → enter the appointment ID → the **prescribed medicines auto-match to inventory** → Take payment → **bill PDF** prints.
7. **Reports:** show demographics donuts, **top conditions from consultations**, and **pharmacy revenue**; hit **Download Excel**.
8. **Intercom:** Expert hits "Call reception" → the reception screen **blinks + chimes**.

## Impact (the money slide)

- **Business:** fewer missed check-ins → accurate records, recovered slots, **pharmacy revenue captured**, higher throughput.
- **Measured, on-screen:** "Confirmed in <1s", live waiting/LWBS/no-show counters, revenue ₹.
- **Social:** dignity & certainty for patients; **accessibility** (large text + voice) and **3 languages** (English/Hindi/Telugu) for elderly, injured, and non-English speakers.
- **Operational:** real-time queue truth, emergency handling without chaos, reception↔expert intercom.
- **Scalable:** cloud-native (Supabase), phone + screen only, `clinic_id`-ready for a chain.

## One-line pitch
> "Instant, multi-channel check-in confirmation — plus ambient AI charting, pharmacy billing,
> and live analytics — in three languages, confirmed in under a second."
