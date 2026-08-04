import type { DoctorAvailability, TimeSlot } from "../types/models";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Generates bookable time slots for a doctor on a specific calendar date,
 * from their weekly availability row, marking ones already taken.
 *
 * `date` should be a local Date representing the calendar day only (time of
 * day is ignored). `bookedIsoTimes` are appointment `scheduled_datetime`
 * values already booked for that doctor on that day.
 */
export function generateTimeSlots(
  availability: DoctorAvailability | undefined,
  date: Date,
  bookedIsoTimes: string[] = [],
): TimeSlot[] {
  if (!availability) return [];

  const duration = availability.appointment_duration_minutes;
  const startMin = toMinutes(availability.start_time);
  const endMin = toMinutes(availability.end_time);
  const breakStartMin = availability.break_start ? toMinutes(availability.break_start) : null;
  const breakEndMin = availability.break_end ? toMinutes(availability.break_end) : null;

  const bookedSet = new Set(
    bookedIsoTimes.map((iso) => {
      const d = new Date(iso);
      return `${d.getHours()}:${d.getMinutes()}`;
    }),
  );

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: TimeSlot[] = [];
  for (let minutes = startMin; minutes + duration <= endMin; minutes += duration) {
    if (breakStartMin != null && breakEndMin != null && minutes >= breakStartMin && minutes < breakEndMin) {
      continue;
    }
    if (isToday && minutes <= nowMinutes) continue;

    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const slotDate = new Date(date);
    slotDate.setHours(hour, minute, 0, 0);

    slots.push({
      startsAt: slotDate.toISOString(),
      label: formatLabel(hour, minute),
      isBooked: bookedSet.has(`${hour}:${minute}`),
    });
  }

  return slots;
}
