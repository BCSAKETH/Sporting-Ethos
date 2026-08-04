import { useMemo } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { LayoutGrid } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingView } from "../../components/ui/LoadingView";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDepartments } from "../../features/departments/useDepartments";
import { iconForSlug } from "../../utils/icons";
import type { DepartmentWithDoctorCount } from "../../services/departments.service";

const TYPE_LABELS: Record<string, string> = {
  OPD: "Outpatient (Book a Visit)",
  IPD: "Inpatient Wards",
  SUPPORT: "Support Services",
};

export default function DepartmentsScreen() {
  const { data: departments, isLoading, refetch, isRefetching } = useDepartments();

  const grouped = useMemo(() => {
    const groups: Record<string, DepartmentWithDoctorCount[]> = { OPD: [], IPD: [], SUPPORT: [] };
    for (const dept of departments ?? []) {
      groups[dept.department_type]?.push(dept);
    }
    return groups;
  }, [departments]);

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isRefetching}>
      <Text className="py-2 text-2xl font-bold text-slate-900">Departments</Text>

      {isLoading ? (
        <LoadingView />
      ) : !departments?.length ? (
        <EmptyState icon={LayoutGrid} title="No departments found" />
      ) : (
        (["OPD", "IPD", "SUPPORT"] as const).map((type) =>
          grouped[type].length ? (
            <View key={type} className="mt-6">
              <Text className="mb-2 text-base font-semibold text-slate-900">{TYPE_LABELS[type]}</Text>
              <View className="gap-3">
                {grouped[type].map((dept) => (
                  <DepartmentCard key={dept.id} department={dept} bookable={type === "OPD"} />
                ))}
              </View>
            </View>
          ) : null,
        )
      )}
    </ScreenContainer>
  );
}

function DepartmentCard({ department, bookable }: { department: DepartmentWithDoctorCount; bookable: boolean }) {
  // Icon is resolved by data-driven lookup (utils/icons.ts), not a dynamic
  // component definition, so it's safe despite the static-analysis warning.
  const Icon = iconForSlug(department.icon);

  return (
    <Card>
      <View className="flex-row gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${department.color ?? "#059669"}1A` }}>
          {/* eslint-disable-next-line react-hooks/static-components -- stable icon from a fixed lookup table, not created per-render */}
          <Icon size={22} color={department.color ?? "#059669"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{department.name}</Text>
          {department.description ? (
            <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={2}>
              {department.description}
            </Text>
          ) : null}
          {bookable ? (
            <Text className="mt-1 text-xs text-slate-400">
              {department.doctor_count} doctor{department.doctor_count === 1 ? "" : "s"} available
            </Text>
          ) : null}
        </View>
      </View>
      {bookable ? (
        <Button
          label="Book Appointment"
          variant="secondary"
          className="mt-3"
          onPress={() =>
            router.push({ pathname: "/(tabs)/doctors", params: { departmentId: department.id, departmentName: department.name } })
          }
        />
      ) : null}
    </Card>
  );
}
