// Single source of truth for brand colors — Minimal Ivory & Lavender palette.
export const primary = {
  50: "#FAF5FF",
  100: "#F3E8FF",
  200: "#E9D5FF",
  300: "#D8B4FE",
  400: "#C084FC",
  500: "#A855F7",
  600: "#8B5CF6",
  700: "#7C3AED",
  800: "#6D28D9",
  900: "#5B21B6",
} as const;

export const ivory = {
  50: "#FAF8F5",
  100: "#F5F0E8",
  200: "#EAE2D5",
  300: "#DDD3C1",
  800: "#332E27",
  900: "#231F19",
} as const;

export const neutral = {
  50: "#FAF8F5",
  100: "#F5F0E8",
  200: "#EAE2D5",
  300: "#DDD3C1",
  400: "#A78BFA",
  500: "#8B5CF6",
  600: "#7C3AED",
  700: "#5B21B6",
  800: "#3B1C66",
  900: "#2E1C40",
} as const;

export const semantic = {
  success: "#8B5CF6",
  warning: "#A855F7",
  danger: "#5B21B6",
  info: "#7C3AED",
} as const;

export const priorityColors: Record<"normal" | "urgent" | "emergency", string> = {
  normal: "#8B5CF6",
  urgent: "#7C3AED",
  emergency: "#5B21B6",
};

export const statusColors: Record<string, string> = {
  requested: "#A78BFA",
  confirmed: "#7C3AED",
  checked_in: "#8B5CF6",
  in_consult: "#5B21B6",
  completed: "#6D28D9",
  cancelled: "#C084FC",
  no_show: "#3B1C66",
};
