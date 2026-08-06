import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react-native";
import { Card } from "./ui/Card";
import { useAuth } from "../features/auth/useAuth";
import { getMyActiveCheckin } from "../services/checkins.service";

const STATUS_META: Record<string, { label: string; tint: string; bg: string }> = {
  waiting_reception: { label: "At Reception", tint: "#b45309", bg: "bg-amber-100" },
  waiting: { label: "At Reception", tint: "#b45309", bg: "bg-amber-100" },
  waiting_department: { label: "In OPD Queue", tint: "#0369a1", bg: "bg-sky-100" },
  paused: { label: "Paused", tint: "#64748b", bg: "bg-slate-100" },
  in_consult: { label: "In Consultation", tint: "#047857", bg: "bg-emerald-100" },
};

// Live "current visit" card — shows the patient's queue token → appointment id,
// live status and department, refreshed every few seconds.
export default function CurrentVisit() {
  const { profile } = useAuth();
  const { data: visit } = useQuery({
    queryKey: ["active-visit", profile?.id],
    queryFn: () => getMyActiveCheckin(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 5000,
  });

  if (!visit) return null;
  const meta = STATUS_META[visit.status] ?? { label: visit.status, tint: "#64748b", bg: "bg-slate-100" };

  return (
    <Card className="mt-4 gap-3 border border-emerald-200">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wider text-emerald-700">Current Visit</Text>
        <View className={`px-2.5 py-0.5 rounded-full ${meta.bg}`}>
          <Text className="text-[10px] font-bold" style={{ color: meta.tint }}>{meta.label}</Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-emerald-50 p-3 items-center">
          <Text className="text-[10px] font-bold uppercase text-emerald-600">Queue Token</Text>
          <Text className="text-2xl font-extrabold text-emerald-800">{visit.queueId ?? "—"}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-purple-50 p-3 items-center">
          <Text className="text-[10px] font-bold uppercase text-purple-600">Appointment</Text>
          <Text className="text-2xl font-extrabold text-purple-800">{visit.appointmentId ?? "—"}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <Building2 size={14} color="#64748b" />
        <Text className="text-xs text-slate-600 flex-1">{visit.department ?? "Awaiting department assignment at reception"}</Text>
        {visit.priority === "emergency" ? <Text className="text-[10px] font-bold text-rose-600">🚨 EMERGENCY</Text> : null}
      </View>
    </Card>
  );
}
