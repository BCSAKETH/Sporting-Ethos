import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { FileText, Calendar, Stethoscope, Pill, ChevronRight, X, Receipt, Wallet, CheckCircle2, Clock } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../features/auth/useAuth";

interface MedicalReport {
  id: string;
  date: string;
  doctorName: string;
  department: string;
  hospital: string;
  chiefComplaint: string;
  symptoms: string[];
  prescriptions: { name: string; dosage: string; frequency: string }[];
  summary: string;
  status: "Completed" | "Follow-up Advised";
}

interface Bill {
  id: string;
  invoiceNo: string;
  date: string;
  department: string;
  items: { label: string; amount: number }[];
  total: number;
  status: "Paid" | "Pending";
  method?: string;
}

const MOCK_PATIENT_REPORTS: MedicalReport[] = [
  {
    id: "rep-001",
    date: "14 May 2026 · 10:30 AM",
    doctorName: "Dr. Rajesh Kumar",
    department: "General Medicine",
    hospital: "Sporting Ethos Multi-Specialty Hospital",
    chiefComplaint: "Acute viral fever with body ache and fatigue",
    symptoms: ["Fever (101°F)", "Headache", "Muscle soreness"],
    prescriptions: [
      { name: "Paracetamol", dosage: "650 mg", frequency: "1 tablet after meals (TID)" },
      { name: "Vitamin C & Zinc", dosage: "500 mg", frequency: "1 tablet daily" },
      { name: "ORSL Electrolyte", dosage: "1 sachet", frequency: "In 1L water daily" },
    ],
    summary: "Diagnosed with acute upper respiratory viral syndrome. Advised 3 days complete bed rest, adequate hydration, and temperature monitoring.",
    status: "Completed",
  },
  {
    id: "rep-002",
    date: "02 Feb 2026 · 02:15 PM",
    doctorName: "Dr. Vikram Singh",
    department: "Orthopedics",
    hospital: "Sporting Ethos Multi-Specialty Hospital",
    chiefComplaint: "Right knee strain following athletic training",
    symptoms: ["Localized patellar pain", "Mild swelling after activity"],
    prescriptions: [
      { name: "Ibuprofen", dosage: "400 mg", frequency: "Twice daily after meals (5 days)" },
      { name: "Analgesic Spray", dosage: "Topical", frequency: "Apply 3 times daily" },
    ],
    summary: "Right patellar tendon strain. RICE protocol prescribed. Avoid high-impact running for 2 weeks. Physical therapy follow-up scheduled.",
    status: "Follow-up Advised",
  },
];

