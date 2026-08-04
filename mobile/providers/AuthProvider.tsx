import { useEffect, type PropsWithChildren } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { getMyProfile } from "../services/profile.service";

/**
 * Hydrates the auth store from Supabase on launch and keeps it in sync with
 * every subsequent sign-in/sign-out/token-refresh event. Screens read auth
 * state from `useAuthStore` (or the `useAuth` hook) rather than talking to
 * `supabase.auth` directly.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let mounted = true;

    async function hydrateProfile() {
      try {
        const profile = await getMyProfile();
        if (mounted) setProfile(profile);
      } catch {
        if (mounted) setProfile(null);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session) hydrateProfile();
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session) {
        hydrateProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, setInitializing]);

  return children;
}
