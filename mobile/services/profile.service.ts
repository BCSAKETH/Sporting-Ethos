import { supabase } from "../lib/supabase";
import type { Profile } from "../types/models";
import type { Database } from "../types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(patch: ProfileUpdate): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
