# 🚀 ULTIMATE GOD-TIER PROMPT: Universal Multi-Tenant Healthcare SaaS Platform ("Sporting Ethos")

> **Copy & paste the prompt below into Claude / AI Agent to build or refactor the entire system.**

---

```markdown
You are an expert Principal SaaS Architect & Lead Full-Stack Engineer building "Sporting Ethos" — a production-grade, Multi-Tenant Healthcare Platform connecting a Universal Patient Mobile App (Expo / React Native) with a Multi-Tenant Staff Web Console (React / Vite / Tailwind) over a shared Supabase PostgreSQL backend.

---

### 🏛️ 1. SYSTEM VISION & MULTI-TENANT SAAS TOPOLOGY

Transform the single-clinic system into a **Universal Multi-Tenant SaaS Engine** (inspired by India's ABHA ecosystem):

1. **Dedicated Hospital Tenant URLs (`/h/:hospitalCode`)**:
   - Every partnered hospital has a dedicated URL path:
     - `http://localhost:5173/h/city-care` (City Care Hospital — Tenant `SEH-MUM`)
     - `http://localhost:5173/h/metro-health` (Metro Health Hospital — Tenant `SEH-DEL`)
   - Navigating to `/h/:hospitalCode` automatically loads that hospital's branding, logo, colors, and tenant context (`hospital_id`).

2. **Coordinator "Wake-Up" & Access Grant Flow**:
   - **LOCKED STATE**: When a hospital URL (e.g. `/h/city-care`) is opened for the first time, it displays a *"Hospital Tenant Offline / Locked"* screen. Staff cannot log in yet.
   - **MASTER ACTIVATION**: The Hospital Coordinator enters the **Master Hospital Access Code** (e.g., `CITY-100` or `METRO-100`).
   - **LIVE STATE**: Entering the Master Code unlocks and grants access for the entire hospital! The hospital status switches to **LIVE / ONLINE** (`is_live = true`).
   - **STAFF LOGIN UNLOCKED**: Now hospital staff (Doctors `101`–`110`, ER Nurse `201`, Pharmacy `301`, Lab `401`) can enter their role access codes to open their specific operational dashboards.

3. **Universal Patient Mobile App (ABHA Pattern)**:
   - One app for all patients across ALL partnered hospitals. Patients scan a universal QR code at ANY hospital entrance to immediately auto-detect the hospital (`hospital_id`), pick a department, book an appointment or spot check-in, and view live queue status.

4. **2-Hospital Sandbox Blueprint**:
   - Demo sandbox with 2 hospitals: **City Care Hospital** (`city-care` / `CITY-100`) and **Metro Health Hospital** (`metro-health` / `METRO-100`).
   - Two browser windows side-by-side operating under different URLs MUST demonstrate 100% data isolation in real-time.

---

### 🎨 2. DESIGN SYSTEM & AESTHETIC GUIDELINES ("Ivory & Lavender")

Maintain the existing premium visual identity:
- **Color Palette**:
  - Backgrounds: Ivory `#FAF8F5`, Clean White `#FFFFFF`, Subtle Lavender `#F3E8FF`.
  - Primary Accents: Deep Violet `#6D28D9`, Purple `#8B5CF6`, Light Purple `#A78BFA`.
  - Borders & Cards: Soft Slate `/10`, Glassmorphism `#FFFFFFcc` with `backdrop-blur-md`.
- **Typography & Layout**: Modern sans-serif, high-contrast readable metrics, vibrant badges (`emergency` = Red/Rose, `urgent` = Amber, `normal` = Violet).
- **Interactive Feel**: Micro-animations on queue updates, audio chimes, browser speech synthesis, instant visual feedbacks.

---

### 🔐 3. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)

```
  [ /h/city-care ] ────► [ 🔒 LOCKED TENANT SCREEN ]
                                   │
                  Coordinator Enters Master Code (CITY-100)
                                   │
                                   ▼
                      [ 🟢 HOSPITAL TENANT LIVE ]
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  [ Doctor Codes ]          [ ER / Nurse Code ]       [ Pharmacy / Lab Codes ]
  `CC-DOC-101`–`110`        `201` / `nurse`           `301` / `401`
  (Opens Dept Queue & AI)   (Opens Bed Matrix & ER)   (Opens Dispense / Tests)
```

