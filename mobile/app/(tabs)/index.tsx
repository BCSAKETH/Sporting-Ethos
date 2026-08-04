import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { CalendarPlus, QrCode, Stethoscope } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import { LoadingView } from "../../components/ui/LoadingView";
import { EmptyState } from "../../components/ui/EmptyState";
import { NotificationBell } from "../../components/NotificationBell";
import Logo from "../../components/Logo";
import { useAuth } from "../../features/auth/useAuth";
import { useMyAppointments } from "../../features/appointments/useAppointments";
import { useActiveMedications } from "../../features/medications/useMedications";
import { bmiCategory } from "../../utils/health";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { data: appointments, isLoading, refetch, isRefetching } = useMyAppointments();

  const upcoming = appointments?.find((a) => ["requested", "confirmed", "checked_in"].includes(a.status));
  const bmi = profile?.bmi ?? null;

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isRefetching}>
      <View className="flex-row items-center justify-between py-2">
        <Logo size={32} />
        <NotificationBell />
      </View>

      <Text className="mt-4 text-2xl font-bold text-slate-900">
        Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
      </Text>
      <Text className="text-slate-500">Here&apos;s what&apos;s next for your care.</Text>

      <View className="mt-5 flex-row gap-3">
        <QuickAction icon={Stethoscope} label="Book Visit" onPress={() => router.push("/(tabs)/departments")} />
        <QuickAction icon={QrCode} label="Scan to Check In" onPress={() => router.push("/scan")} />
        <QuickAction icon={CalendarPlus} label="My Visits" onPress={() => router.push("/(tabs)/appointments")} />
      </View>

      <Text className="mb-2 mt-6 text-base font-semibold text-slate-900">Upcoming appointment</Text>
      {isLoading ? (
        <LoadingView />
      ) : upcoming ? (
        <Card>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-slate-900">
                Dr. {upcoming.doctor?.first_name} {upcoming.doctor?.last_name}
              </Text>
              <Text className="text-sm text-slate-500">{upcoming.doctor?.specialization}</Text>
              <Text className="mt-1.5 text-sm text-slate-600">{formatDateTime(upcoming.scheduled_datetime)}</Text>
            </View>
            <StatusBadge status={upcoming.status} />
          </View>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={Stethoscope} title="No upcoming visits" description="Book an appointment with one of our doctors." />
        </Card>
      )}

      <Text className="mb-2 mt-6 text-base font-semibold text-slate-900">Health summary</Text>
      <Card className="flex-row justify-between">
        <SummaryStat label="Blood group" value={profile?.blood_group ?? "—"} />
        <SummaryStat label="BMI" value={bmi ? String(bmi) : "—"} sub={bmiCategory(bmi) ?? undefined} />
        <SummaryStat label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "—"} />
        <SummaryStat label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "—"} />
      </Card>

      <ActiveMedicationsCard />
    </ScreenContainer>
  );
}

function ActiveMedicationsCard() {
  const { medications, removeMedication } = useActiveMedications();

  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">Active Medications</Text>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <Text className="text-xs font-semibold text-primary-700">Manage</Text>
        </Pressable>
      </View>
      <Card className="gap-2.5">
        {medications.length === 0 ? (
          <Text className="py-2 text-center text-sm text-slate-400">No active medications listed.</Text>
        ) : (
          medications.map((med) => (
            <View key={med.id} className="flex-row items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-bold text-slate-800">{med.name}</Text>
                <Text className="text-xs text-slate-500">
                  {med.dosage} · {med.frequency}
                </Text>
              </View>
              <Pressable
                onPress={() => removeMedication(med.id)}
                className="rounded-full bg-slate-100 px-2 py-1"
              >
                <Text className="text-[10px] font-semibold text-slate-500">Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Stethoscope;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 shadow-sm shadow-slate-200 active:bg-slate-50"
    >
      <View className="rounded-full bg-primary-50 p-3">
        <Icon size={20} color="#047857" />
      </View>
      <Text className="text-center text-xs font-medium text-slate-600">{label}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-slate-900">{value}</Text>
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      {sub ? <Text className="text-[11px] text-primary-600">{sub}</Text> : null}
    </View>
  );
}
