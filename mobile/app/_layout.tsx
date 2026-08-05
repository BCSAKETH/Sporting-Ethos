import "../global.css";
import "react-native-reanimated";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
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
    }, 1500);

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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isInitializing, segments, router]);

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="doctor/[id]" options={{ headerShown: true, title: "Doctor Profile" }} />
      <Stack.Screen name="booking/[doctorId]" options={{ headerShown: true, title: "Book Appointment" }} />
      <Stack.Screen
        name="scan"
        options={{ presentation: "modal", headerShown: true, title: "Scan to Check In" }}
      />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications" }} />
      <Stack.Screen
        name="reset-password"
        options={{ presentation: "modal", headerShown: true, title: "Reset Password" }}
      />
    </Stack>
  );
}

import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotifications } from "../features/notifications/useNotifications";

function NotificationListener() {
  usePushNotifications();
  useNotifications();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SplashGate />
            <NotificationListener />
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
