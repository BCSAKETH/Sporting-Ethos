import { Redirect } from "expo-router";
import { useAuth } from "../features/auth/useAuth";

export default function Index() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return null;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
