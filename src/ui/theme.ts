export const TOKENS = {
  background: "#0F0F10",
  surface: "#171718",
  elevated: "#222224",
  divider: "#2E2E31",
  primaryAccent: "#D97706",
  secondaryAccent: "#F59E0B",
  xpHighlight: "#FACC15",
  textPrimary: "#F5F5F4",
  textSecondary: "#B8B8B5",
  disabled: "#6B7280",
} as const;

export const COLORS = {
  bg: TOKENS.background,
  card: TOKENS.surface,
  cardSoft: TOKENS.elevated,
  text: TOKENS.textPrimary,
  muted: TOKENS.textSecondary,
  accent: TOKENS.primaryAccent,
  accentAlt: TOKENS.secondaryAccent,
  xp: TOKENS.xpHighlight,
  divider: TOKENS.divider,
  danger: "#C2410C",
  disabled: TOKENS.disabled,
} as const;
