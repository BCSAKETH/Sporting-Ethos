import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { QrCode, FileText, User } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import Logo from "../../components/Logo";
import { useAuth } from "../../features/auth/useAuth";
import { useActiveMedications } from "../../features/medications/useMedications";
import { bmiCategory } from "../../utils/health";

export default function DashboardScreen() {
  const { profile } = useAuth();
  const bmi = profile?.bmi ?? null;
  const initialLetter = profile?.full_name ? profile.full_name[0].toUpperCase() : "P";

  return (
    <ScreenContainer>
      {/* Top Profile Header Bar */}
      <View className="flex-row items-center justify-between py-2 border-b border-slate-100 pb-3">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 rounded-full bg-emerald-600 items-center justify-center shadow-sm">
            <Text className="text-white font-bold text-lg">{initialLetter}</Text>
          </View>
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Government OPD Portal
            </Text>
            <Text className="text-base font-bold text-slate-900">
              {profile?.full_name ?? "Patient"}
            </Text>
          </View>
        </View>
        <Logo size={28} />
      </View>

      {/* OPD Live Counter Quick Banner */}
      <Card className="mt-4 bg-emerald-700 p-5 gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-white font-bold text-lg">Hospital Counter Check-In</Text>
            <Text className="text-emerald-100 text-xs mt-0.5">
              Scan the QR code at the reception counter to get your OPD live queue ticket.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/scan")}
            className="h-12 w-12 rounded-2xl bg-white items-center justify-center shadow-md active:scale-95"
          >
            <QrCode size={24} color="#047857" />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/scan")}
          className="mt-2 rounded-xl bg-white/20 py-2.5 items-center justify-center active:bg-white/30"
        >
          <Text className="text-white font-bold text-xs uppercase tracking-wider">
            📷 Open Counter QR Scanner
          </Text>
        </Pressable>
      </Card>

      {/* Quick Access Tiles */}
      <View className="mt-4 flex-row gap-3">
        <QuickAction icon={QrCode} label="Scan Counter QR" onPress={() => router.push("/scan")} />
        <QuickAction icon={FileText} label="OPD Reports" onPress={() => router.push("/(tabs)/reports")} />
      </View>

      {/* Health Summary */}
      <Text className="mb-2 mt-6 text-base font-bold text-slate-900">Patient Health Profile</Text>
      <Card className="flex-row justify-between py-4">
        <SummaryStat label="Blood group" value={profile?.blood_group ?? "O+"} />
        <SummaryStat label="BMI" value={bmi ? String(bmi) : "22.4"} sub={bmiCategory(bmi) ?? "Normal"} />
        <SummaryStat label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "170 cm"} />
        <SummaryStat label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "65 kg"} />
      </Card>

      <ActiveMedicationsCard />
    </ScreenContainer>
  );
}

function ActiveMedicationsCard() {
  const { medications, removeMedication } = useActiveMedications();

  return (
    <View className="mt-6 mb-8">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">Active OPD Medications</Text>
      </View>
      <Card className="gap-2.5">
        {medications.length === 0 ? (
          <Text className="py-3 text-center text-xs text-slate-400">No active prescriptions listed.</Text>
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
  icon: typeof QrCode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 shadow-sm active:bg-slate-50"
    >
      <View className="rounded-full bg-emerald-50 p-3">
        <Icon size={22} color="#047857" />
      </View>
      <Text className="text-center text-xs font-bold text-slate-700">{label}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-slate-900">{value}</Text>
      <Text className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</Text>
      {sub ? <Text className="text-[10px] font-bold text-emerald-700 mt-0.5">{sub}</Text> : null}
    </View>
  );
}
