import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { getMyProfile } from "../../services/profile.service";
import * as authService from "../../services/auth.service";

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  return {
    session,
    profile,
    isInitializing,
    isAuthenticated: !!session,
  };
}

export function useRefreshProfile() {
  const setProfile = useAuthStore((s) => s.setProfile);
  return useMutation({
    mutationFn: getMyProfile,
    onSuccess: (profile) => setProfile(profile),
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      authService.signInWithPassword(vars.email, vars.password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (vars: { email: string; password: string; fullName: string }) =>
      authService.signUpWithPassword(vars.email, vars.password, vars.fullName),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => queryClient.clear(),
  });
}

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => authService.sendPasswordResetEmail(email),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => authService.updatePassword(newPassword),
  });
}
