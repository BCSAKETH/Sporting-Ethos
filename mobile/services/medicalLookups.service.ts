import { supabase } from "../lib/supabase";
import type { Allergy, Disease, PatientAllergy, PatientDisease } from "../types/models";

export async function listDiseases(): Promise<Disease[]> {
  const { data, error } = await supabase.from("diseases").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listAllergies(): Promise<Allergy[]> {
  const { data, error } = await supabase.from("allergies").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listMyDiseases(): Promise<(PatientDisease & { disease: Disease })[]> {
  const { data, error } = await supabase.from("patient_diseases").select("*, disease:diseases(*)");
  if (error) throw error;
  return (data ?? []) as unknown as (PatientDisease & { disease: Disease })[];
}

export async function listMyAllergies(): Promise<(PatientAllergy & { allergy: Allergy })[]> {
  const { data, error } = await supabase.from("patient_allergies").select("*, allergy:allergies(*)");
  if (error) throw error;
  return (data ?? []) as unknown as (PatientAllergy & { allergy: Allergy })[];
}

export async function addPatientDisease(patientId: string, diseaseId: string, status: string = "active") {
  const { error } = await supabase
    .from("patient_diseases")
    .upsert({ patient_id: patientId, disease_id: diseaseId, status }, { onConflict: "patient_id,disease_id" });
  if (error) throw error;
}

export async function removePatientDisease(patientId: string, diseaseId: string) {
  const { error } = await supabase
    .from("patient_diseases")
    .delete()
    .eq("patient_id", patientId)
    .eq("disease_id", diseaseId);
  if (error) throw error;
}

export async function addPatientAllergy(patientId: string, allergyId: string, severity?: string) {
  const { error } = await supabase
    .from("patient_allergies")
    .upsert(
      { patient_id: patientId, allergy_id: allergyId, severity: severity ?? null },
      { onConflict: "patient_id,allergy_id" },
    );
  if (error) throw error;
}

export async function removePatientAllergy(patientId: string, allergyId: string) {
  const { error } = await supabase
    .from("patient_allergies")
    .delete()
    .eq("patient_id", patientId)
    .eq("allergy_id", allergyId);
  if (error) throw error;
}
