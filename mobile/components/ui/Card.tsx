import { View, type ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200 ${className ?? ""}`}
      {...props}
    />
  );
}
