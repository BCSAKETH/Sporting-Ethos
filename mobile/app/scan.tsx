import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { CheckCircle2, QrCode, RefreshCw, HelpCircle } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { usePrimaryHospital } from "../features/hospitals/useHospitals";
import { useAuth } from "../features/auth/useAuth";
import { useHospitalQueue, useSpotCheckIn, queuePosition } from "../features/qr-checkin/useCheckin";
import { isCheckinQrValue } from "../utils/qr";
import { queryKeys } from "../constants/queryKeys";
import { listDepartments } from "../services/departments.service";

type Stage = "scanning" | "confirming" | "success" | "not-found";

export default function ScanScreen() {
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>("scanning");
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const scannedRef = useRef(false);
  const [cameraKey, setCameraKey] = useState(0);

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const { data: departments } = useQuery({ queryKey: queryKeys.departments, queryFn: listDepartments });

  const { profile } = useAuth();
  const { data: hospital } = usePrimaryHospital();
  const spotCheckIn = useSpotCheckIn();
  const { data: queue } = useHospitalQueue(stage === "success" ? hospital?.id : undefined);

  const position = checkinId && queue ? queuePosition(checkinId, queue) : null;

  const handleScan = useCallback((result: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScannedUrl(result.data);

    if (isCheckinQrValue(result.data)) {
      setStage("confirming");
    } else {
      setStage("not-found");
    }
  }, []);

  function resetScanner() {
    scannedRef.current = false;
    setScannedUrl(null);
    setSelectedDeptId(null);
    setCameraKey((k) => k + 1);
    setStage("scanning");
  }

  async function confirmCheckIn() {
    if (!profile || !hospital) return;
    try {
      const age = profile.date_of_birth
        ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;

      const checkin = await spotCheckIn.mutateAsync({
        patientId: profile.id,
        hospitalId: hospital.id,
        fullName: profile.full_name,
        departmentId: selectedDeptId,
        age: age,
        gender: profile.gender,
        phone: profile.phone,
        bloodGroup: profile.blood_group,
        height: profile.height_cm,
        weight: profile.weight_kg,
      });
      setCheckinId(checkin.id);
      setStage("success");
    } catch {
      setStage("not-found");
    }
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <QrCode size={48} color="#059669" />
          <Text className="text-center text-xl font-bold text-slate-900">
            Camera Access Needed
          </Text>
          <Text className="text-center text-base text-slate-600">
            Sporting Ethos needs camera access to scan the check-in QR code at the counter.
          </Text>
          <Button label="Grant Camera Access" onPress={requestPermission} />
        </View>
      </ScreenContainer>
    );
  }

  if (stage === "scanning") {
    return (
      <View style={{ flex: 1, width: "100%", height: "100%" }}>
        {isFocused ? (
          <CameraView
            key={`cam-${cameraKey}`}
            style={{ flex: 1, width: "100%", height: "100%" }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={handleScan}
          >
            {/* Viewfinder Overlay inside CameraView */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.viewfinderBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            <View style={styles.bottomInstructionContainer}>
              <Text style={styles.instructionText}>
                Point camera at the counter QR code
              </Text>

              <TouchableOpacity
                onPress={() => setCameraKey((k) => k + 1)}
                style={styles.reloadButton}
                activeOpacity={0.7}
              >
                <RefreshCw size={14} color="#ffffff" />
                <Text style={styles.reloadText}>Reload Camera</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View className="flex-1 items-center justify-center bg-black">
            <Text className="text-white">Opening camera...</Text>
          </View>
        )}
      </View>
    );
  }

  if (stage === "not-found") {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <QrCode size={40} color="#f43f5e" />
          <Text className="text-center text-lg font-bold text-slate-900">
            Unrecognized QR Code
          </Text>
          <Text className="text-center text-base text-slate-600">
            That doesn&apos;t look like a Sporting Ethos check-in code. Ask reception for the counter QR and try again.
          </Text>
          {scannedUrl && (
            <Text className="rounded-lg bg-slate-100 p-2 text-center text-xs font-mono text-slate-500">
              Scanned: {scannedUrl}
            </Text>
          )}
          <Button label="Try Scanning Again" onPress={resetScanner} />
        </View>
      </ScreenContainer>
    );
  }

  if (stage === "confirming") {
    const opdDepartments = (departments ?? []).filter((d) => d.department_type === "OPD" || !d.department_type);

    return (
      <ScreenContainer scroll={true}>
        <View className="py-6 px-4 gap-4">
          <Card className="items-center gap-2 py-6">
            <QrCode size={36} color="#047857" />
            <Text className="text-xl font-bold text-slate-900">Counter Check-In</Text>
            <Text className="text-center text-sm font-semibold text-slate-700">{hospital?.name ?? "Government Hospital OPD"}</Text>
            <Text className="text-center text-xs text-slate-400">Patient: {profile?.full_name}</Text>
          </Card>

          <Text className="text-base font-bold text-slate-900 mt-2">Select OPD Department</Text>
          <Text className="text-xs text-slate-500 -mt-2">
            Choosing a department sends you directly to the doctor&apos;s queue.
          </Text>

          {/* Help Desk Option */}
          <TouchableOpacity
            onPress={() => setSelectedDeptId(null)}
            activeOpacity={0.8}
            className={`p-4 rounded-2xl border flex-row items-center gap-3 ${
              selectedDeptId === null ? "bg-amber-50 border-amber-500 shadow-sm" : "bg-white border-slate-200"
            }`}
          >
            <View className="rounded-full bg-amber-100 p-2.5">
              <HelpCircle size={22} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-sm text-slate-900">I don&apos;t know / Need Help</Text>
              <Text className="text-xs text-slate-500">Go to Reception Help Desk for assistance</Text>
            </View>
            {selectedDeptId === null && (
              <View className="h-5 w-5 rounded-full bg-amber-600 items-center justify-center">
                <Text className="text-white text-xs font-bold">✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* OPD Department List */}
          <View className="gap-2.5">
            {opdDepartments.map((dept) => {
              const isSelected = selectedDeptId === dept.id;
              return (
                <TouchableOpacity
                  key={dept.id}
                  onPress={() => setSelectedDeptId(dept.id)}
                  activeOpacity={0.8}
                  className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                    isSelected ? "bg-emerald-50 border-emerald-500 shadow-sm" : "bg-white border-slate-200"
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-sm text-slate-900">{dept.name}</Text>
                    {dept.description && (
                      <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                        {dept.description}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View className="h-5 w-5 rounded-full bg-emerald-600 items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            label={selectedDeptId ? "Confirm & Join Department Queue" : "Confirm & Go to Help Desk"}
            className="mt-4 w-full"
            onPress={confirmCheckIn}
            loading={spotCheckIn.isPending}
          />
          <Button label="Cancel" variant="ghost" onPress={resetScanner} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full items-center gap-2 py-8">
          <CheckCircle2 size={48} color="#059669" />
          <Text className="text-xl font-bold text-slate-900">You&apos;re checked in!</Text>
          {position ? (
            <>
              <Text className="mt-2 text-5xl font-extrabold text-emerald-700">{position}</Text>
              <Text className="text-xs uppercase tracking-wide text-slate-400">position in queue</Text>
            </>
          ) : (
            <Text className="text-sm text-slate-500">You&apos;ll be called shortly at reception.</Text>
          )}
          <Button label="Done" className="mt-6 w-full" onPress={() => router.replace("/(tabs)")} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderBox: {
    width: 250,
    height: 250,
    position: "relative",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#10b981",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  bottomInstructionContainer: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  instructionText: {
    backgroundColor: "rgba(0,0,0,0.75)",
    color: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reloadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
});
