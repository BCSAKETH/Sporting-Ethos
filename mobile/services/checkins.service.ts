import { supabase } from "../lib/supabase";
import type { Checkin } from "../types/models";

export { sortQueue, isActiveCheckin, queuePosition } from "../utils/queue";

/** The live walk-in queue for a hospital — same table + shape the web reception dashboard reads. */
export async function listHospitalQueue(hospitalId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("check_in_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMyCheckin(checkinId: string): Promise<Checkin | null> {
  const { data, error } = await supabase.from("checkins").select("*").eq("id", checkinId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface ActiveVisit {
  id: string;
  queueId: string | null;
  appointmentId: string | null;
  status: string;
  priority: string | null;
  department: string | null;
  checkInTime: string;
}

// The patient's current in-progress visit (queue token → APT), live.
export async function getMyActiveCheckin(patientId: string): Promise<ActiveVisit | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;
  const { data, error } = await db
    .from("checkins")
    .select("id, queue_id, appointment_id, status, priority, check_in_time, department_id, departments(name)")
    .eq("patient_id", patientId)
    .in("status", ["waiting", "waiting_reception", "waiting_department", "in_consult", "paused"])
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    queueId: data.queue_id ?? null,
    appointmentId: data.appointment_id ?? null,
    status: data.status,
    priority: data.priority ?? null,
    department: data.departments?.name ?? null,
    checkInTime: data.check_in_time,
  };
}

export interface SpotCheckInInput {
  patientId: string;
  hospitalId?: string | null;
  fullName: string;
  departmentId?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
}

/** Creates a walk-in check-in tied to the logged-in patient's profile (the QR spot-registration flow). */
export async function spotCheckIn(input: SpotCheckInInput): Promise<Checkin> {
  const initialStatus = input.departmentId ? "waiting_department" : "waiting_reception";
  const payload: any = {
    name: input.fullName,
    patient_id: input.patientId,
    hospital_id: input.hospitalId ?? null,
    department_id: input.departmentId ?? null,
    status: initialStatus,
    priority: "normal",
    source: "self",
    age: input.age ?? null,
    gender: input.gender ?? null,
  };

  const { data, error } = await supabase
    .from("checkins")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToHospitalQueue(hospitalId: string, onChange: () => void) {
  const channel = supabase
    .channel(`checkins-${hospitalId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "checkins", filter: `hospital_id=eq.${hospitalId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
