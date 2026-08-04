import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <View className="w-full">
        {label ? <Text className="mb-1.5 text-sm font-medium text-slate-600">{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#94a3b8"
          accessibilityLabel={label}
          className={`w-full rounded-xl border px-4 py-3.5 text-base text-slate-900 ${error ? "border-red-400" : "border-slate-300"} ${className ?? ""}`}
          {...props}
        />
        {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
        {!error && hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
      </View>
    );
  },
);
TextField.displayName = "TextField";
