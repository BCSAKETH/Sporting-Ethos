import { ActivityIndicator, View } from "react-native";

export function LoadingView() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color="#059669" />
    </View>
  );
}
