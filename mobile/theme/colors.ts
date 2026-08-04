// Single source of truth for brand colors — mirrored in tailwind.config.js
// `theme.extend.colors.primary` so NativeWind classes (bg-primary-600, ...)
// and plain style objects (native Reanimated values, chart colors, etc.)
// always agree. Emerald matches the existing Sporting Ethos web app.
export const primary = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
} as const;

export const neutral = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
} as const;

export const semantic = {
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
} as const;

export const priorityColors: Record<"normal" | "urgent" | "emergency", string> = {
  normal: neutral[500],
  urgent: semantic.warning,
  emergency: semantic.danger,
};

export const statusColors: Record<string, string> = {
  requested: neutral[500],
  confirmed: semantic.info,
  checked_in: primary[600],
  in_consult: primary[700],
  completed: semantic.success,
  cancelled: neutral[400],
  no_show: semantic.danger,
};
