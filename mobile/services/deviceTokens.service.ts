import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

export async function registerDeviceToken(patientId: string, expoPushToken: string): Promise<void> {
  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      { patient_id: patientId, expo_push_token: expoPushToken, platform: Platform.OS },
      { onConflict: "expo_push_token" },
    );
  if (error) throw error;
}
