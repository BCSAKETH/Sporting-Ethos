import { useEffect, useRef, useState } from "react";
import { Text, Vibration, Animated, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/useAuth";

// Realtime "it's your turn" alert: when the patient's check-in flips to
// in_consult, blink the banner + vibrate the phone until dismissed.
export default function CalledAlert() {
  const { profile } = useAuth();
  const [called, setCalled] = useState(false);
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`my-checkin-${profile.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "checkins", filter: `patient_id=eq.${profile.id}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status === "in_consult") {
            setCalled(true);
            Vibration.vibrate([0, 400, 200, 400, 200, 400]);
          } else if (status === "done") {
            setCalled(false);
            Vibration.cancel();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!called) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [called, blink]);

  if (!called) return null;

  return (
    <Animated.View style={{ opacity: blink }}>
      <Pressable
        onPress={() => {
          setCalled(false);
          Vibration.cancel();
        }}
        className="rounded-2xl bg-emerald-600 p-4 mb-3"
      >
        <Text className="text-white font-extrabold text-lg">📣 It&apos;s your turn!</Text>
        <Text className="text-emerald-100 text-sm mt-0.5">Please proceed to your consultation room now. Tap to dismiss.</Text>
      </Pressable>
    </Animated.View>
  );
}
