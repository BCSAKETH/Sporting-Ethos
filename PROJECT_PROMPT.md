# Comprehensive Build Prompt: Sporting Ethos — Real-Time Medical Queue, Voice Intercom, Ambient AI Charting & Pharmacy Management System

Build a full-stack, real-time sports-medicine clinic operations platform named **"Sporting Ethos"**. The platform consists of a single-page React frontend (Vite + Tailwind CSS), a dual-mode real-time state layer (Supabase PostgreSQL + Local Storage/BroadcastChannel fallback), and a Python FastAPI backend powered by Groq AI (Whisper-large-v3 + Llama 3.3 70B) for zero-click ambient clinical charting.

---

## 🛠 1. Tech Stack & Key Libraries

### **Frontend**
- **Framework**: React 18 + Vite (SPA routing via `react-router-dom` v6)
- **Styling**: Tailwind CSS v3 (Emerald/Teal/Slate modern clinical color palette)
- **Icons & Visuals**: Lucide React / SVG Icons, `qrcode.react` for dynamic QR generation
- **Utilities**:
  - `jspdf` for printing professional PDF pharmacy receipts
  - `xlsx` for exporting queue & financial reports to Excel
  - Web Speech API (`speechSynthesis`) + Web Audio API (`AudioContext`) for voice announcements & chime effects
  - Web Crypto API for SHA-256 cryptographic receipt verification

### **Backend**
- **Framework**: Python FastAPI + Uvicorn
- **AI Integrations (Groq API)**:
  - **Speech-to-Text**: `groq/whisper-large-v3`
  - **Clinical Structuring**: `groq/llama-3.3-70b-versatile` (JSON mode)
- **Fallback**: Graceful mock mode returning structured sample clinical notes when no `GROQ_API_KEY` is provided.

### **Database & Real-time Layer**
- **Primary**: Supabase (PostgreSQL with Supabase Realtime WebSocket subscriptions)
- **Fallback**: `localStorage` + HTML5 `BroadcastChannel` (for zero-config offline multi-tab synchronization)

---

## 📁 2. Application Architecture & Folder Structure

```
sporting-ethos/
├── backend/
│   ├── main.py                # FastAPI server (Groq Whisper & Llama 3.3 70B endpoint)
│   ├── requirements.txt       # fastapi, uvicorn, requests, python-dotenv, pydantic
│   └── .env                   # GROQ_API_KEY=gsk_...
├── api/                       # Vercel Serverless API wrappers (chart.js, health.js)
├── supabase-schema.sql        # Postgres DDL & RLS policies
├── package.json
├── tailwind.config.js
├── vite.config.js
└── src/
    ├── main.jsx               # React Router config
    ├── index.css              # Global styles & Tailwind imports
    ├── pages/
    │   ├── Dashboard.jsx      # Reception Command Center / Queue Monitor ("/")
    │   ├── PatientCheckIn.jsx # Self Check-In Kiosk screen ("/checkin")
    │   ├── Expert.jsx         # Credential-gated Doctor Console with Ambient AI ("/expert")
    │   └── Pharmacy.jsx       # Credential-gated Pharmacy & Inventory ("/pharmacy")
    ├── components/
    │   ├── Logo.jsx           # Ethos branding emblem
    │   ├── MetricsStrip.jsx   # Live stats (Wait time, queue count, completion rate)
    │   ├── QueueCard.jsx      # Patient queue item component
    │   ├── ConsultationPanel.jsx # Audio recorder & AI note summary editor
    │   ├── ReportsPanel.jsx   # Analytics charts & Excel export
    │   ├── Charts.jsx         # Custom SVG/CSS queue distribution bar & donut charts
    │   └── Receipt.jsx        # Patient appointment token component
    └── lib/
        ├── store.js           # Unified Data Abstraction Layer (Supabase + Local fallback)
        ├── supabase.js        # Supabase JS client initializer
        ├── chart.js           # API client for Ambient AI Charting backend
        ├── voice.js           # Text-to-Speech audio announcements & Web Audio chimes
        ├── intercom.js        # Cross-room signaling (Reception <-> Doctor intercom)
        ├── hash.js            # Cryptographic SHA-256 receipt hashing
        ├── bill.js            # jsPDF PDF receipt compiler
        └── i18n.js            # Multilingual support (EN, HI, TA, TE, KN)
```

---

## 🗄 3. Database Schema & State Management

### **A. Supabase Schema (`supabase-schema.sql`)**
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patients Queue Table
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT UNIQUE NOT NULL, -- Format: APT-0001, APT-0002...
  name TEXT NOT NULL,
  gender TEXT,
  age INT,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'in_consult' | 'done' | 'left' | 'no_show' | 'paused'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'emergency'
  source TEXT NOT NULL DEFAULT 'self', -- 'self' (QR checkin) | 'reception' (Walk-in)
  hash TEXT, -- SHA-256 hash of patient checkin data
  notes JSONB, -- AI Clinical Notes: { summary, symptoms[], prescriptions[], actions[] }
  pharmacy JSONB -- Paid Bill Details: { items[], subtotal, tax, total, paidAt }
);

