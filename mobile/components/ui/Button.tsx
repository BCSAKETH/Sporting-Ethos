import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary-600 active:bg-primary-700",
  secondary: "bg-white border border-slate-300 active:bg-slate-50",
  ghost: "bg-transparent active:bg-slate-100",
  danger: "bg-red-600 active:bg-red-700",
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-slate-700",
  ghost: "text-primary-700",
  danger: "text-white",
};

export function Button({
  label,
  variant = "primary",
  loading,
  fullWidth = true,
  disabled,
  className,
  ...props
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`${fullWidth ? "w-full" : ""} rounded-2xl px-5 py-4 items-center justify-center ${VARIANT_CLASSES[variant]} ${isDisabled ? "opacity-60" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#059669"} />
      ) : (
        <Text className={`text-base font-semibold ${VARIANT_TEXT_CLASSES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
