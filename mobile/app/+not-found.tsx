import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center gap-4 bg-white p-6">
        <Text className="text-lg font-bold text-slate-900">This screen doesn&apos;t exist.</Text>
        <Link href="/" className="text-primary-700">
          Go to home screen
        </Link>
      </View>
    </>
  );
}
