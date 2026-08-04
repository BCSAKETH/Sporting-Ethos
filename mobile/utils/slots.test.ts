import { generateTimeSlots } from "./slots";
import type { DoctorAvailability } from "../types/models";

function availability(overrides: Partial<DoctorAvailability> = {}): DoctorAvailability {
  return {
    id: "avail-1",
    doctor_id: "doctor-1",
    weekday: 1,
    start_time: "09:00:00",
    end_time: "17:00:00",
    break_start: "13:00:00",
    break_end: "14:00:00",
    appointment_duration_minutes: 60,
    max_patients: 20,
    is_available: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// A fixed future date avoids the "hide past slots" branch (which only
// applies when the target date is today) so these stay deterministic
// regardless of when the suite runs.
const FUTURE_DATE = new Date("2099-06-15T00:00:00");

describe("generateTimeSlots", () => {
  it("returns an empty array when there is no availability for the day", () => {
    expect(generateTimeSlots(undefined, FUTURE_DATE)).toEqual([]);
  });

  it("steps by the configured appointment duration", () => {
    const slots = generateTimeSlots(
      availability({ start_time: "09:00:00", end_time: "10:00:00", break_start: null, break_end: null, appointment_duration_minutes: 15 }),
      FUTURE_DATE,
    );
    expect(slots.map((s) => s.label)).toEqual(["9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM"]);
  });

  it("excludes the break window", () => {
    const slots = generateTimeSlots(availability(), FUTURE_DATE);
    expect(slots.map((s) => s.label)).toEqual([
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
    ]);
  });

  it("marks slots that already have a booked appointment", () => {
    const bookedSlot = new Date(FUTURE_DATE);
    bookedSlot.setHours(11, 0, 0, 0);

    const slots = generateTimeSlots(availability(), FUTURE_DATE, [bookedSlot.toISOString()]);
    const booked = slots.filter((s) => s.isBooked);
    expect(booked).toHaveLength(1);
    expect(booked[0].label).toBe("11:00 AM");
  });

  it("hides slots earlier than the current time when booking for today", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T11:30:00"));
    const today = new Date("2026-03-10T00:00:00");

    const slots = generateTimeSlots(availability(), today);

    expect(slots.map((s) => s.label)).toEqual(["12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]);
    jest.useRealTimers();
  });
});
