import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Briefcase, Building2, IndianRupee, Languages } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingView } from "../../components/ui/LoadingView";
import { Avatar } from "../../components/ui/Avatar";
import { useDoctor } from "../../features/doctors/useDoctors";

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doctor, isLoading } = useDoctor(id);

  if (isLoading || !doctor) return <LoadingView />;

  const fullName = `Dr. ${doctor.first_name} ${doctor.last_name}`;

  return (
    <ScreenContainer>
      <View className="items-center py-4">
        <Avatar name={fullName} size={84} />
        <Text className="mt-3 text-xl font-bold text-slate-900">{fullName}</Text>
        <Text className="text-slate-500">{doctor.specialization}</Text>
        <Text className="text-sm text-slate-400">{doctor.qualifications}</Text>
      </View>

      <Card className="gap-3">
        <InfoRow icon={Building2} label="Department" value={`${doctor.department?.name ?? "—"} · ${doctor.hospital?.name ?? ""}`} />
        <InfoRow icon={Briefcase} label="Experience" value={`${doctor.years_experience ?? 0} years`} />
        <InfoRow icon={IndianRupee} label="Consultation fee" value={doctor.consultation_fee ? `₹${doctor.consultation_fee}` : "—"} />
        <InfoRow icon={Languages} label="Languages" value={doctor.languages?.join(", ") || "—"} />
      </Card>

      {doctor.biography ? (
        <Card className="mt-4">
          <Text className="mb-1 text-sm font-semibold text-slate-900">About</Text>
          <Text className="text-sm leading-5 text-slate-600">{doctor.biography}</Text>
        </Card>
      ) : null}

      <Button label="Book Appointment" className="mt-6" onPress={() => router.push(`/booking/${doctor.id}`)} />
    </ScreenContainer>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
        <Icon size={16} color="#047857" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-400">{label}</Text>
        <Text className="text-sm font-medium text-slate-800">{value}</Text>
      </View>
    </View>
  );
}