-- Medicines Inventory Table
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'tablets',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
```

### **B. Data Layer (`store.js`)**
- Create a single wrapper module (`store.js`) that exports methods: `listCheckins()`, `createCheckin()`, `updateStatus()`, `setPriority()`, `saveNotes()`, `listMedicines()`, `addMedicine()`, `savePharmacyBill()`, and `subscribe()`.
- **Dual Mode**: If Supabase env vars are set, use `@supabase/supabase-js`. If missing, default to `localStorage` + `BroadcastChannel('ethos')`.
- **Queue Priority Sorting Algorithm**: Always sort active patients by:
  1. `priority === 'emergency'` first.
  2. `check_in_time` ascending (oldest arrival time first).

---

## 🤖 4. Ambient AI Charting Backend (`main.py`)

A FastAPI backend endpoint (`POST /api/chart`) that processes spoken audio consultations:

1. **Input Payload**: `{ "audioBase64": "<base64_string>", "mime": "audio/webm", "transcript": "" }`
2. **Groq Whisper Transcription**: Sends decoded audio to `https://api.groq.com/openai/v1/audio/transcriptions` using `whisper-large-v3`.
3. **Groq Llama 3.3 70B Structuring**: Sends transcript to `https://api.groq.com/openai/v1/chat/completions` using `llama-3.3-70b-versatile` with JSON response mode.
4. **System Prompt**:
   > *"You are a precise clinical scribe at a sports-medicine clinic. Extract structured notes from the transcript. Return ONLY valid JSON with keys: summary (string), symptoms (array of strings), prescriptions (array of strings), actions (array of strings)."*
5. **Output JSON**:
   ```json
   {
     "summary": "Patient presented with right knee sprain following sprint training.",
     "symptoms": ["Right knee pain", "Mild joint swelling"],
     "prescriptions": ["Ibuprofen 400mg twice daily"],
     "actions": ["RICE protocol for 48 hrs", "Physiotherapy referral"],
     "engine": "groq",
     "transcript": "..."
   }
   ```
6. **Mock Fallback**: If `GROQ_API_KEY` is not present, immediately return a realistic mock JSON note without throwing errors.

---

## 🖥 5. Key Frontend Pages & Core Features

### **Page 1: Universal Patient Check-In Kiosk (`/checkin`)**
- Access via scanning the clinic's universal QR code.
- **Multilingual UI**: Toggle between English, Hindi, Tamil, Telugu, and Kannada (`i18n.js`).
- **Form Fields**: Full Name, Age, Gender, Emergency Priority toggle.
- **Token Generation**: Generates sequential ID (`APT-0042`) and calculates a SHA-256 verification hash.
- **Digital Receipt View**: Displays appointment token, QR code of token payload, cryptographic hash badge, and estimated wait time.

### **Page 2: Reception Command Center / Queue Dashboard (`/`)**
- **Metrics Strip**: Total today, active waiting queue, estimated wait time per patient (default ~8 mins), completed consultations.
- **Universal Kiosk QR Display**: Enlarged QR code displayed on reception screen for arriving patients to scan.
- **Real-Time Patient Queue**:
  - Displays queue items with status badges (`Waiting`, `In Consult`, `Emergency`, `Paused`).
  - Controls to: Call Patient, Pause Queue Position, Toggle Emergency Triage, Mark Complete / No-Show.
  - Quick Walk-In Form modal for reception staff to manually enter non-smartphone patients.
- **Voice Intercom**: "Call Expert" button that triggers a live audio chime & TTS announcement on the Doctor's console.
- **Analytics & Reports Tab**: Age distribution graphs, queue latency charts, CSV/Excel export button.

### **Page 3: Doctor / Clinician Console (`/expert`)**
- **Passcode Gate**: Requires security code (`ethos`) stored in `localStorage`.
- **Active Patient Panel**: Shows active patient details, arrival timestamp, and visit history.
- **Ambient Voice AI Charting**:
  - Audio recording button (`navigator.mediaDevices.getUserMedia`).
  - Live audio waveform vizualizer.
  - Sends recorded audio chunk to `/api/chart` API.
  - Auto-fills structured notes: Summary, Symptoms, Prescriptions, Follow-up Actions.
  - Doctor can edit any generated note before saving to the patient's record.
- **Call Reception Intercom**: One-click chime to signal reception desk.

### **Page 4: Pharmacy Counter & Inventory Management (`/pharmacy`)**
- **Passcode Gate**: Secured with pharmacy access code.
- **Patient Lookup**: Search patient by Appointment ID (`APT-XXXX`).
- **Auto-Prescription Import**: Pulls structured prescriptions generated by the Doctor's Ambient AI note.
- **Inventory System**: CRUD operations on medicines (Name, Unit Price, Available Stock).
- **Billing Calculator**: Select medicines, adjust quantities, apply consultation fees & tax automatically. Deducts sold quantities from inventory stock upon payment.
- **PDF Receipt Generator (`bill.js`)**: Generates branded printable PDF receipts containing clinic logo, patient info, itemized table, total charges, and cryptographic verification hash.

---

## 🔊 6. Audio Engine & Voice Intercom

- **`voice.js`**:
  - Web Audio API synth oscillator for crisp 2-tone doorbell chimes (`chime()`).
  - SpeechSynthesis engine (`announce(text)`) for audio callouts (e.g., *"Patient Rahul Sharma, please proceed to Consultation Room 1"*).
  - Browser audio auto-priming on first user touch/click.
- **`intercom.js`**:
  - Uses `BroadcastChannel('ethos_intercom')` to transmit signals (`call_expert`, `call_reception`) across browser tabs instantly without network delay.

---

## 🚀 7. Step-by-Step Setup Instructions

1. **Clone & Install Frontend**:
   ```bash
   npm install
   npm run dev
   ```
2. **Setup Supabase Database (Optional)**:
   - Create a Supabase project and execute `supabase-schema.sql` in the SQL Editor.
   - Add `.env` file in the root directory:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     VITE_CHART_API_URL=http://localhost:8000
     ```
3. **Run AI Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   export GROQ_API_KEY="gsk_..."  # Free key from console.groq.com
   uvicorn main:app --reload --port 8000
   ```
