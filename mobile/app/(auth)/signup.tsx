import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Calendar as CalendarIcon, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react-native";

import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { VoiceTextField } from "../../components/ui/VoiceTextField";
import { CalendarPickerModal } from "../../components/ui/CalendarPickerModal";
import { KeyboardScreen } from "../../components/ui/KeyboardScreen";
import Logo from "../../components/Logo";
import { useSignUp } from "../../features/auth/useAuth";
import { updateMyProfile } from "../../services/profile.service";
import { BLOOD_GROUPS } from "../../constants/config";

interface OnboardingFormValues {
  // Step 1: Account
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2: Demographics & Medical
  phone: string;
  gender: "male" | "female" | "other" | "";
  dateOfBirth: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  allergies: string;
  medications: string;
  onboardingMedications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Step 3: Consent
  medicalConsent: boolean;
  termsAccepted: boolean;
}

export default function SignupOnboardingScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const signUp = useSignUp();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      gender: "male",
      dateOfBirth: "",
      bloodGroup: "O+",
      heightCm: "",
      weightKg: "",
      allergies: "",
      medications: "",
      onboardingMedications: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      medicalConsent: false,
      termsAccepted: false,
    },
  });

  const values = watch();

  function validateStep1() {
    setFormError("");
    if (!values.fullName.trim() || values.fullName.length < 2) {
      setFormError("Please enter your full name.");
      return false;
    }
    if (!values.email.trim() || !values.email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return false;
    }
    if (!values.password || values.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return false;
    }
    if (values.password !== values.confirmPassword) {
      setFormError("Passwords do not match.");
      return false;
    }
    setStep(2);
    return true;
  }

  function validateStep2() {
    setFormError("");
    setStep(3);
    return true;
  }

  const onSubmit = handleSubmit(async (data) => {
    setFormError("");
    if (!data.medicalConsent || !data.termsAccepted) {
      setFormError("Please accept the medical data consent and terms to complete onboarding.");
      return;
    }

    try {
      const result = await signUp.mutateAsync({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });

      // Save demographic info to user profile if session active
      if (result.session) {
        try {
          await updateMyProfile({
            full_name: data.fullName,
            phone: data.phone || null,
            gender: data.gender ? (data.gender as "male" | "female" | "other") : null,
            date_of_birth: data.dateOfBirth || null,
            blood_group: data.bloodGroup ? (data.bloodGroup as "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-") : null,
            height_cm: data.heightCm ? Number(data.heightCm) : null,
            weight_kg: data.weightKg ? Number(data.weightKg) : null,
            emergency_contact_name: data.emergencyContactName || null,
            emergency_contact_phone: data.emergencyContactPhone || null,
          });
        } catch (e) {
          console.warn("Could not save demographics during onboarding", e);
        }
        router.replace("/(tabs)");
      } else {
        setConfirmationSent(true);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create your account. Please try again.");
    }
  });

  if (confirmationSent) {
    return (
      <KeyboardScreen>
        <View className="items-center">
          <Logo size={56} />
          <Text className="mt-4 text-center text-2xl font-bold text-slate-900">Check your email</Text>
          <Text className="mt-2 text-center text-slate-500">
            We sent a confirmation link to finish creating your account. Once confirmed, sign in below.
          </Text>
          <Link href="/(auth)/login" replace className="mt-6 font-semibold text-primary-700">
            Back to sign in
          </Link>
        </View>
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen>
      <View className="items-center">
        <Logo size={48} />
        <Text className="mt-3 text-2xl font-bold text-slate-900">Patient Onboarding</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Step {step} of 3 — {step === 1 ? "Account Setup" : step === 2 ? "Demographic & Medical Info" : "Medical Consent & Terms"}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="mt-4 flex-row gap-2">
        <View className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary-600" : "bg-slate-200"}`} />
        <View className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary-600" : "bg-slate-200"}`} />
        <View className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-primary-600" : "bg-slate-200"}`} />
      </View>

      {/* Step 1: Credentials */}
      {step === 1 && (
        <View className="mt-6 gap-3.5">
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField label="Full name *" placeholder="Jane Doe" value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label="Email address *"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField label="Password *" placeholder="At least 6 characters" secureTextEntry value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <TextField label="Confirm password *" placeholder="Re-enter password" secureTextEntry value={field.value} onChangeText={field.onChange} />
            )}
          />

          {formError ? <Text className="text-sm font-medium text-red-600">{formError}</Text> : null}
          <Button label="Continue to Demographics" onPress={validateStep1} />
        </View>
      )}

      {/* Step 2: Demographics & Medical Info */}
      {step === 2 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="mt-4">
          <View className="gap-3.5 pb-8">
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <TextField label="Phone Number" placeholder="+1 (555) 000-0000" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
              )}
            />

            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Gender</Text>
              <View className="flex-row gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setValue("gender", g)}
                    className={`flex-1 items-center rounded-xl border py-2.5 ${values.gender === g ? "border-primary-600 bg-primary-50" : "border-slate-300"}`}
                  >
                    <Text className={`text-sm font-semibold capitalize ${values.gender === g ? "text-primary-700" : "text-slate-600"}`}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date of Birth Pop-out Calendar Picker */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Date of Birth</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3.5"
              >
                <Text className={`text-base ${values.dateOfBirth ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                  {values.dateOfBirth ? values.dateOfBirth : "Select DOB from calendar"}
                </Text>
                <CalendarIcon size={20} color="#059669" />
              </Pressable>
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Blood Group</Text>
              <View className="flex-row flex-wrap gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <Pressable
                    key={bg}
                    onPress={() => setValue("bloodGroup", bg)}
                    className={`rounded-lg border px-3 py-2 ${values.bloodGroup === bg ? "border-primary-600 bg-primary-50" : "border-slate-300 bg-white"}`}
                  >
                    <Text className={`text-xs font-bold ${values.bloodGroup === bg ? "text-primary-700" : "text-slate-600"}`}>{bg}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="heightCm"
                  render={({ field }) => <TextField label="Height (cm)" keyboardType="decimal-pad" placeholder="175" value={field.value} onChangeText={field.onChange} />}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="weightKg"
                  render={({ field }) => <TextField label="Weight (kg)" keyboardType="decimal-pad" placeholder="70" value={field.value} onChangeText={field.onChange} />}
                />
              </View>
            </View>

            {/* Allergies with Voice/Mic */}
            <Controller
              control={control}
              name="allergies"
              render={({ field }) => (
                <VoiceTextField
                  label="Allergies (Tap 🎙️ for voice input)"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />

            {/* Current Medications with Voice/Mic */}
            <Controller
              control={control}
              name="medications"
              render={({ field }) => (
                <VoiceTextField
                  label="Current Medications (Tap 🎙️ for voice input)"
                  placeholder="e.g. Lisinopril 10mg"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />

            {/* Medications to be taken during onboarding */}
            <Controller
              control={control}
              name="onboardingMedications"
              render={({ field }) => (
                <VoiceTextField
                  label="Medications during onboarding (Tap 🎙️ for voice input)"
                  placeholder="e.g. Paracetamol prior to triage"
                  multiline
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="emergencyContactName"
              render={({ field }) => <TextField label="Emergency Contact Name" placeholder="Contact person" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={control}
              name="emergencyContactPhone"
              render={({ field }) => <TextField label="Emergency Contact Phone" placeholder="Phone number" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />}
            />

            {formError ? <Text className="text-sm font-medium text-red-600">{formError}</Text> : null}

            <View className="flex-row gap-2 pt-2">
              <Button label="Back" variant="ghost" className="flex-1" onPress={() => setStep(1)} />
              <Button label="Continue to Consent" className="flex-2" onPress={validateStep2} />
            </View>
          </View>
        </ScrollView>
      )}

      {/* Step 3: Consent */}
      {step === 3 && (
        <View className="mt-5 gap-4">
          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={24} color="#047857" />
              <Text className="text-base font-bold text-slate-900">Medical Data Privacy & Consent</Text>
            </View>
            <Text className="mt-2 text-xs leading-relaxed text-slate-600">
              Sporting Ethos requires your consent to securely store and process your demographic, medical history, and clinical check-in records for care management, appointment booking, and doctor consultations.
            </Text>
          </View>

          <Pressable
            onPress={() => setValue("medicalConsent", !values.medicalConsent)}
            className="flex-row items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <View className={`h-6 w-6 rounded-md border items-center justify-center ${values.medicalConsent ? "border-primary-600 bg-primary-600" : "border-slate-300"}`}>
              {values.medicalConsent && <CheckCircle2 size={16} color="#ffffff" />}
            </View>
            <Text className="flex-1 text-xs text-slate-700">
              <Text className="font-semibold text-slate-900">Medical Data Consent: </Text>
              I consent to Sporting Ethos recording and storing my health summary, demographic data, and consultation records.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setValue("termsAccepted", !values.termsAccepted)}
            className="flex-row items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <View className={`h-6 w-6 rounded-md border items-center justify-center ${values.termsAccepted ? "border-primary-600 bg-primary-600" : "border-slate-300"}`}>
              {values.termsAccepted && <CheckCircle2 size={16} color="#ffffff" />}
            </View>
            <Text className="flex-1 text-xs text-slate-700">
              <Text className="font-semibold text-slate-900">Terms of Service: </Text>
              I agree to the Sporting Ethos Patient Terms of Service and Privacy Policy.
            </Text>
          </Pressable>

          {formError ? <Text className="text-sm font-medium text-red-600">{formError}</Text> : null}

          <View className="flex-row gap-2 pt-2">
            <Button label="Back" variant="ghost" className="flex-1" onPress={() => setStep(2)} />
            <Button label="Complete Registration" className="flex-2" onPress={onSubmit} loading={signUp.isPending} />
          </View>
        </View>
      )}

      <View className="mt-6 flex-row justify-center">
        <Text className="text-slate-500">Already have an account? </Text>
        <Link href="/(auth)/login" className="font-semibold text-primary-700">
          Sign in
        </Link>
      </View>

      {/* DOB Calendar Picker Modal */}
      <CalendarPickerModal
        visible={showDatePicker}
        value={values.dateOfBirth}
        onSelect={(d) => setValue("dateOfBirth", d)}
        onClose={() => setShowDatePicker(false)}
      />
    </KeyboardScreen>
  );
}
