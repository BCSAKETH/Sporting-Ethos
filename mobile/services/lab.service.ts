import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

export interface LabOrder {
  id: string;
  test_name: string;
  category: string | null;
  prep_instructions: string | null;
  status: "pending" | "scheduled" | "completed_internal" | "completed_external";
  fulfillment_type: "internal" | "external" | null;
  scheduled_slot: string | null;
  result_url: string | null;
  created_at: string;
}

export async function listMyLabOrders(patientId: string): Promise<LabOrder[]> {
  const { data, error } = await db
    .from("lab_orders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LabOrder[];
}

/** Option A — book an internal clinic slot. */
export async function scheduleLabOrder(id: string, slotIso: string): Promise<void> {
  const { error } = await db
    .from("lab_orders")
    .update({ status: "scheduled", fulfillment_type: "internal", scheduled_slot: slotIso })
    .eq("id", id);
  if (error) throw error;
}

/** Option B — upload an external report (image/PDF, < 2 MB) to the lab-results bucket. */
export async function uploadExternalResult(
  order: LabOrder,
  uri: string,
  name: string,
  mime: string,
): Promise<void> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${order.id}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("lab-results")
    .upload(path, decode(b64), { contentType: mime || "application/octet-stream", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("lab-results").getPublicUrl(path);
  const { error: e2 } = await db
    .from("lab_orders")
    .update({
      status: "completed_external",
      fulfillment_type: "external",
      result_url: data.publicUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (e2) throw e2;
}
