import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { useAuth } from "../features/auth/useAuth";
import { registerDeviceToken } from "../services/deviceTokens.service";
import { logger } from "../lib/logger";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers this device for push once a patient is signed in. No-ops
 * quietly if permission is denied or the app isn't yet linked to an EAS
 * project — remote push also requires a development/production build
 * (Expo Go on Android can't receive it as of SDK 53+).
 */
export function usePushNotifications() {
  const { profile, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    let cancelled = false;

    async function register() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return;

        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled && profile) await registerDeviceToken(profile.id, expoPushToken);
      } catch (err) {
        logger.warn("Push notification registration skipped:", err);
      }
    }

    register();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile]);
}
