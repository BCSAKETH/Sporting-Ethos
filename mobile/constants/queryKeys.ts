// Centralized TanStack Query key factory. Keeping every key in one place
// avoids typo-mismatches between the hook that fetches data and the mutation
// that invalidates it.
export const queryKeys = {
  primaryHospital: ["hospital", "primary"] as const,
  departments: ["departments"] as const,
  doctors: (filters: object = {}) => ["doctors", filters] as const,
  doctor: (doctorId: string) => ["doctors", doctorId] as const,
  doctorAvailability: (doctorId: string) => ["doctor-availability", doctorId] as const,
  appointments: (patientId?: string) => ["appointments", patientId ?? "self"] as const,
  appointment: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  bookedSlots: (doctorId: string, dateIso: string) =>
    ["appointments", "booked-slots", doctorId, dateIso] as const,
  profile: (userId?: string) => ["profile", userId ?? "self"] as const,
  diseases: ["diseases"] as const,
  allergies: ["allergies"] as const,
  patientDiseases: (patientId?: string) => ["patient-diseases", patientId ?? "self"] as const,
  patientAllergies: (patientId?: string) => ["patient-allergies", patientId ?? "self"] as const,
  notifications: (patientId?: string) => ["notifications", patientId ?? "self"] as const,
  checkins: (patientId?: string) => ["checkins", patientId ?? "self"] as const,
};
