import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react-native";

interface CalendarPickerModalProps {
  visible: boolean;
  value?: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarPickerModal({ visible, value, onSelect, onClose }: CalendarPickerModalProps) {
  const initial = value ? new Date(value) : new Date(1995, 0, 1);
  const [year, setYear] = useState(isNaN(initial.getFullYear()) ? 1995 : initial.getFullYear());
  const [month, setMonth] = useState(isNaN(initial.getMonth()) ? 0 : initial.getMonth());
  const [selectedDay, setSelectedDay] = useState(isNaN(initial.getDate()) ? 1 : initial.getDate());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => currentYear - i);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  function handleConfirm() {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(selectedDay).padStart(2, "0");
    onSelect(`${year}-${mm}-${dd}`);
    onClose();
  }

  function handlePrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-purple-950/40">
        <View className="rounded-t-3xl bg-[#FAF8F5] p-5 shadow-2xl border-t border-purple-200/60">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-purple-200/50 pb-3">
            <View className="flex-row items-center gap-2">
              <CalendarIcon size={20} color="#7c3aed" />
              <Text className="text-lg font-bold text-slate-900">Select Date of Birth</Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-purple-100/60 p-1.5">
              <X size={18} color="#6d28d9" />
            </Pressable>
          </View>

          {/* Month / Year header control */}
          <View className="mt-3 flex-row items-center justify-between py-2">
            <Pressable onPress={handlePrevMonth} className="p-2">
              <ChevronLeft size={20} color="#5b21b6" />
            </Pressable>

            <Pressable
              onPress={() => setShowYearPicker(!showYearPicker)}
              className="rounded-xl border border-purple-200 bg-white px-4 py-2"
            >
              <Text className="text-base font-bold text-purple-950">
                {MONTH_NAMES[month]} {year} ▾
              </Text>
            </Pressable>

            <Pressable onPress={handleNextMonth} className="p-2">
              <ChevronRight size={20} color="#5b21b6" />
            </Pressable>
          </View>

          {/* Quick Year Picker list overlay */}
          {showYearPicker ? (
            <View className="my-2 h-52 rounded-xl border border-purple-200 bg-white p-2">
              <ScrollView>
                <View className="flex-row flex-wrap gap-2 p-1">
                  {years.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => {
                        setYear(y);
                        setShowYearPicker(false);
                      }}
                      className={`rounded-lg px-3 py-2 ${year === y ? "bg-purple-600" : "bg-purple-50/60 border border-purple-200"}`}
                    >
                      <Text className={`text-xs font-semibold ${year === y ? "text-white" : "text-purple-900"}`}>{y}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <>
              {/* Day Labels */}
              <View className="mt-2 flex-row justify-between text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <Text key={d} className="w-10 text-center text-xs font-bold text-purple-400">
                    {d}
                  </Text>
                ))}
              </View>

              {/* Day Grid */}
              <View className="mt-1 flex-row flex-wrap">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} className="h-10 w-[14.28%]" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = day === selectedDay;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      className="h-10 w-[14.28%] items-center justify-center p-0.5"
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${
                          isSelected ? "bg-purple-600" : "bg-transparent"
                        }`}
                      >
                        <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View className="mt-4 flex-row gap-3 pt-3 border-t border-purple-200/50">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center rounded-xl border border-purple-200 py-3"
            >
              <Text className="font-semibold text-purple-800">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="flex-1 items-center rounded-xl bg-purple-600 py-3 shadow-md"
            >
              <Text className="font-bold text-white">Select Date</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
