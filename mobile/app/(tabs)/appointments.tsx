import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { CalendarX2 } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingView } from "../../components/ui/LoadingView";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge, PriorityBadge } from "../../components/ui/Badge";
import { useCancelAppointment, useMyAppointments } from "../../features/appointments/useAppointments";
import type { AppointmentWithDetails } from "../../types/models";

type Tab = "upcoming" | "past";
const UPCOMING_STATUSES = new Set(["requested", "confirmed", "checked_in", "in_consult"]);

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AppointmentsScreen() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const { data: appointments, isLoading, refetch, isRefetching } = useMyAppointments();
  const cancelAppointment = useCancelAppointment();

  const filtered = useMemo(() => {
    return (appointments ?? []).filter((a) =>
      tab === "upcoming" ? UPCOMING_STATUSES.has(a.status) : !UPCOMING_STATUSES.has(a.status),
    );
  }, [appointments, tab]);

  function handleCancel(appointment: AppointmentWithDetails) {
    Alert.alert("Cancel appointment?", "This can't be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel appointment",
        style: "destructive",
        onPress: () => cancelAppointment.mutate(appointment.id),
      },
    ]);
  }

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isRefetching}>
      <Text className="py-2 text-2xl font-bold text-slate-900">My Appointments</Text>

      <View className="mt-2 flex-row rounded-xl bg-slate-100 p-1">
        {(["upcoming", "past"] as Tab[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            className={`flex-1 items-center rounded-lg py-2 ${tab === value ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-sm font-semibold capitalize ${tab === value ? "text-primary-700" : "text-slate-500"}`}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 gap-3">
        {isLoading ? (
          <LoadingView />
        ) : !filtered.length ? (
          <EmptyState icon={CalendarX2} title={`No ${tab} appointments`} />
        ) : (
          filtered.map((appointment) => (
            <Card key={appointment.id}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-semibold text-slate-900">
                    Dr. {appointment.doctor?.first_name} {appointment.doctor?.last_name}
                  </Text>
                  <Text className="text-sm text-slate-500">{appointment.department?.name}</Text>
                  <Text className="mt-1.5 text-sm text-slate-600">{formatDateTime(appointment.scheduled_datetime)}</Text>
                  {appointment.reason_for_visit ? (
                    <Text className="mt-1 text-xs text-slate-400" numberOfLines={2}>
                      {appointment.reason_for_visit}
                    </Text>
                  ) : null}
                </View>
                <View className="items-end gap-1.5">
                  <StatusBadge status={appointment.status} />
                  <PriorityBadge priority={appointment.priority} />
                </View>
              </View>

              {tab === "upcoming" && appointment.status !== "in_consult" ? (
                <Button
                  label="Cancel"
                  variant="danger"
                  className="mt-3"
                  onPress={() => handleCancel(appointment)}
                  loading={cancelAppointment.isPending}
                />
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
