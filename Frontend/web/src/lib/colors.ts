export const COLORS = {
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  secondary: "#10B981",
  secondaryHover: "#059669",
  danger: "#DC2626",
  warning: "#F59E0B",
  info: "#0EA5E9",
  success: "#16A34A",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  background: "#F9FAFB",
  surface: "#FFFFFF"
} as const;

export type ColorName = keyof typeof COLORS;
