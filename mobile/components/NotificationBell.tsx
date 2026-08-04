import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { useNotifications } from "../features/notifications/useNotifications";

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      onPress={() => router.push("/notifications")}
      className="relative rounded-full p-2 active:bg-slate-100"
    >
      <Bell size={24} color="#334155" />
      {unread > 0 ? (
        <View className="absolute right-1 top-1 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1">
          <Text className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
