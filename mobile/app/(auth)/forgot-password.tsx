import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { KeyboardScreen } from "../../components/ui/KeyboardScreen";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../../features/auth/schemas";
import { useSendPasswordReset } from "../../features/auth/useAuth";

export default function ForgotPasswordScreen() {
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);
  const sendReset = useSendPasswordReset();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      await sendReset.mutateAsync(values.email);
      setSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send the reset email. Please try again.");
    }
  });

  if (sent) {
    return (
      <KeyboardScreen>
        <Text className="text-center text-2xl font-bold text-slate-900">Check your email</Text>
        <Text className="mt-2 text-center text-slate-500">
          If an account exists for that address, a password reset link is on its way.
        </Text>
        <Button label="Back to Sign In" variant="secondary" onPress={() => router.replace("/(auth)/login")} className="mt-6" />
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen>
      <Text className="text-2xl font-bold text-slate-900">Reset your password</Text>
      <Text className="mt-1 text-slate-500">We&apos;ll email you a link to set a new one.</Text>

      <View className="mt-6 gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              error={errors.email?.message}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}
        <Button label="Send Reset Link" onPress={onSubmit} loading={sendReset.isPending} />
      </View>
    </KeyboardScreen>
  );
}
