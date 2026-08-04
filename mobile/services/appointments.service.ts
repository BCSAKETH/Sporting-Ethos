import { supabase } from "../lib/supabase";
import type { AppointmentWithDetails, Appointment } from "../types/models";
import type { Database } from "../types/database";

type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

const DETAIL_SELECT =
  "*, doctor:doctors(id, first_name, last_name, specialization, profile_photo_url), department:departments(id, name, icon, color), hospital:hospitals(id, name)";

export async function listMyAppointments(): Promise<AppointmentWithDetails[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(DETAIL_SELECT)
    .order("scheduled_datetime", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithDetails[];
}

export async function getAppointment(id: string): Promise<AppointmentWithDetails | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AppointmentWithDetails | null;
}

/** ISO datetimes already booked for a doctor within a calendar day, used to grey out taken slots. */
export async function getBookedSlots(doctorId: string, dayStartIso: string, dayEndIso: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_datetime")
    .eq("doctor_id", doctorId)
    .gte("scheduled_datetime", dayStartIso)
    .lt("scheduled_datetime", dayEndIso)
    .not("status", "in", "(cancelled,no_show)");
  if (error) throw error;
  return (data ?? []).map((row) => row.scheduled_datetime);
}

export interface BookAppointmentInput {
  patientId: string;
  doctorId: string;
  departmentId: string;
  hospitalId: string;
  scheduledDatetime: string;
  reasonForVisit?: string;
  consultationMode?: Database["public"]["Enums"]["consultation_mode"];
}

export async function bookAppointment(input: BookAppointmentInput): Promise<Appointment> {
  const payload: AppointmentInsert = {
    patient_id: input.patientId,
    doctor_id: input.doctorId,
    department_id: input.departmentId,
    hospital_id: input.hospitalId,
    scheduled_datetime: input.scheduledDatetime,
    reason_for_visit: input.reasonForVisit ?? null,
    consultation_mode: input.consultationMode ?? "in_person",
    status: "confirmed",
  };
  const { data, error } = await supabase.from("appointments").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}
