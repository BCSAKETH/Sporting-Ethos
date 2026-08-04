import { View, type ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-purple-100/80 bg-white p-4 shadow-sm ${className ?? ""}`}
      {...props}
    />
  );
}
