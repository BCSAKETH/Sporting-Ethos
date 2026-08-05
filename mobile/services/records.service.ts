import { supabase } from "../lib/supabase";

// Loosely-typed handle for tables/columns newer than the generated DB types
// (the admissions table and the checkins.prescriptions column).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

// Structured prescription (doctor's e-Rx intake schema).
export interface StructuredMedication {
  medicine_name: string;
  dosage: number;
  frequency: number;
  duration_days: number;
  route?: string;
  before_after_food?: string;
  timing?: { morning?: boolean; afternoon?: boolean; evening?: boolean; night?: boolean };
  special_instructions?: string;
}

// A patient's past consultation (doctor's ambient-charting notes on a check-in).
export interface ConsultationReport {
  id: string;
  date: string;
  rawDate: string;
  department: string | null;
  appointmentId: string | null;
  summary: string | null;
  symptoms: string[];
  prescriptions: string[];
  medications: StructuredMedication[];
  actions: string[];
}

// Live inpatient admission with a running room-charge total.
export interface ActiveAdmission {
  id: string;
  admissionNo: string;
  ward: string | null;
  room: string | null;
  bed: string | null;
  dailyRate: number;
  admissionDate: string;
  days: number;
  runningCharges: number;
}

// A patient's pharmacy bill (stored on the check-in when meds are dispensed).
export interface PatientBill {
  id: string;
  billNo: string;
  date: string;
  rawDate: string;
  department: string | null;
  items: { name: string; price: number; qty: number; instruction: string | null }[];
  total: number;
  status: "Paid" | "Pending";
}

function prescriptionText(p: unknown): string {
  if (typeof p === "string") return p;
  const o = p as { name?: string; dosage?: string; frequency?: string };
  return [o?.name, o?.dosage, o?.frequency].filter(Boolean).join(" ");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  } catch {
    return iso;
  }
}

/** Reads the logged-in patient's real check-ins and derives their consultation reports + pharmacy bills. */
export async function getPatientRecords(
  patientId: string,
): Promise<{ reports: ConsultationReport[]; bills: PatientBill[] }> {
  const { data, error } = await db
    .from("checkins")
    .select("id, appointment_id, check_in_time, notes, pharmacy, prescriptions, department_id, departments(name)")
    .eq("patient_id", patientId)
    .order("check_in_time", { ascending: false });
  if (error) throw error;

  const reports: ConsultationReport[] = [];
  const bills: PatientBill[] = [];

  for (const r of data ?? []) {
    const deptName = (r as { departments?: { name?: string } }).departments?.name ?? null;
    const dateStr = formatDate(r.check_in_time as string);

    const notes = r.notes as {
      summary?: string;
      symptoms?: string[];
      prescriptions?: unknown[];
      actions?: string[];
    } | null;
    const medications = (Array.isArray(r.prescriptions) ? r.prescriptions : []) as StructuredMedication[];
    if (medications.length || (notes && (notes.summary || notes.prescriptions?.length || notes.symptoms?.length))) {
      reports.push({
        id: r.id as string,
        date: dateStr,
        rawDate: r.check_in_time as string,
        department: deptName,
        appointmentId: (r.appointment_id as string) ?? null,
        summary: notes?.summary ?? null,
        symptoms: notes?.symptoms ?? [],
        prescriptions: (notes?.prescriptions ?? []).map(prescriptionText).filter(Boolean),
        medications,
        actions: notes?.actions ?? [],
      });
    }

    const pharmacy = r.pharmacy as {
      bill_no?: string;
      items?: { name: string; price: number; qty: number; instruction?: string | null }[];
      total?: number;
      paid?: boolean;
    } | null;
    if (pharmacy && pharmacy.items?.length) {
      bills.push({
        id: r.id as string,
        billNo: pharmacy.bill_no ?? "—",
        date: dateStr,
        rawDate: r.check_in_time as string,
        department: deptName,
        items: pharmacy.items.map((it) => ({
          name: it.name,
          price: Number(it.price) || 0,
          qty: Number(it.qty) || 1,
          instruction: it.instruction ?? null,
        })),
        total: Number(pharmacy.total) || 0,
        status: pharmacy.paid ? "Paid" : "Pending",
      });
    }
  }

  return { reports, bills };
}

/** The patient's current inpatient admission (if any) with a live running room bill. */
export async function getActiveAdmission(patientId: string): Promise<ActiveAdmission | null> {
  const { data, error } = await db
    .from("admissions")
    .select("id, admission_no, admission_date, wards(name), rooms(room_number, daily_rate), beds(bed_number)")
    .eq("patient_id", patientId)
    .eq("status", "admitted")
    .order("admission_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const rooms = (data as { rooms?: { room_number?: string; daily_rate?: number } }).rooms;
  const dailyRate = Number(rooms?.daily_rate || 0);
  const ms = Date.now() - new Date(data.admission_date as string).getTime();
  const days = Math.max(1, Math.ceil(ms / (24 * 3600 * 1000)));
  return {
    id: data.id as string,
    admissionNo: data.admission_no as string,
    ward: (data as { wards?: { name?: string } }).wards?.name ?? null,
    room: rooms?.room_number ?? null,
    bed: (data as { beds?: { bed_number?: string } }).beds?.bed_number ?? null,
    dailyRate,
    admissionDate: data.admission_date as string,
    days,
    runningCharges: days * dailyRate,
  };
}
