export const TOKENS = {
  background: "#110d09",
  surface: "#1a130d",
  elevated: "#241b13",
  divider: "#3d2d1f",
  primaryAccent: "#e67e00",
  secondaryAccent: "#f59e0b",
  xpHighlight: "#facc15",
  textPrimary: "#f7f3ee",
  textSecondary: "#b8afa4",
  disabled: "#736c64",
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

export const RADII = {
  card: 20,
  chip: 14,
  pill: 999,
} as const;

export const SPACING = {
  pageX: 20,
  sectionGap: 16,
  cardPadding: 18,
} as const;
