import { Text, View } from "react-native";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary-100"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-bold text-primary-700" style={{ fontSize: size * 0.38 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