1. **Hospital Coordinator Master Access Code**:
   - Coordinator enters Master Access Code (e.g. `CITY-100` / `METRO-100`).
   - Grants activation for the hospital tenant and opens the Master Overview.
2. **Staff Role Access Codes (Post-Activation)**:
   - `101`–`110` (or `CC-DOC-101`): Specific Department Doctor Access Code (filters queue strictly to their department).
   - `201` / `nurse` / `er-nurse`: Emergency & Triage Nurse Access Code (opens Bed Matrix & Emergency Ward).
   - `pharma` / `301`: Pharmacy Counter Access Code (auto-fetches Rx, stock verification, PDF bill).
   - `lab` / `401`: Lab & Diagnostics Access Code (pending lab requests, sample collection, PDF reports).
3. **Elevated Admin Modal ("Admin Button")**:
   - Located at top-right header of staff console once activated.
   - Prompt PIN (`8888`) to open settings, manage doctor rosters, configure bed matrixes, and generate printable Universal Hospital QR Code.

---

### 🗄️ 4. MULTI-TENANT DATABASE SCHEMA (Supabase PostgreSQL)

Every record table MUST include `hospital_id uuid REFERENCES public.hospitals(id)` for tenant isolation.

#### Extended Table Specifications:
1. **`hospitals`**: `id`, `code`, `name`, `city`, `logo_url`, `is_active`, `is_live`, `master_access_code`, `admin_pin`.
2. **`departments`**: `id`, `hospital_id`, `code`, `name`, `department_type` (`OPD`, `IPD`, `SUPPORT`), `is_active`.
3. **`doctors`**: `id`, `hospital_id`, `department_id`, `access_code`, `first_name`, `last_name`, `specialization`, `status`.
4. **`checkins`**: `id`, `hospital_id`, `department_id`, `doctor_id`, `patient_id`, `appointment_ref`, `appointment_id` (`APT-####`), `name`, `status`, `priority`, `source`, `check_in_time`, `notes` (jsonb), `pharmacy` (jsonb), `lab_orders` (jsonb).
5. **`hospital_beds` (NEW)**:
   - `id`, `hospital_id`, `ward_name` (`ICU`, `Emergency Ward`, `General Ward`), `bed_number`, `status` (`available`, `occupied`, `cleaning`), `assigned_patient_id`, `assigned_checkin_id`, `updated_at`.
6. **`lab_requests` (NEW)**:
   - `id`, `hospital_id`, `patient_id`, `checkin_id`, `doctor_id`, `test_name`, `status` (`pending`, `sample_collected`, `processing`, `completed`), `result_data` (jsonb), `report_url`, `created_at`.
7. **`activity_logs`**: Audit trail tagged with `hospital_id`, `actor_id`, `action`, `created_at`.

---

### 🏥 5. HOSPITAL OPERATIONAL MODULES

#### Module 1: Live Reception Queue (`/h/:hospitalCode/`)
- Realtime queue table filtered strictly by `hospital_id`.
- Audio chiming + text-to-speech for new walk-ins/QR check-ins.
- **Dynamic Priority Escalation**: Patients waiting $>45$ mins highlight amber automatically.

#### Module 2: Clinical Expert & Multilingual AI Charting (`/h/:hospitalCode/expert`)
- Doctor logs in with code (`101`). Filters queue strictly to doctor's department.
- **Multilingual Ambient AI Scribe**: Doctor speaks naturally in English, Hindi, Hinglish, Telugu, or Marathi. Groq Whisper-large-v3 + Llama 3.3 70B auto-translates and formats into clean English clinical JSON (`summary`, `symptoms`, `prescriptions`, `actions`).

#### Module 3: Live Bed & Emergency Ward Matrix (`/h/:hospitalCode/beds`)
- Visual bed grid color-coded by status (Green = Available, Red = Occupied, Yellow = Cleaning).
- One-click patient admission assigning waiting/emergency patient to bed.

#### Module 4: Labs & Diagnostics Queue (`/h/:hospitalCode/labs`)
- Doctor checks lab test boxes during consultation $\rightarrow$ pushes to lab tech queue.
- Lab technician collects sample, uploads report PDF link $\rightarrow$ auto-notifies patient app.

