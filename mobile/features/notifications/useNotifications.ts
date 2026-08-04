import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    const unsubscribe = subscribeToMyNotifications(profile.id, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(profile.id) });
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
