import { supabase } from "../lib/supabase";
import type { Hospital } from "../types/models";

/** This deployment serves a single hospital — fetches that one active row. */
export async function getPrimaryHospital(): Promise<Hospital | null> {
  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
