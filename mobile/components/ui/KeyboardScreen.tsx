import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

interface KeyboardScreenProps extends PropsWithChildren {
  contentClassName?: string;
  className?: string;
  keyboardVerticalOffset?: number;
}

/** Auth-style forms: keeps active fields visible above keyboard on Ivory background. */
export function KeyboardScreen({
  children,
  className,
  contentClassName,
  keyboardVerticalOffset = Platform.OS === "ios" ? 64 : 0,
}: KeyboardScreenProps) {
  return (
    <KeyboardAvoidingView
      className={`flex-1 bg-[#FAF8F5] ${className ?? ""}`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName={`flex-grow justify-center px-6 pt-8 pb-36 ${contentClassName ?? ""}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
