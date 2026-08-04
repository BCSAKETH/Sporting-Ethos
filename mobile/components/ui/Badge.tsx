import { Text, View } from "react-native";
import { priorityColors, statusColors } from "../../theme/colors";

function toLabel(value: string) {
  return value
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "#64748b";
  return (
    <View className="flex-row items-center self-start rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}1A` }}>
      <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {toLabel(status)}
      </Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const color = priorityColors[priority as keyof typeof priorityColors] ?? "#64748b";
  if (priority === "normal") return null;
  return (
    <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}1A` }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {toLabel(priority)}
      </Text>
    </View>
  );
}
