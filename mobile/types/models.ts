// Ergonomic aliases over the generated database types — the rest of the app
// imports domain names (Doctor, Appointment, ...) instead of Tables<'...'>.
import type { Tables } from "./database";

export type Hospital = Tables<"hospitals">;
export type Department = Tables<"departments">;
export type Doctor = Tables<"doctors">;
export type DoctorAvailability = Tables<"doctor_availability">;
export type Appointment = Tables<"appointments">;
export type AppointmentStatusHistory = Tables<"appointment_status_history">;
export type Profile = Tables<"profiles">;
export type Disease = Tables<"diseases">;
export type PatientDisease = Tables<"patient_diseases">;
export type Allergy = Tables<"allergies">;
export type PatientAllergy = Tables<"patient_allergies">;
export type NotificationRow = Tables<"notifications">;
export type DeviceToken = Tables<"device_tokens">;
export type Checkin = Tables<"checkins">;

export type DoctorWithDepartment = Doctor & {
  department: Pick<Department, "id" | "name" | "department_type"> | null;
  hospital: Pick<Hospital, "id" | "name" | "code"> | null;
};

export type AppointmentWithDetails = Appointment & {
  doctor: Pick<Doctor, "id" | "first_name" | "last_name" | "specialization" | "profile_photo_url"> | null;
  department: Pick<Department, "id" | "name" | "icon" | "color"> | null;
  hospital: Pick<Hospital, "id" | "name"> | null;
};

export interface TimeSlot {
  /** ISO 8601 datetime for the start of this slot. */
  startsAt: string;
  label: string;
  isBooked: boolean;
}
