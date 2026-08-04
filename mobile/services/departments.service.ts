import { supabase } from "../lib/supabase";
import type { Department } from "../types/models";

export interface DepartmentWithDoctorCount extends Department {
  doctor_count: number;
}

export async function listDepartments(): Promise<DepartmentWithDoctorCount[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*, doctors(count)")
    .eq("is_active", true)
    .order("department_type")
    .order("name");
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { doctors, ...department } = row as Department & {
      doctors: { count: number }[];
    };
    return { ...department, doctor_count: doctors?.[0]?.count ?? 0 };
  });
}

export async function getDepartment(id: string): Promise<Department | null> {
  const { data, error } = await supabase.from("departments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
