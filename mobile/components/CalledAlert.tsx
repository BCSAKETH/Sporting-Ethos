import { useEffect, useRef, useState } from "react";
import { Text, Vibration, Animated, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/useAuth";

// Realtime "it's your turn" alert: when the patient's check-in flips to
// in_consult, blink the banner + vibrate the phone until dismissed.
export default function CalledAlert() {
  const { profile } = useAuth();
  const [called, setCalled] = useState(false);
  const [alert, setAlert] = useState<{ title: string; body: string }>({
    title: "📣 It's your turn!",
    body: "Please proceed now.",
  });
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`my-alerts-${profile.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "checkins", filter: `patient_id=eq.${profile.id}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status === "in_consult") {
            setAlert({ title: "📣 It's your turn!", body: "Please proceed to your consultation room now." });
            setCalled(true);
            Vibration.vibrate([0, 400, 200, 400, 200, 400]);
          } else if (status === "done") {
            setCalled(false);
            Vibration.cancel();
          }
        },
      )
      // Reception "call to counter" and other call events arrive as notifications.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `patient_id=eq.${profile.id}` },
        (payload) => {
          const n = payload.new as { title?: string; body?: string };
          setAlert({ title: n?.title ?? "📣 It's your turn!", body: n?.body ?? "Please proceed now." });
          setCalled(true);
          Vibration.vibrate([0, 400, 200, 400]);
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
        <Text className="text-white font-extrabold text-lg">{alert.title}</Text>
        <Text className="text-emerald-100 text-sm mt-0.5">{alert.body} Tap to dismiss.</Text>
      </Pressable>
    </Animated.View>
  );
}
