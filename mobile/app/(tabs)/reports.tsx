import { useEffect, useState, type ReactNode } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, Stethoscope, Pill, ChevronRight, X, Receipt, Wallet, CheckCircle2, Clock, BedDouble, Download } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../features/auth/useAuth";
import { getPatientRecords, getActiveAdmission, type ConsultationReport, type PatientBill, type StructuredMedication } from "../../services/records.service";
import { exportReportPdf, exportBillPdf } from "../../lib/pdf";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const TIMINGS: [keyof NonNullable<StructuredMedication["timing"]>, string][] = [
  ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"],
];

// Live IPD room-charge banner — reflects the running bill while admitted.
function IpdTicker({ patientId }: { patientId: string }) {
  const { data: adm } = useQuery({
    queryKey: ["active-admission", patientId],
    queryFn: () => getActiveAdmission(patientId),
    enabled: !!patientId,
    refetchInterval: 30000,
  });
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!adm) return null;
  // Live accrual estimate (per-second) shown alongside the billable day count.
  const elapsedSec = Math.max(0, (Date.now() - new Date(adm.admissionDate).getTime()) / 1000);
  const accrued = (adm.dailyRate / 86400) * elapsedSec;
  return (
    <View className="rounded-2xl bg-sky-600 p-4">
      <View className="flex-row items-center gap-2">
        <BedDouble size={18} color="#fff" />
        <Text className="text-white font-bold text-sm">Currently Admitted · {adm.admissionNo}</Text>
      </View>
      <Text className="text-sky-100 text-xs mt-1">
        {adm.ward ?? "Ward"} · Room {adm.room} · Bed {adm.bed} · {inr(adm.dailyRate)}/day
      </Text>
      <View className="flex-row items-end justify-between mt-2">
        <View>
          <Text className="text-[10px] font-semibold uppercase text-sky-200">Billable ({adm.days}d)</Text>
          <Text className="text-white text-2xl font-extrabold">{inr(adm.runningCharges)}</Text>
        </View>
        <Text className="text-sky-100 text-xs mb-1">accruing ≈ {inr(Math.floor(accrued))}</Text>
      </View>
    </View>
  );
}

function IntakeCard({ med }: { med: StructuredMedication }) {
  const timings = TIMINGS.filter(([k]) => med.timing?.[k]).map(([, l]) => l).join(" • ");
  return (
    <View className="bg-slate-50 p-3 rounded-xl border border-slate-200">
      <View className="flex-row items-center gap-2">
        <Pill size={18} color="#047857" />
        <Text className="text-sm font-bold text-slate-900 flex-1">{med.medicine_name}</Text>
      </View>
      <Text className="text-xs text-slate-600 mt-1">
        {med.dosage} × {med.frequency}/day × {med.duration_days} days · {med.route ?? "Oral"} · {med.before_after_food ?? ""}
      </Text>
      {timings ? <Text className="text-xs text-emerald-700 mt-0.5">🕐 {timings}</Text> : null}
      {med.special_instructions ? <Text className="text-xs text-purple-600 mt-0.5">✎ {med.special_instructions}</Text> : null}
    </View>
  );
}

