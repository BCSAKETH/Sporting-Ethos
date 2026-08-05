# 👑 THE COMPLETE MASTER BLUEPRINT: Sporting Ethos Universal Multi-Tenant SaaS Platform

---

## 🏛️ 1. ARCHITECTURAL TOPOLOGY & MULTI-TENANT ENGINE

```
                         ┌─────────────────────────────────────────────────────────────┐
                         │               UNIVERSAL SUPABASE BACKEND                    │
                         │      (100% Isolated per Hospital via hospital_id)           │
                         └──────────────┬───────────────────────────────┬──────────────┘
                                        │                               │
              ┌─────────────────────────┴─────────────┐   ┌─────────────┴─────────────────────────┐
              │  📱 UNIVERSAL PATIENT MOBILE APP      │   │  💻 UNIVERSAL STAFF WEB CONSOLE       │
              │  (ABHA-Style QR Scan at ANY Hospital) │   │  (Dedicated URLs: /h/:hospitalCode)   │
              │  Auto-detects hospital_id             │   │  Coordinator Master Code Activation   │
              │  Department & Doctor Booking          │   │  Role Access Codes (101, 201, 301)    │
              │  Realtime Queue ETA Tracker           │   │  Live Bed Matrix & Emergency Ward     │
              │  WhatsApp / SMS Zero-App Ticket       │   │  Lab Requests & Diagnostics Queue     │
              │  Dual-Storage Health Records (PHR)    │   │  Multilingual Ambient AI Scribe       │
              └───────────────────────────────────────┘   └───────────────────────────────────────┘
```

---

## 🌐 2. DEDICATED HOSPITAL URLS & ACTIVATION HIERARCHY

### URL Structure
- **City Care Hospital**: `http://localhost:5173/h/city-care`
- **Metro Health Hospital**: `http://localhost:5173/h/metro-health`

### Activation & Access Flow
```
 1. Staff Navigates to Dedicated URL (http://localhost:5173/h/city-care)
                                 │
                                 ▼
                 2. [ 🔒 HOSPITAL TENANT LOCKED ]
                 "Hospital Tenant Offline / Locked"
                                 │
                  Coordinator Enters Master Secret
                        (e.g., CITY-100)
                                 │
                                 ▼
                 3. [ 🟢 HOSPITAL TENANT LIVE ]
                 Hospital Granted Access & Activated
                                 │
  ┌──────────────────────────────┼──────────────────────────────┐
  ▼                              ▼                              ▼
[ Doctor Codes ]          [ ER / Nurse Code ]           [ Pharmacy / Lab Codes ]
`101`–`110`               `201` / `nurse`               `301` / `401`
(Opens Dept Queue & AI)   (Opens Bed Matrix & Triage)   (Opens Dispense / Test Queue)
```

1. **Coordinator Master Activation**:
   - Hospital URL displays a **Locked Screen** until the Coordinator enters the Master Code (e.g. `CITY-100`).
   - Activates the live hospital state (`is_live = true`).
2. **Staff Role Login**:
   - `101`–`110`: Specific Department Doctor Access Code (filters queue to their specific department).
   - `201` / `nurse`: Emergency Triage & Bed Matrix Code.
   - `301` / `pharma`: Pharmacy Counter Code.
   - `401` / `lab`: Lab Diagnostics Desk Code.
3. **Elevated Admin Modal ("Admin Button")**:
   - Located at top-right of staff console once activated.
   - Prompt PIN (e.g. `8888`) to open settings, manage doctor rosters, configure beds, and print Universal Hospital QR Code.

---

## 🗄️ 3. DATABASE SCHEMA & TABLE SPECIFICATIONS (Supabase PostgreSQL)

Every record table includes `hospital_id uuid REFERENCES public.hospitals(id)` for tenant isolation.

### Tables
1. **`hospitals`**: `id`, `code`, `name`, `city`, `logo_url`, `is_active`, `is_live`, `master_access_code`, `admin_pin`.
2. **`departments`**: `id`, `hospital_id`, `code`, `name`, `department_type` (`OPD`, `IPD`, `SUPPORT`), `is_active`.
3. **`doctors`**: `id`, `hospital_id`, `department_id`, `access_code`, `first_name`, `last_name`, `specialization`, `status`.
4. **`checkins`**: `id`, `hospital_id`, `department_id`, `doctor_id`, `patient_id`, `appointment_ref`, `appointment_id` (`APT-####`), `name`, `status`, `priority`, `source`, `check_in_time`, `notes` (jsonb), `pharmacy` (jsonb), `lab_orders` (jsonb).
5. **`hospital_beds`**: `id`, `hospital_id`, `ward_name` (`ICU`, `Emergency Ward`, `General Ward`), `bed_number`, `status` (`available`, `occupied`, `cleaning`), `assigned_patient_id`, `assigned_checkin_id`, `updated_at`.
6. **`lab_requests`**: `id`, `hospital_id`, `patient_id`, `checkin_id`, `doctor_id`, `test_name`, `status` (`pending`, `sample_collected`, `processing`, `completed`), `result_data` (jsonb), `report_url`, `created_at`.
7. **`activity_logs`**: `id`, `hospital_id`, `actor_id`, `action`, `created_at`.

