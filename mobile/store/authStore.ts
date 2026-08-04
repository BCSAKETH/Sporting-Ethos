import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../types/models";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitializing: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (isInitializing) => set({ isInitializing }),
}));
