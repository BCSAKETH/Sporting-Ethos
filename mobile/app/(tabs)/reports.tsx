import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { FileText, Calendar, Stethoscope, Pill, CheckCircle2, ChevronRight, X } from "lucide-react-native";
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

export default function ReportsScreen() {
  const { profile } = useAuth();
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);

  return (
    <ScreenContainer>
      <View className="py-2 gap-4">
        {/* Header */}
        <View>
          <Text className="text-2xl font-bold text-slate-900">Medical Reports &amp; History</Text>
          <Text className="text-sm text-slate-500">
            Digital OPD consultation summaries &amp; e-prescriptions
          </Text>
        </View>

        {/* Patient Record Tag */}
        <Card className="flex-row items-center justify-between bg-slate-50 border-slate-200 py-3">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Patient Record
            </Text>
            <Text className="text-sm font-bold text-slate-900">{profile?.full_name ?? "Patient"}</Text>
          </View>
        </Card>

        {/* Reports List */}
        <View className="gap-3">
          {MOCK_PATIENT_REPORTS.map((report) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => setSelectedReport(report)}
              activeOpacity={0.7}
            >
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
      </View>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal animationType="slide" transparent={true} visible={true} onRequestClose={() => setSelectedReport(null)}>
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
                {/* Date & Location */}
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold uppercase">Date &amp; Facility</Text>
                  <Text className="text-xs font-semibold text-slate-800 mt-0.5">{selectedReport.date}</Text>
                  <Text className="text-xs text-slate-600">{selectedReport.hospital}</Text>
                </View>

                {/* Complaint */}
                <View>
                  <Text className="text-xs font-bold uppercase text-slate-400 mb-1">Chief Complaint</Text>
                  <Text className="text-sm font-semibold text-slate-800">{selectedReport.chiefComplaint}</Text>
                </View>

                {/* Symptoms */}
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

                {/* Prescriptions */}
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

                {/* Doctor Advice / Summary */}
                <View className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                  <Text className="text-xs font-bold uppercase text-emerald-800 mb-1">Doctor Advice &amp; Summary</Text>
                  <Text className="text-xs text-slate-700 leading-relaxed">{selectedReport.summary}</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}
