import { Tabs, router } from "expo-router";
import { View, TouchableOpacity, Text } from "react-native";
import { Home, QrCode, FileText } from "lucide-react-native";

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
        tabBarStyle: {
          borderTopColor: neutral[200],
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />

      {/* BHIM UPI-style Raised Floating QR Button in Middle */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan QR",
          tabBarButton: ({ style }) => (
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              activeOpacity={0.85}
              style={[
                style,
                {
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  top: -14,
                },
              ]}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#059669",
                  justifyContent: "center",
                  alignItems: "center",
                  elevation: 6,
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  borderWidth: 3,
                  borderColor: "#ffffff",
                }}
              >
                <QrCode color="#ffffff" size={24} />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: primary[700],
                  marginTop: 1,
                }}
              >
                Scan QR
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />

      {/* Hidden legacy tab routes */}
      <Tabs.Screen name="departments" options={{ href: null }} />
      <Tabs.Screen name="doctors" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
