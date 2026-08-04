import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { LoadingView } from "../../components/ui/LoadingView";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDoctor, useDoctorAvailability } from "../../features/doctors/useDoctors";
import { useBookAppointment, useBookedSlots } from "../../features/appointments/useAppointments";
import { useAuth } from "../../features/auth/useAuth";
import { generateTimeSlots } from "../../utils/slots";
import { bookingSchema, type BookingFormValues } from "../../features/booking/schemas";
import { WEEKDAY_LABELS } from "../../constants/config";

const DAYS_AHEAD = 14;

function buildUpcomingDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function BookingScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const { profile } = useAuth();
  const { data: doctor, isLoading: doctorLoading } = useDoctor(doctorId);
  const { data: availability, isLoading: availabilityLoading } = useDoctorAvailability(doctorId);

  const upcomingDays = useMemo(() => buildUpcomingDays(DAYS_AHEAD), []);
  const availableWeekdays = useMemo(() => new Set((availability ?? []).map((a) => a.weekday)), [availability]);

  const [selectedDate, setSelectedDate] = useState<Date>(
    upcomingDays.find((d) => availableWeekdays.has(d.getDay())) ?? upcomingDays[0],
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const { data: bookedIsoTimes } = useBookedSlots(doctorId, selectedDate);
  const bookAppointment = useBookAppointment();

  const dayAvailability = availability?.find((a) => a.weekday === selectedDate.getDay());
  const slots = useMemo(
    () => generateTimeSlots(dayAvailability, selectedDate, bookedIsoTimes ?? []),
    [dayAvailability, selectedDate, bookedIsoTimes],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({ resolver: zodResolver(bookingSchema), defaultValues: { reasonForVisit: "" } });

  const onConfirm = handleSubmit(async (values) => {
    if (!doctor || !profile || !selectedSlot) {
      setFormError("Pick an available time slot first.");
      return;
    }
    setFormError("");
    try {
      await bookAppointment.mutateAsync({
        patientId: profile.id,
        doctorId: doctor.id,
        departmentId: doctor.department_id,
        hospitalId: doctor.hospital_id,
        scheduledDatetime: selectedSlot,
        reasonForVisit: values.reasonForVisit,
      });
      router.replace("/(tabs)/appointments");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not book this appointment. Please try again.");
    }
  });

  if (doctorLoading || availabilityLoading || !doctor) return <LoadingView />;

  return (
    <ScreenContainer>
      <Card>
        <Text className="text-base font-semibold text-slate-900">
          Dr. {doctor.first_name} {doctor.last_name}
        </Text>
        <Text className="text-sm text-slate-500">
          {doctor.department?.name} · {doctor.consultation_fee ? `₹${doctor.consultation_fee}` : "Fee on visit"}
        </Text>
      </Card>

      <Text className="mb-2 mt-5 text-base font-semibold text-slate-900">1. Choose a date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {upcomingDays.map((day) => {
          const isAvailable = availableWeekdays.has(day.getDay());
          const isSelected = day.toDateString() === selectedDate.toDateString();
          return (
            <Pressable
              key={day.toISOString()}
              disabled={!isAvailable}
              onPress={() => {
                setSelectedDate(day);
                setSelectedSlot(null);
              }}
              className={`w-16 items-center rounded-2xl border py-3 ${isSelected ? "border-primary-600 bg-primary-600" : isAvailable ? "border-slate-300 bg-white" : "border-slate-100 bg-slate-50"}`}
            >
              <Text className={`text-xs font-medium ${isSelected ? "text-primary-100" : isAvailable ? "text-slate-500" : "text-slate-300"}`}>
                {WEEKDAY_LABELS[day.getDay()].slice(0, 3)}
              </Text>
              <Text className={`text-lg font-bold ${isSelected ? "text-white" : isAvailable ? "text-slate-900" : "text-slate-300"}`}>
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-2 mt-5 text-base font-semibold text-slate-900">2. Choose a time</Text>
      {slots.length === 0 ? (
        <EmptyState title="No slots on this day" description="Try a different date." />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot.startsAt;
            return (
              <Pressable
                key={slot.startsAt}
                disabled={slot.isBooked}
                onPress={() => setSelectedSlot(slot.startsAt)}
                className={`rounded-xl border px-4 py-2.5 ${
                  slot.isBooked
                    ? "border-slate-100 bg-slate-50"
                    : isSelected
                      ? "border-primary-600 bg-primary-600"
                      : "border-slate-300 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    slot.isBooked ? "text-slate-300 line-through" : isSelected ? "text-white" : "text-slate-700"
                  }`}
                >
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text className="mb-2 mt-5 text-base font-semibold text-slate-900">3. Reason for visit</Text>
      <Controller
        control={control}
        name="reasonForVisit"
        render={({ field }) => (
          <TextField
            placeholder="e.g. Follow-up for hypertension, annual checkup..."
            multiline
            numberOfLines={3}
            error={errors.reasonForVisit?.message}
            value={field.value}
            onChangeText={field.onChange}
            className="min-h-[88px]"
            textAlignVertical="top"
          />
        )}
      />

      {formError ? <Text className="mt-3 text-sm text-red-600">{formError}</Text> : null}

      <Button
        label="Confirm Booking"
        className="mt-6"
        onPress={onConfirm}
        loading={bookAppointment.isPending}
      />
    </ScreenContainer>
  );
}
