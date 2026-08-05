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

export interface SpotCheckInInput {
  patientId: string;
  hospitalId: string;
  fullName: string;
  departmentId?: string | null;
}

/** Creates a walk-in check-in tied to the logged-in patient's profile (the QR spot-registration flow). */
export async function spotCheckIn(input: SpotCheckInInput): Promise<Checkin> {
  const initialStatus = input.departmentId ? "waiting_department" : "waiting_reception";
  const { data, error } = await supabase
    .from("checkins")
    .insert({
      name: input.fullName,
      patient_id: input.patientId,
      hospital_id: input.hospitalId,
      department_id: input.departmentId ?? null,
      status: initialStatus,
      priority: "normal",
      source: "self",
    })
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
