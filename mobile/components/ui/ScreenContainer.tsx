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
 * Shared screen chrome: safe-area edges + optional pull-to-refresh. Every
 * top-level tab/stack screen renders through this so Android status-bar
 * insets and refresh behavior stay consistent app-wide.
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
      <SafeAreaView edges={["top"]} className={`flex-1 bg-slate-50 ${className ?? ""}`}>
        <View className={`flex-1 px-4 ${contentClassName ?? ""}`}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className={`flex-1 bg-slate-50 ${className ?? ""}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={`px-4 pb-10 ${contentClassName ?? ""}`}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" /> : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