export default function ReportsScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"reports" | "bills">("reports");
  const [selectedReport, setSelectedReport] = useState<ConsultationReport | null>(null);
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-records", profile?.id],
    queryFn: () => getPatientRecords(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 8000,
  });

  const reports = data?.reports ?? [];
  const bills = data?.bills ?? [];
  const paid = bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.total, 0);
  const pending = bills.filter((b) => b.status === "Pending").reduce((s, b) => s + b.total, 0);

  return (
    <ScreenContainer>
      <View className="py-2 gap-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900">Records &amp; Billing</Text>
          <Text className="text-sm text-slate-500">Your consultations, e-prescriptions &amp; invoices</Text>
        </View>

        <Card className="flex-row items-center justify-between bg-slate-50 border-slate-200 py-3">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Record</Text>
            <Text className="text-sm font-bold text-slate-900">{profile?.full_name ?? "Patient"}</Text>
          </View>
          <FileText size={22} color="#94a3b8" />
        </Card>

        {profile?.id ? <IpdTicker patientId={profile.id} /> : null}

        <View className="flex-row bg-slate-100 rounded-2xl p-1">
          <SegBtn label={`Consultations${reports.length ? ` (${reports.length})` : ""}`} active={tab === "reports"} onPress={() => setTab("reports")} />
          <SegBtn label={`Bills${bills.length ? ` (${bills.length})` : ""}`} active={tab === "bills"} onPress={() => setTab("bills")} />
        </View>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#059669" />
            <Text className="mt-3 text-xs text-slate-400">Loading your records…</Text>
          </View>
        ) : isError ? (
          <EmptyState icon={<FileText size={30} color="#94a3b8" />} title="Couldn't load records" subtitle="Check your connection and try again." />
        ) : tab === "reports" ? (
          reports.length === 0 ? (
            <EmptyState icon={<Stethoscope size={30} color="#94a3b8" />} title="No consultations yet" subtitle="Your visit summaries appear here after a doctor completes your consultation." />
          ) : (
            <View className="gap-3">
              {reports.map((report) => (
                <TouchableOpacity key={report.id} onPress={() => setSelectedReport(report)} activeOpacity={0.7}>
                  <Card className="gap-2.5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2 flex-1">
                        <FileText size={20} color="#059669" />
                        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>{report.department ?? "OPD Consultation"}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-semibold text-emerald-700">View</Text>
                        <ChevronRight size={16} color="#047857" />
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <Calendar size={13} color="#64748b" />
                      <Text className="text-xs font-medium text-slate-600">{report.date}</Text>
                      {report.appointmentId ? (
                        <Text className="text-xs font-mono text-slate-400">· {report.appointmentId}</Text>
                      ) : null}
                    </View>

                    {report.summary ? (
                      <View className="border-t border-slate-100 pt-2 flex-row items-center justify-between">
                        <Text className="text-xs text-slate-600 italic flex-1 mr-2" numberOfLines={1}>&quot;{report.summary}&quot;</Text>
                        {report.prescriptions.length ? (
                          <Text className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">{report.prescriptions.length} Rx</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : bills.length === 0 ? (
          <EmptyState icon={<Receipt size={30} color="#94a3b8" />} title="No bills yet" subtitle="Pharmacy invoices appear here once medicines are dispensed for you." />
        ) : (
          <View className="gap-3">
            <View className="flex-row gap-3">
              <Card className="flex-1 gap-1 py-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</Text>
                <Text className="text-xl font-extrabold text-emerald-700">{inr(paid)}</Text>
              </Card>
              <Card className="flex-1 gap-1 py-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</Text>
                <Text className={`text-xl font-extrabold ${pending > 0 ? "text-amber-600" : "text-slate-400"}`}>{inr(pending)}</Text>
              </Card>
            </View>

            {bills.map((bill) => (
              <TouchableOpacity key={bill.id} onPress={() => setSelectedBill(bill)} activeOpacity={0.7}>
                <Card className="gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Receipt size={20} color="#7c3aed" />
                      <Text className="text-base font-bold text-slate-900" numberOfLines={1}>{bill.department ?? "Pharmacy"}</Text>
                    </View>
                    <StatusPill status={bill.status} />
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Calendar size={13} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600">{bill.date} · {bill.billNo}</Text>
                  </View>

                  <View className="border-t border-slate-100 pt-2 flex-row items-center justify-between">
                    <Text className="text-xs text-slate-500">{bill.items.length} line items</Text>
                    <Text className="text-base font-extrabold text-slate-900">{inr(bill.total)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setSelectedReport(null)}>
          <View className="flex-1 bg-slate-900/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[85%] gap-4">
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                <View className="flex-row items-center gap-2 flex-1">
                  <Stethoscope size={22} color="#059669" />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>{selectedReport.department ?? "OPD Consultation"}</Text>
                    <Text className="text-xs text-slate-500">{selectedReport.date}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} className="p-1">
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4">
                {selectedReport.summary ? (
                  <View className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                    <Text className="text-xs font-bold uppercase text-emerald-800 mb-1">Doctor&apos;s Summary</Text>
                    <Text className="text-xs text-slate-700 leading-relaxed">{selectedReport.summary}</Text>
                  </View>
                ) : null}

                {selectedReport.symptoms.length ? (
                  <View>
                    <Text className="text-xs font-bold uppercase text-slate-400 mb-1">Symptoms Recorded</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {selectedReport.symptoms.map((sym, idx) => (
                        <Text key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-medium">• {sym}</Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {selectedReport.medications.length ? (
                  <View>
                    <Text className="text-xs font-bold uppercase text-slate-400 mb-2">Prescribed (e-Rx) — how to take</Text>
                    <View className="gap-2">
                      {selectedReport.medications.map((med, idx) => <IntakeCard key={idx} med={med} />)}
                    </View>
                  </View>
                ) : selectedReport.prescriptions.length ? (
                  <View>
                    <Text className="text-xs font-bold uppercase text-slate-400 mb-2">Prescribed (Rx)</Text>
                    <View className="gap-2">
                      {selectedReport.prescriptions.map((med, idx) => (
                        <View key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex-row items-center gap-2.5">
                          <Pill size={18} color="#047857" />
                          <Text className="text-sm font-semibold text-slate-900 flex-1">{med}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {selectedReport.actions.length ? (
                  <View>
                    <Text className="text-xs font-bold uppercase text-slate-400 mb-1">Advice &amp; Follow-up</Text>
                    {selectedReport.actions.map((a, idx) => (
                      <Text key={idx} className="text-sm text-slate-700 leading-relaxed">• {a}</Text>
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                onPress={() => exportReportPdf(selectedReport, profile?.full_name ?? "Patient")}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3"
              >
                <Download size={18} color="#fff" />
                <Text className="text-white font-bold">Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Bill Detail Modal */}
      {selectedBill && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setSelectedBill(null)}>
          <View className="flex-1 bg-slate-900/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[85%] gap-4">
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                <View className="flex-row items-center gap-2 flex-1">
                  <Receipt size={22} color="#7c3aed" />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900">{selectedBill.billNo}</Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>{selectedBill.department ?? "Pharmacy"} · {selectedBill.date}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedBill(null)} className="p-1">
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="gap-2">
                {selectedBill.items.map((item, idx) => (
                  <View key={idx} className="py-1.5 border-b border-slate-100">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-slate-800 flex-1 pr-2">{item.name}{item.qty > 1 ? ` × ${item.qty}` : ""}</Text>
                      <Text className="text-sm font-semibold text-slate-900">{inr(item.price * item.qty)}</Text>
                    </View>
                    {item.instruction ? <Text className="text-[11px] text-emerald-700 mt-0.5">↳ {item.instruction}</Text> : null}
                  </View>
                ))}
                <View className="flex-row items-center justify-between pt-2">
                  <Text className="text-base font-bold text-slate-900">Total</Text>
                  <Text className="text-xl font-extrabold text-slate-900">{inr(selectedBill.total)}</Text>
                </View>
              </ScrollView>

              <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <View className="flex-row items-center gap-2">
                  <Wallet size={18} color="#64748b" />
                  <Text className="text-xs font-semibold text-slate-600">{selectedBill.status === "Paid" ? "Payment received" : "Payment pending"}</Text>
                </View>
                <StatusPill status={selectedBill.status} />
              </View>

              <TouchableOpacity
                onPress={() => exportBillPdf(selectedBill, profile?.full_name ?? "Patient")}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3"
              >
                <Download size={18} color="#fff" />
                <Text className="text-white font-bold">Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <View className="py-14 items-center px-6">
      <View className="h-16 w-16 rounded-full bg-slate-100 items-center justify-center mb-3">{icon}</View>
      <Text className="text-base font-bold text-slate-700">{title}</Text>
      <Text className="text-xs text-slate-400 text-center mt-1">{subtitle}</Text>
    </View>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className={`flex-1 py-2.5 rounded-xl items-center ${active ? "bg-white shadow-sm" : ""}`}>
      <Text className={`text-sm font-bold ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ status }: { status: "Paid" | "Pending" }) {
  const paid = status === "Paid";
  return (
    <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${paid ? "bg-emerald-100" : "bg-amber-100"}`}>
      {paid ? <CheckCircle2 size={13} color="#047857" /> : <Clock size={13} color="#b45309" />}
      <Text className={`text-[10px] font-bold ${paid ? "text-emerald-800" : "text-amber-700"}`}>{status}</Text>
    </View>
  );
}
