import { useState } from "react";
import { Text, View, TouchableOpacity, Modal, Alert, Linking, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { FlaskConical, CalendarClock, Upload, CheckCircle2, ExternalLink } from "lucide-react-native";
import { Card } from "./ui/Card";
import { useAuth } from "../features/auth/useAuth";
import { listMyLabOrders, scheduleLabOrder, uploadExternalResult, type LabOrder } from "../services/lab.service";

const STATUS_LABEL: Record<LabOrder["status"], string> = {
  pending: "Action needed",
  scheduled: "Scheduled at clinic",
  completed_internal: "Result ready",
  completed_external: "Report uploaded",
};

function slots(): { label: string; iso: string }[] {
  const out: { label: string; iso: string }[] = [];
  for (let d = 1; d <= 3; d++) {
    for (const h of [9, 11, 14, 16]) {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      dt.setHours(h, 0, 0, 0);
      out.push({ label: dt.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), iso: dt.toISOString() });
    }
  }
  return out;
}

export default function LabOrders() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [scheduling, setScheduling] = useState<LabOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-lab-orders", profile?.id],
    queryFn: () => listMyLabOrders(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 20000,
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["my-lab-orders", profile?.id] });

  async function upload(order: LabOrder) {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      if (a.size && a.size > 2 * 1024 * 1024) return Alert.alert("File too large", "Please pick a file under 2 MB.");
      setBusyId(order.id);
      await uploadExternalResult(order, a.uri, a.name ?? "report", a.mimeType ?? "application/octet-stream");
      refetch();
    } catch (e) {
      console.error(e);
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function schedule(order: LabOrder, iso: string) {
    setBusyId(order.id);
    try {
      await scheduleLabOrder(order.id, iso);
      setScheduling(null);
      refetch();
    } catch {
      Alert.alert("Could not schedule", "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!profile?.id || (!isLoading && orders.length === 0)) return null;

  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center gap-2">
        <FlaskConical size={18} color="#7c3aed" />
        <Text className="text-base font-bold text-slate-900">Lab Tests Ordered</Text>
      </View>

      {isLoading ? (
        <Card className="py-6 items-center"><ActivityIndicator color="#7c3aed" /></Card>
      ) : (
        <View className="gap-2.5">
          {orders.map((o) => {
            const done = o.status === "completed_internal" || o.status === "completed_external";
            return (
              <Card key={o.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-slate-900 flex-1 pr-2">{o.test_name}</Text>
                  <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${done ? "bg-emerald-100" : o.status === "scheduled" ? "bg-sky-100" : "bg-amber-100"}`}>
                    {done && <CheckCircle2 size={12} color="#047857" />}
                    <Text className={`text-[10px] font-bold ${done ? "text-emerald-800" : o.status === "scheduled" ? "text-sky-800" : "text-amber-700"}`}>{STATUS_LABEL[o.status]}</Text>
                  </View>
                </View>
                {o.prep_instructions ? <Text className="text-xs text-slate-500">Prep: {o.prep_instructions}</Text> : null}
                {o.scheduled_slot ? <Text className="text-xs text-sky-700">🕐 {new Date(o.scheduled_slot).toLocaleString("en-IN")}</Text> : null}

                {o.status === "pending" ? (
                  <View className="flex-row gap-2 mt-1">
                    <TouchableOpacity onPress={() => setScheduling(o)} disabled={busyId === o.id} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2.5">
                      <CalendarClock size={15} color="#fff" />
                      <Text className="text-white text-xs font-bold">Schedule at Clinic</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => upload(o)} disabled={busyId === o.id} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5">
                      <Upload size={15} color="#fff" />
                      <Text className="text-white text-xs font-bold">{busyId === o.id ? "Uploading…" : "Upload Report"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : o.result_url ? (
                  <TouchableOpacity onPress={() => Linking.openURL(o.result_url!)} className="flex-row items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 mt-1">
                    <ExternalLink size={15} color="#047857" />
                    <Text className="text-emerald-800 text-xs font-bold">View Report</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      {/* Slot picker */}
      {scheduling && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setScheduling(null)}>
          <View className="flex-1 bg-slate-900/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
              <Text className="text-lg font-bold text-slate-900 mb-1">Book a slot</Text>
              <Text className="text-xs text-slate-500 mb-4">{scheduling.test_name}</Text>
              <View className="flex-row flex-wrap gap-2">
                {slots().map((s) => (
                  <TouchableOpacity key={s.iso} onPress={() => schedule(scheduling, s.iso)} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                    <Text className="text-xs font-bold text-sky-800">{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setScheduling(null)} className="mt-4 rounded-2xl border border-slate-200 py-3 items-center">
                <Text className="font-semibold text-slate-600">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
