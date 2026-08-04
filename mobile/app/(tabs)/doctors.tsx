import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Search, X } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { LoadingView } from "../../components/ui/LoadingView";
import { EmptyState } from "../../components/ui/EmptyState";
import { Avatar } from "../../components/ui/Avatar";
import { useDoctors } from "../../features/doctors/useDoctors";

export default function DoctorsScreen() {
  const params = useLocalSearchParams<{ departmentId?: string; departmentName?: string }>();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(params.departmentId);

  const filters = useMemo(
    () => ({ departmentId: departmentFilter, search }),
    [departmentFilter, search],
  );

  const { data: doctors, isLoading, refetch, isRefetching } = useDoctors(filters);

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isRefetching}>
      <Text className="py-2 text-2xl font-bold text-slate-900">Find a Doctor</Text>

      <View className="mt-4">
        <TextField
          placeholder="Search by name or specialization"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {departmentFilter ? (
        <Pressable
          onPress={() => setDepartmentFilter(undefined)}
          className="mt-3 flex-row items-center self-start gap-1 rounded-full bg-primary-50 px-3 py-1.5"
        >
          <Text className="text-sm font-medium text-primary-700">{params.departmentName ?? "Filtered"}</Text>
          <X size={14} color="#047857" />
        </Pressable>
      ) : null}

      <View className="mt-4 gap-3">
        {isLoading ? (
          <LoadingView />
        ) : !doctors?.length ? (
          <EmptyState icon={Search} title="No doctors found" description="Try a different search or clear filters." />
        ) : (
          doctors.map((doctor) => (
            <Pressable key={doctor.id} onPress={() => router.push(`/doctor/${doctor.id}`)}>
              <Card className="flex-row gap-3">
                <Avatar name={`${doctor.first_name} ${doctor.last_name}`} size={52} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </Text>
                  <Text className="text-sm text-slate-500">{doctor.specialization}</Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    {doctor.department?.name} · {doctor.years_experience ?? 0} yrs exp
                  </Text>
                </View>
                <View className="items-end justify-center">
                  <Text className="text-sm font-semibold text-slate-900">
                    {doctor.consultation_fee ? `₹${doctor.consultation_fee}` : "—"}
                  </Text>
                  <Text className="text-[11px] text-slate-400">consult fee</Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
