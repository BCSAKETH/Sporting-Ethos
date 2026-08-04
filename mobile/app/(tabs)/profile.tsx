import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { LogOut } from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { Avatar } from "../../components/ui/Avatar";
import { useAuth, useSignOut } from "../../features/auth/useAuth";
import {
  useAllergiesCatalog,
  useDiseasesCatalog,
  useMyAllergies,
  useMyDiseases,
  useToggleAllergy,
  useToggleDisease,
  useUpdateProfile,
} from "../../features/profile/useProfile";
import { profileFormSchema, type ProfileFormValues } from "../../features/profile/schemas";
import { calculateBmi, bmiCategory } from "../../utils/health";
import { BLOOD_GROUPS } from "../../constants/config";
import { useActiveMedications } from "../../features/medications/useMedications";

import { CalendarPickerModal } from "../../components/ui/CalendarPickerModal";
import { Calendar as CalendarIcon } from "lucide-react-native";

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const [savedMessage, setSavedMessage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      dateOfBirth: "",
      heightCm: "",
      weightKg: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      fullName: profile.full_name,
      phone: profile.phone ?? "",
      gender: profile.gender ?? undefined,
      dateOfBirth: profile.date_of_birth ?? "",
      bloodGroup: profile.blood_group ?? undefined,
      heightCm: profile.height_cm != null ? String(profile.height_cm) : "",
      weightKg: profile.weight_kg != null ? String(profile.weight_kg) : "",
      emergencyContactName: profile.emergency_contact_name ?? "",
      emergencyContactPhone: profile.emergency_contact_phone ?? "",
    });
  }, [profile, reset]);

  const heightCm = watch("heightCm");
  const weightKg = watch("weightKg");
  const dateOfBirth = watch("dateOfBirth");
  const previewBmi = calculateBmi(heightCm ? Number(heightCm) : null, weightKg ? Number(weightKg) : null);

  const onSave = handleSubmit(async (values) => {
    setSavedMessage("");
    try {
      await updateProfile.mutateAsync({
        full_name: values.fullName,
        phone: values.phone || null,
        gender: values.gender ?? null,
        date_of_birth: values.dateOfBirth || null,
        blood_group: values.bloodGroup ?? null,
        height_cm: values.heightCm ? Number(values.heightCm) : null,
        weight_kg: values.weightKg ? Number(values.weightKg) : null,
        emergency_contact_name: values.emergencyContactName || null,
        emergency_contact_phone: values.emergencyContactPhone || null,
      });
      setSavedMessage("Profile saved.");
    } catch {
      setSavedMessage("Could not save your profile. Please try again.");
    }
  });

  function handleLogout() {
    Alert.alert("Log out?", "You'll need to sign in again to book or view appointments.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut.mutateAsync();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <View className="items-center py-4">
        <Avatar name={profile?.full_name || "?"} size={72} />
        <Text className="mt-3 text-lg font-bold text-slate-900">{profile?.full_name}</Text>
        <Text className="text-sm text-slate-400">{session?.user.email}</Text>
      </View>

      <Card className="gap-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Personal Info</Text>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <TextField label="Full name" value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField label="Phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Gender</Text>
              <View className="flex-row gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => field.onChange(g)}
                    className={`flex-1 items-center rounded-xl border py-2.5 ${field.value === g ? "border-primary-600 bg-primary-50" : "border-slate-300"}`}
                  >
                    <Text className={`text-sm font-medium capitalize ${field.value === g ? "text-primary-700" : "text-slate-600"}`}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        />
        <View>
          <Text className="mb-1.5 text-sm font-medium text-slate-600">Date of Birth</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3.5"
          >
            <Text className={`text-base ${dateOfBirth ? "font-semibold text-slate-900" : "text-slate-400"}`}>
              {dateOfBirth ? dateOfBirth : "Select DOB from calendar"}
            </Text>
            <CalendarIcon size={20} color="#059669" />
          </Pressable>
        </View>
      </Card>

      <CalendarPickerModal
        visible={showDatePicker}
        value={dateOfBirth}
        onSelect={(d) => setValue("dateOfBirth", d)}
        onClose={() => setShowDatePicker(false)}
      />

      <Card className="mt-4 gap-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Medical Info</Text>
        <Controller
          control={control}
          name="bloodGroup"
          render={({ field }) => (
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Blood group</Text>
              <View className="flex-row flex-wrap gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <Pressable
                    key={bg}
                    onPress={() => field.onChange(bg)}
                    className={`rounded-lg border px-3 py-2 ${field.value === bg ? "border-primary-600 bg-primary-50" : "border-slate-300"}`}
                  >
                    <Text className={`text-sm font-semibold ${field.value === bg ? "text-primary-700" : "text-slate-600"}`}>{bg}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="heightCm"
              render={({ field }) => (
                <TextField
                  label="Height (cm)"
                  keyboardType="decimal-pad"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  error={errors.heightCm?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="weightKg"
              render={({ field }) => (
                <TextField
                  label="Weight (kg)"
                  keyboardType="decimal-pad"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  error={errors.weightKg?.message}
                />
              )}
            />
          </View>
        </View>
        {previewBmi ? (
          <Text className="text-sm text-slate-500">
            BMI: <Text className="font-semibold text-slate-800">{previewBmi}</Text> ({bmiCategory(previewBmi)})
          </Text>
        ) : null}
      </Card>

      <ConditionsSection />
      <AllergiesSection />
      <ActiveMedicationsSection />

      <Card className="mt-4 gap-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Emergency Contact</Text>
        <Controller
          control={control}
          name="emergencyContactName"
          render={({ field }) => <TextField label="Contact name" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <TextField label="Contact phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
          )}
        />
      </Card>

      {savedMessage ? <Text className="mt-3 text-center text-sm text-primary-700">{savedMessage}</Text> : null}

      <Button label="Save Changes" className="mt-5" onPress={onSave} loading={updateProfile.isPending} />

      <Pressable onPress={handleLogout} className="mt-6 flex-row items-center justify-center gap-2 py-3">
        <LogOut size={18} color="#dc2626" />
        <Text className="font-semibold text-red-600">Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function ConditionsSection() {
  const { profile } = useAuth();
  const { data: catalog } = useDiseasesCatalog();
  const { data: mine } = useMyDiseases();
  const toggle = useToggleDisease();
  const mineIds = new Set((mine ?? []).map((m) => m.disease_id));

  return (
    <Card className="mt-4 gap-3">
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Medical Conditions</Text>
      <View className="flex-row flex-wrap gap-2">
        {(catalog ?? []).map((disease) => {
          const active = mineIds.has(disease.id);
          return (
            <Pressable
              key={disease.id}
              disabled={!profile}
              onPress={() => toggle.mutate({ patientId: profile!.id, diseaseId: disease.id, add: !active })}
              className={`rounded-full border px-3 py-1.5 ${active ? "border-primary-600 bg-primary-600" : "border-slate-300 bg-white"}`}
            >
              <Text className={`text-xs font-medium ${active ? "text-white" : "text-slate-600"}`}>{disease.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function AllergiesSection() {
  const { profile } = useAuth();
  const { data: catalog } = useAllergiesCatalog();
  const { data: mine } = useMyAllergies();
  const toggle = useToggleAllergy();
  const mineIds = new Set((mine ?? []).map((m) => m.allergy_id));

  return (
    <Card className="mt-4 gap-3">
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Allergies</Text>
      <View className="flex-row flex-wrap gap-2">
        {(catalog ?? []).map((allergy) => {
          const active = mineIds.has(allergy.id);
          return (
            <Pressable
              key={allergy.id}
              disabled={!profile}
              onPress={() => toggle.mutate({ patientId: profile!.id, allergyId: allergy.id, add: !active })}
              className={`rounded-full border px-3 py-1.5 ${active ? "border-red-500 bg-red-500" : "border-slate-300 bg-white"}`}
            >
              <Text className={`text-xs font-medium ${active ? "text-white" : "text-slate-600"}`}>{allergy.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function ActiveMedicationsSection() {
  const { medications, addMedication, removeMedication } = useActiveMedications();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  function handleAdd() {
    if (!name.trim()) return;
    addMedication(name, dosage, frequency);
    setName("");
    setDosage("");
    setFrequency("");
    setShowAdd(false);
  }

  return (
    <Card className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">Active Medications</Text>
        <Pressable onPress={() => setShowAdd(!showAdd)}>
          <Text className="text-xs font-semibold text-primary-700">{showAdd ? "Cancel" : "+ Add Medication"}</Text>
        </Pressable>
      </View>

      {showAdd && (
        <View className="gap-2.5 rounded-xl bg-slate-50 p-3">
          <TextField label="Medication Name" placeholder="e.g. Lisinopril" value={name} onChangeText={setName} />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextField label="Dosage" placeholder="10 mg" value={dosage} onChangeText={setDosage} />
            </View>
            <View className="flex-1">
              <TextField label="Frequency" placeholder="Daily" value={frequency} onChangeText={setFrequency} />
            </View>
          </View>
          <Button label="Save Medication" className="mt-2" onPress={handleAdd} />
        </View>
      )}

      <View className="gap-2">
        {medications.length === 0 ? (
          <Text className="text-xs text-slate-400">No active medications added yet.</Text>
        ) : (
          medications.map((m) => (
            <View key={m.id} className="flex-row items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-bold text-slate-800">{m.name}</Text>
                <Text className="text-xs text-slate-500">
                  {m.dosage} · {m.frequency}
                </Text>
              </View>
              <Pressable onPress={() => removeMedication(m.id)} className="rounded-md bg-red-50 px-2 py-1">
                <Text className="text-xs font-semibold text-red-600">Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}
