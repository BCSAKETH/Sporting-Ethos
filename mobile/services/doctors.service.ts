import { supabase } from "../lib/supabase";
import type { Doctor, DoctorAvailability, DoctorWithDepartment } from "../types/models";

export interface DoctorFilters {
  departmentId?: string;
  search?: string;
  minExperience?: number;
  maxFee?: number;
}

export async function listDoctors(filters: DoctorFilters = {}): Promise<DoctorWithDepartment[]> {
  let query = supabase
    .from("doctors")
    .select("*, department:departments(id, name, department_type), hospital:hospitals(id, name, code)")
    .eq("status", "active");

  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.minExperience != null) query = query.gte("years_experience", filters.minExperience);
  if (filters.maxFee != null) query = query.lte("consultation_fee", filters.maxFee);
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,specialization.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query.order("years_experience", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DoctorWithDepartment[];
}

export async function getDoctor(id: string): Promise<DoctorWithDepartment | null> {
  const { data, error } = await supabase
    .from("doctors")
    .select("*, department:departments(id, name, department_type), hospital:hospitals(id, name, code)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DoctorWithDepartment | null;
}

export async function getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
  const { data, error } = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("is_available", true)
    .order("weekday");
  if (error) throw error;
  return data ?? [];
}

export type { Doctor };
