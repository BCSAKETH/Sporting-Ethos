import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

interface KeyboardScreenProps extends PropsWithChildren {
  contentClassName?: string;
  className?: string;
}

/** Auth-style centered forms: keeps the active field visible above the keyboard. */
export function KeyboardScreen({ children, className, contentClassName }: KeyboardScreenProps) {
  return (
    <KeyboardAvoidingView
      className={`flex-1 bg-white ${className ?? ""}`}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName={`flex-grow justify-center px-6 py-10 ${contentClassName ?? ""}`}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