const MOCK_BILLS: Bill[] = [
  {
    id: "bill-001",
    invoiceNo: "INV-2026-0514",
    date: "14 May 2026",
    department: "General Medicine",
    items: [
      { label: "OPD Consultation Fee", amount: 300 },
      { label: "Pharmacy — 3 medicines", amount: 240 },
      { label: "Registration", amount: 50 },
    ],
    total: 590,
    status: "Paid",
    method: "UPI · Google Pay",
  },
  {
    id: "bill-002",
    invoiceNo: "INV-2026-0202",
    date: "02 Feb 2026",
    department: "Orthopedics",
    items: [
      { label: "OPD Consultation Fee", amount: 400 },
      { label: "X-Ray — Right Knee (AP/Lat)", amount: 650 },
      { label: "Pharmacy — 2 medicines", amount: 180 },
    ],
    total: 1230,
    status: "Paid",
    method: "Card · HDFC",
  },
  {
    id: "bill-003",
    invoiceNo: "INV-2026-0805",
    date: "05 Aug 2026",
    department: "Physiotherapy",
    items: [
      { label: "Follow-up Session", amount: 350 },
      { label: "Therapeutic Ultrasound", amount: 200 },
    ],
    total: 550,
    status: "Pending",
  },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function ReportsScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"reports" | "bills">("reports");
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const paid = MOCK_BILLS.filter((b) => b.status === "Paid").reduce((s, b) => s + b.total, 0);
  const pending = MOCK_BILLS.filter((b) => b.status === "Pending").reduce((s, b) => s + b.total, 0);

  return (
    <ScreenContainer>
      <View className="py-2 gap-4">
        {/* Header */}
        <View>
          <Text className="text-2xl font-bold text-slate-900">Records &amp; Billing</Text>
          <Text className="text-sm text-slate-500">Past consultations, e-prescriptions &amp; invoices</Text>
        </View>

        {/* Patient Record Tag */}
        <Card className="flex-row items-center justify-between bg-slate-50 border-slate-200 py-3">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Record</Text>
            <Text className="text-sm font-bold text-slate-900">{profile?.full_name ?? "Patient"}</Text>
          </View>
          <FileText size={22} color="#94a3b8" />
        </Card>

        {/* Segmented control */}
        <View className="flex-row bg-slate-100 rounded-2xl p-1">
          <SegBtn label="Consultations" active={tab === "reports"} onPress={() => setTab("reports")} />
          <SegBtn label="Bills" active={tab === "bills"} onPress={() => setTab("bills")} />
        </View>

        {tab === "reports" ? (
          <View className="gap-3">
            {MOCK_PATIENT_REPORTS.map((report) => (
              <TouchableOpacity key={report.id} onPress={() => setSelectedReport(report)} activeOpacity={0.7}>
                <Card className="gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <FileText size={20} color="#059669" />
                      <Text className="text-base font-bold text-slate-900">{report.department}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs font-semibold text-emerald-700">View</Text>
                      <ChevronRight size={16} color="#047857" />
                    </View>
                  </View>

                  <Text className="text-xs text-slate-500">{report.doctorName} · {report.hospital}</Text>

                  <View className="flex-row items-center gap-1.5 mt-1">
                    <Calendar size={13} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600">{report.date}</Text>
                  </View>

                  <View className="border-t border-slate-100 pt-2 flex-row items-center justify-between">
                    <Text className="text-xs text-slate-600 italic flex-1 mr-2" numberOfLines={1}>
                      &quot;{report.chiefComplaint}&quot;
                    </Text>
                    <Text className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {report.prescriptions.length} Meds
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="gap-3">
            {/* Billing summary */}
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

            {MOCK_BILLS.map((bill) => (
              <TouchableOpacity key={bill.id} onPress={() => setSelectedBill(bill)} activeOpacity={0.7}>
                <Card className="gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Receipt size={20} color="#7c3aed" />
                      <Text className="text-base font-bold text-slate-900">{bill.department}</Text>
                    </View>
                    <StatusPill status={bill.status} />
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Calendar size={13} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600">{bill.date} · {bill.invoiceNo}</Text>
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
                <View className="flex-row items-center gap-2">
                  <Stethoscope size={22} color="#059669" />
                  <View>
                    <Text className="text-lg font-bold text-slate-900">{selectedReport.department}</Text>
                    <Text className="text-xs text-slate-500">{selectedReport.doctorName}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} className="p-1">
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4">
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold uppercase">Date &amp; Facility</Text>
                  <Text className="text-xs font-semibold text-slate-800 mt-0.5">{selectedReport.date}</Text>
                  <Text className="text-xs text-slate-600">{selectedReport.hospital}</Text>
                </View>

                <View>
                  <Text className="text-xs font-bold uppercase text-slate-400 mb-1">Chief Complaint</Text>
                  <Text className="text-sm font-semibold text-slate-800">{selectedReport.chiefComplaint}</Text>
                </View>

                <View>
                  <Text className="text-xs font-bold uppercase text-slate-400 mb-1">Symptoms Recorded</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {selectedReport.symptoms.map((sym, idx) => (
                      <Text key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-medium">
                        • {sym}
                      </Text>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold uppercase text-slate-400 mb-2">Prescribed Medicines (Rx)</Text>
                  <View className="gap-2">
                    {selectedReport.prescriptions.map((med, idx) => (
                      <View key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2.5">
                          <Pill size={18} color="#047857" />
                          <View>
                            <Text className="text-sm font-bold text-slate-900">{med.name}</Text>
                            <Text className="text-xs text-slate-500">{med.dosage}</Text>
                          </View>
                        </View>
                        <Text className="text-xs font-semibold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {med.frequency}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                  <Text className="text-xs font-bold uppercase text-emerald-800 mb-1">Doctor Advice &amp; Summary</Text>
                  <Text className="text-xs text-slate-700 leading-relaxed">{selectedReport.summary}</Text>
                </View>
              </ScrollView>
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
                <View className="flex-row items-center gap-2">
                  <Receipt size={22} color="#7c3aed" />
                  <View>
                    <Text className="text-lg font-bold text-slate-900">{selectedBill.invoiceNo}</Text>
                    <Text className="text-xs text-slate-500">{selectedBill.department} · {selectedBill.date}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedBill(null)} className="p-1">
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="gap-2">
                {selectedBill.items.map((item, idx) => (
                  <View key={idx} className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
                    <Text className="text-sm text-slate-700 flex-1 pr-2">{item.label}</Text>
                    <Text className="text-sm font-semibold text-slate-900">{inr(item.amount)}</Text>
                  </View>
                ))}
                <View className="flex-row items-center justify-between pt-2">
                  <Text className="text-base font-bold text-slate-900">Total</Text>
                  <Text className="text-xl font-extrabold text-slate-900">{inr(selectedBill.total)}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <View className="flex-row items-center gap-2">
                  <Wallet size={18} color="#64748b" />
                  <Text className="text-xs font-semibold text-slate-600">
                    {selectedBill.status === "Paid" ? selectedBill.method ?? "Paid" : "Payment pending"}
                  </Text>
                </View>
                <StatusPill status={selectedBill.status} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScreenContainer>
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
