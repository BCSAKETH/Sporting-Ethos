import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { KeyboardScreen } from "../../components/ui/KeyboardScreen";
import Logo from "../../components/Logo";
import { loginSchema, type LoginFormValues } from "../../features/auth/schemas";
import { useSignIn } from "../../features/auth/useAuth";

export default function LoginScreen() {
  const [formError, setFormError] = useState("");
  const signIn = useSignIn();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      await signIn.mutateAsync(values);
      router.replace("/(tabs)");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    }
  });

  return (
    <KeyboardScreen>
      <View className="items-center">
        <Logo size={56} />
        <Text className="mt-4 text-2xl font-bold text-slate-900">Welcome back</Text>
        <Text className="mt-1 text-slate-500">Sign in to continue to Sporting Ethos</Text>
      </View>

      <View className="mt-8 gap-4">
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
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              error={errors.password?.message}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Link href="/(auth)/forgot-password" className="self-end text-sm font-medium text-primary-700">
          Forgot password?
        </Link>

        {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}

        <Button label="Sign In" onPress={onSubmit} loading={signIn.isPending} />
      </View>

      <View className="mt-8 flex-row justify-center">
        <Text className="text-slate-500">Don&apos;t have an account? </Text>
        <Link href="/(auth)/signup" className="font-semibold text-primary-700">
          Sign up
        </Link>
      </View>
    </KeyboardScreen>
  );
}
