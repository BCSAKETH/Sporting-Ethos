import { supabase } from "../lib/supabase";
import type { NotificationRow } from "../types/models";

export async function listMyNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(patientId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("patient_id", patientId)
    .eq("is_read", false);
  if (error) throw error;
}

export function subscribeToMyNotifications(patientId: string, onInsert: (row: NotificationRow) => void) {
  const channel = supabase
    .channel(`notifications-${patientId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `patient_id=eq.${patientId}` },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
