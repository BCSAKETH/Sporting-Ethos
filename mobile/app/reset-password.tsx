import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { KeyboardScreen } from "../components/ui/KeyboardScreen";
import { LoadingView } from "../components/ui/LoadingView";
import { supabase } from "../lib/supabase";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../features/auth/schemas";
import { useUpdatePassword } from "../features/auth/useAuth";

/**
 * Deep-link target for the Supabase "forgot password" email
 * (sportingethos://reset-password?...). Supabase hands back either a PKCE
 * `code` or an implicit-flow `access_token`/`refresh_token` pair — we accept
 * whichever arrives and turn it into a session before showing the form.
 *
 * Requires the app's redirect URL to be added to the Supabase project's Auth
 * "Redirect URLs" allow-list (dashboard-only setting — see docs/deployment-guide.md).
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const [status, setStatus] = useState<"verifying" | "ready" | "invalid" | "done">("verifying");
  const [formError, setFormError] = useState("");
  const updatePassword = useUpdatePassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    async function establishRecoverySession() {
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setStatus("invalid");
            return;
          }
        }
        setStatus("ready");
      } catch {
        setStatus("invalid");
      }
    }
    establishRecoverySession();
  }, [params.code, params.access_token, params.refresh_token]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      await updatePassword.mutateAsync(values.password);
      await supabase.auth.signOut();
      setStatus("done");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update your password. Please try again.");
    }
  });

  if (status === "verifying") return <LoadingView />;

  if (status === "invalid") {
    return (
      <KeyboardScreen>
        <Text className="text-center text-2xl font-bold text-slate-900">Link expired</Text>
        <Text className="mt-2 text-center text-slate-500">
          This reset link is invalid or has expired. Request a new one from the sign-in screen.
        </Text>
        <Button
          label="Back to Sign In"
          variant="secondary"
          className="mt-6"
          onPress={() => router.replace("/(auth)/login")}
        />
      </KeyboardScreen>
    );
  }

  if (status === "done") {
    return (
      <KeyboardScreen>
        <Text className="text-center text-2xl font-bold text-slate-900">Password updated</Text>
        <Text className="mt-2 text-center text-slate-500">Sign in with your new password.</Text>
        <Button label="Go to Sign In" className="mt-6" onPress={() => router.replace("/(auth)/login")} />
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen>
      <Text className="text-2xl font-bold text-slate-900">Set a new password</Text>
      <View className="mt-6 gap-4">
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="New password"
              secureTextEntry
              error={errors.password?.message}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <TextField
              label="Confirm new password"
              secureTextEntry
              error={errors.confirmPassword?.message}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}
        <Button label="Update Password" onPress={onSubmit} loading={updatePassword.isPending} />
      </View>
    </KeyboardScreen>
  );
}
