import { Tabs } from "expo-router";
import { CalendarCheck, LayoutGrid, Stethoscope, User, Home } from "lucide-react-native";

import { primary, neutral } from "../../theme/colors";
import { usePushNotifications } from "../../hooks/usePushNotifications";

export default function TabsLayout() {
  usePushNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary[700],
        tabBarInactiveTintColor: neutral[400],
        tabBarStyle: { borderTopColor: neutral[200] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="departments"
        options={{
          title: "Departments",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{ title: "Doctors", tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
