export const APP_SCHEME = "sportingethos";

// Weekday index convention used throughout the app and the database
// (doctor_availability.weekday): 0 = Sunday ... 6 = Saturday, matching
// JavaScript's Date#getDay().
export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
