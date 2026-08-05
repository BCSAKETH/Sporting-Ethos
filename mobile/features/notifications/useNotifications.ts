import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { queryKeys } from "../../constants/queryKeys";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToMyNotifications,
} from "../../services/notifications.service";
import { useAuth } from "../auth/useAuth";

export function useNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications(profile?.id),
    queryFn: listMyNotifications,
    enabled: !!profile,
  });

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToMyNotifications(profile.id, (notif) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(profile.id) });
      if (notif && notif.title) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: notif.title,
            body: notif.body ?? "It's your turn in the OPD queue!",
            sound: true,
          },
          trigger: null,
        }).catch((err) => console.warn("Local push banner failed:", err));
      }
    });
    return unsubscribe;
  }, [profile, queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(profile?.id) }),
  });
}

export function useMarkAllNotificationsRead() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(profile!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(profile?.id) }),
  });
}
