import { Pressable, Text, View } from "react-native";
import { BellOff } from "lucide-react-native";

import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Card } from "../components/ui/Card";
import { LoadingView } from "../components/ui/LoadingView";
import { EmptyState } from "../components/ui/EmptyState";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../features/notifications/useNotifications";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = (notifications ?? []).some((n) => !n.is_read);

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isRefetching}>
      {hasUnread ? (
        <Pressable onPress={() => markAllRead.mutate()} className="self-end py-3">
          <Text className="text-sm font-semibold text-primary-700">Mark all read</Text>
        </Pressable>
      ) : (
        <View className="h-3" />
      )}

      {isLoading ? (
        <LoadingView />
      ) : !notifications?.length ? (
        <EmptyState icon={BellOff} title="No notifications yet" description="Appointment updates will show up here." />
      ) : (
        <View className="gap-2">
          {notifications.map((n) => (
            <Pressable key={n.id} onPress={() => !n.is_read && markRead.mutate(n.id)}>
              <Card className={n.is_read ? "opacity-60" : "border-primary-200"}>
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 pr-2 text-sm font-semibold text-slate-900">{n.title}</Text>
                  {!n.is_read ? <View className="mt-1 h-2 w-2 rounded-full bg-primary-600" /> : null}
                </View>
                {n.body ? <Text className="mt-1 text-sm text-slate-500">{n.body}</Text> : null}
                <Text className="mt-1.5 text-xs text-slate-400">{timeAgo(n.created_at)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
