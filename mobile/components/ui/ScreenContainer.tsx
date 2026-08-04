import type { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared screen chrome: Ivory background + Lavender tint refresh control.
 */
export function ScreenContainer({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  className,
  contentClassName,
}: ScreenContainerProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} className={`flex-1 bg-[#FAF8F5] ${className ?? ""}`}>
        <View className={`flex-1 px-4 ${contentClassName ?? ""}`}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className={`flex-1 bg-[#FAF8F5] ${className ?? ""}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={`px-4 pb-10 ${contentClassName ?? ""}`}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" /> : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