#### Module 5: Pharmacy Counter & Stock Auto-Deduct (`/h/:hospitalCode/pharmacy`)
- Inputs Appointment ID $\rightarrow$ auto-fetches prescription JSON $\rightarrow$ verifies inventory $\rightarrow$ auto-deducts stock $\rightarrow$ renders PDF invoice.

---

### 🛡️ 6. SECURITY SAFEGUARDS & SOLVED LOOPHOLES

1. **Access Code Protection**: Prefix codes (`CC-DOC-101`) + API Rate-Limiting (max 5 failed attempts/min).
2. **Shared Desk Safety**: 15-minute inactivity auto-lock + instant **"Lock Station"** button in top header.
3. **Cross-Tenant Isolation**: Enforce RLS on all tables + mandatory `.eq('hospital_id', activeHospitalId)` in frontend queries.
4. **Mobile Health Record Storage**: Index local files by hospital on device (`PHR/{hospital_id}/{appointment_id}_Rx.pdf`).
5. **Draft Protection**: Auto-save active audio & charting drafts to local `sessionStorage` memory so no clinical note is lost.

---

### 📱 7. UNIVERSAL PATIENT MOBILE APP WORKFLOW

1. **Universal QR Scanner**: Scans QR containing `{ "hospital_id": "...", "hospital_code": "SEH-MUM" }`. Auto-loads hospital departments.
2. **Frictionless Booking**: Selects department $\rightarrow$ chooses doctor/slot or spot check-in ticket (`APT-1042`).
3. **Realtime Queue ETA Tracker**: Live progress bar: *"Your position: #3 | ~24 mins wait"*.
4. **WhatsApp & SMS Zero-App Ticket**: Scanning QR on standard phone camera offers zero-app ticket dispatch via WhatsApp/SMS link.
5. **Offline-First QR Generator**: If patient phone is offline, generates local encrypted QR payload to show to reception scanner.

---

### ⏩ 8. PHASE DEFERRALS

- **[PHASE 2 DEFERRED]**: ABDM / ABHA 14-Digit Health ID Integration & FHIR Interoperability Network.

---

### 💻 9. STAFF WEB CONSOLE & ROUTING WORKFLOW

```javascript
// src/main.jsx
<Routes>
  <Route path="/h/:hospitalCode" element={<Dashboard />} />
  <Route path="/h/:hospitalCode/expert" element={<Expert />} />
  <Route path="/h/:hospitalCode/pharmacy" element={<Pharmacy />} />
  <Route path="/h/:hospitalCode/beds" element={<BedMatrix />} />
  <Route path="/h/:hospitalCode/labs" element={<LabQueue />} />
  <Route path="/h/:hospitalCode/checkin" element={<PatientCheckIn />} />
</Routes>
```

1. **Hospital Activation Guard**: When entering `/h/city-care`, if `is_live` is false and no session exists, render **Coordinator Master Unlock Screen**. Entering `CITY-100` marks hospital **LIVE**.
2. **Staff Access & Department Queue**: Staff enter role codes (`101`–`110`, `201`, `301`, `401`). Doctor view filters queue strictly by department.
3. **Admin Modal ("Admin Button")**: PIN-protected (`8888`) modal for updating hospital settings, staff roster, wards, and printing the Universal Hospital QR Code.

---

### ⚡ 10. STEP-BY-STEP IMPLEMENTATION ROADMAP

1. **Database Migration**: Apply `20260803120017_multi_tenant_beds_labs.sql` to introduce `is_live`, `hospital_beds`, `lab_requests`, and `current_hospital_id()`.
2. **URL Routing & Store Refactor**: Update `src/main.jsx` for `/h/:hospitalCode/*` routes and `src/lib/store.js` for Coordinator Master Activation & tenant filtering.
3. **Coordinator Master Unlock Component**: Build `<CoordinatorUnlockScreen />` component for tenant activation.
4. **Hospital Admin Modal Component**: Add `<AdminModal />` in staff console header.
5. **Beds & Labs UI Components**: Build `<BedMatrix />` and `<LabQueue />` views in staff console.
6. **Mobile App QR Context**: Update mobile QR scanner to parse multi-tenant payload and query hospital-specific departments.
7. **2-Hospital Sandbox Demo**: Verify City Care (`/h/city-care`) vs Metro Health (`/h/metro-health`) sandbox.

Produce complete, non-stubbed, clean code matching the Ivory & Lavender design system.
```