---

## 🏥 4. OPERATIONAL MODULE SPECIFICATIONS

### Module 1: Live Reception Queue (`/h/:hospitalCode/`)
- Realtime queue table filtered strictly by `hospital_id`.
- Audio chiming + text-to-speech for new walk-ins/QR check-ins.
- Dynamic Priority Escalation: Patients waiting $>45$ mins highlight amber automatically.

### Module 2: Clinical Expert & Multilingual AI Charting (`/h/:hospitalCode/expert`)
- Doctor logs in with code (`101`). Filters queue to their department.
- **Multilingual Ambient AI Scribe**: Doctor speaks naturally in English, Hindi, Hinglish, Telugu, or Marathi. Groq Whisper + Llama 3.3 translates & formats into clean English clinical JSON (`summary`, `symptoms`, `prescriptions`, `actions`).

### Module 3: Live Bed & Emergency Ward Matrix (`/h/:hospitalCode/beds`)
- Visual bed grid color-coded by status (Green = Available, Red = Occupied, Yellow = Cleaning).
- One-click admission assigning waiting/emergency patient to bed.

### Module 4: Labs & Diagnostics Desk (`/h/:hospitalCode/labs`)
- Doctor checks lab test boxes during consultation $\rightarrow$ pushes to lab tech queue.
- Lab tech collects sample, uploads report PDF link $\rightarrow$ auto-notifies patient app.

### Module 5: Pharmacy Counter & Stock Auto-Deduct (`/h/:hospitalCode/pharmacy`)
- Inputs Appointment ID $\rightarrow$ auto-fetches prescription JSON $\rightarrow$ verifies inventory $\rightarrow$ auto-deducts stock $\rightarrow$ renders PDF invoice.

---

## 📁 5. DUAL-STORAGE ARCHITECTURE

1. **Hospital Cloud Storage**: Saves PDF invoices and lab reports to Supabase Storage bucket (`hospital-records/{hospital_id}/{patient_id}/`).
2. **Patient Device Local Storage**: Mobile app fetches PDF via API and saves locally to device file storage for offline viewing.

---

## 🔒 6. SECURITY SAFEGUARDS & SOLVED LOOPHOLES

| Identified Vulnerability | Solved Engineering Safeguard |
| :--- | :--- |
| **Access Code Brute-Forcing** | Prefix codes (`CC-DOC-101`) + Supabase API Rate-Limiting (max 5 failed attempts/min). |
| **Shared Desk Contamination** | 15-minute inactivity auto-lock + instant "Lock Station" button in header. |
| **Cross-Tenant Data Leak** | Strict RLS on all tables + mandatory `.eq('hospital_id', activeHospitalId)` in frontend queries. |
| **Mobile Storage Record Mix-Up**| Index local files by hospital: `PHR/CityCare_SEH-MUM/APT-1042_Rx.pdf`. |
| **Mid-Consultation Lockout** | Save active audio & charting drafts to local `sessionStorage` memory. |

---

## 🔮 7. ADVANCED INNOVATIONS

1. **WhatsApp & SMS Instant Ticket**: Scanning QR on phone camera allows zero-app check-in $\rightarrow$ sends live queue ticket link via WhatsApp/SMS.
2. **Offline-First QR Generator**: If patient phone is offline, generates local encrypted QR payload to show to reception scanner.
3. **Predictive Heatmaps**: Admin analytics showing peak OPD hours and bottleneck wait-time alerts.
4. **ABDM / ABHA Integration**: Linking 14-digit ABHA ID for interoperable FHIR health records.

---

## 🎨 8. DESIGN SYSTEM ("Ivory & Lavender")

- **Backgrounds**: Ivory `#FAF8F5`, Clean White `#FFFFFF`, Subtle Lavender `#F3E8FF`.
- **Primary Accents**: Deep Violet `#6D28D9`, Purple `#8B5CF6`, Light Purple `#A78BFA`.
- **Borders & Glassmorphism**: Soft Slate `/10`, `backdrop-blur-md`.
- **Badges**: Red (Emergency), Amber (Urgent), Violet (Normal).

---

## 🧪 9. 2-HOSPITAL DEMO BLUEPRINT

- **Hospital A**: `http://localhost:5173/h/city-care` (Code: `SEH-MUM` / Master Code: `CITY-100`)
- **Hospital B**: `http://localhost:5173/h/metro-health` (Code: `SEH-DEL` / Master Code: `METRO-100`)
- **Verification**: Open side-by-side browser windows. Scan QR code on patient mobile app $\rightarrow$ patient appears **ONLY** in the target hospital window in $<1$ second.
