import { router } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import CalledAlert from "../../components/CalledAlert";
import CurrentVisit from "../../components/CurrentVisit";
import LabOrders from "../../components/LabOrders";
import { useAuth } from "../../features/auth/useAuth";
import { useActiveMedications } from "../../features/medications/useMedications";
import { bmiCategory } from "../../utils/health";

export default function DashboardScreen() {
  const { profile } = useAuth();
  const bmi = profile?.bmi ?? null;
  const initialLetter = profile?.full_name ? profile.full_name[0].toUpperCase() : "P";

  return (
    <ScreenContainer>
      <CalledAlert />

      {/* Top bar: greeting + name on the left, profile button on the right */}
      <View className="flex-row items-center justify-between py-2 border-b border-slate-100 pb-3">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Welcome back
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900" numberOfLines={1}>
            {profile?.full_name ?? "Patient"}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          className="active:opacity-70"
          accessibilityLabel="Open profile"
        >
          <View className="h-12 w-12 rounded-full bg-emerald-600 items-center justify-center shadow-sm border-2 border-white">
            <Text className="text-white font-bold text-lg">{initialLetter}</Text>
          </View>
        </Pressable>
      </View>

      {/* Live current visit — queue token → appointment id → status */}
      <CurrentVisit />

      {/* Health Summary */}
      <Text className="mb-2 mt-6 text-base font-bold text-slate-900">Patient Health Profile</Text>
      <Card className="flex-row justify-between py-4">
        <SummaryStat label="Blood group" value={profile?.blood_group ?? "O+"} />
        <SummaryStat label="BMI" value={bmi ? String(bmi) : "22.4"} sub={bmiCategory(bmi) ?? "Normal"} />
        <SummaryStat label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "170 cm"} />
        <SummaryStat label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "65 kg"} />
      </Card>

      {/* Active OPD Medications */}
      <ActiveMedicationsCard />

      {/* Doctor-ordered lab tests — schedule at clinic or upload external report */}
      <LabOrders />
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

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-slate-900">{value}</Text>
      <Text className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</Text>
      {sub ? <Text className="text-[10px] font-bold text-emerald-700 mt-0.5">{sub}</Text> : null}
    </View>
  );
}
