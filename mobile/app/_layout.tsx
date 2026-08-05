import "../global.css";
import "react-native-reanimated";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../providers/AuthProvider";
import { useAuth } from "../features/auth/useAuth";
import { queryClient } from "../lib/queryClient";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync("#f8fafc").catch(() => {});

function SplashGate() {
  const { isInitializing } = useAuth();
  useEffect(() => {
    let hideTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);

    if (!isInitializing) {
      SplashScreen.hideAsync().catch(() => {});
      clearTimeout(hideTimer);
    }
    return () => clearTimeout(hideTimer);
  }, [isInitializing]);
  return null;
}

function RootNavigator() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="doctor/[id]" options={{ headerShown: true, title: "Doctor Profile" }} />
        <Stack.Screen name="booking/[doctorId]" options={{ headerShown: true, title: "Book Appointment" }} />
        <Stack.Screen
          name="scan"
          options={{ presentation: "modal", headerShown: true, title: "Scan to Check In" }}
        />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications" }} />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Reachable regardless of auth state: opened from the password-reset email deep link. */}
      <Stack.Screen
        name="reset-password"
        options={{ presentation: "modal", headerShown: true, title: "Reset Password" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SplashGate />
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
