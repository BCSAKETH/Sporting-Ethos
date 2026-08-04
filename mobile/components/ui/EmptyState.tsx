import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-16 px-6">
      {Icon ? <Icon size={40} color="#94a3b8" /> : null}
      <Text className="mt-3 text-base font-semibold text-slate-700">{title}</Text>
      {description ? <Text className="mt-1 text-center text-sm text-slate-400">{description}</Text> : null}
    </View>
  );
}
