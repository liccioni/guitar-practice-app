export type FeatureFlagId =
  | "session_overview"
  | "drill_complete_transition"
  | "drill_transition_audio_cues"
  | "dashboard_feedback_loops"
  | "xp_visibility"
  | "progress_signal_refresh"
  | "dashboard_goal_reminder_card"
  | "pricing_screen"
  | "contextual_paywalls"
  | "locked_premium_states"
  | "drag_reorder_builder"
  | "compact_builder_editor"
  | "onboarding_handoff_v2";

export type FeatureFlags = Record<FeatureFlagId, boolean>;

export interface FeatureFlagDefinition {
  id: FeatureFlagId;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const FEATURE_FLAG_DEFINITIONS: readonly FeatureFlagDefinition[] = [
  {
    id: "session_overview",
    label: "Session Overview",
    description: "Routes Builder into the pre-session overview before active practice starts.",
    defaultEnabled: true,
  },
  {
    id: "drill_complete_transition",
    label: "Drill Complete Transition",
    description: "Shows the between-drill preparation state instead of advancing immediately.",
    defaultEnabled: true,
  },
  {
    id: "drill_transition_audio_cues",
    label: "Drill Transition Audio Cues",
    description: "Plays chime or spoken anticipation cues during drill transitions.",
    defaultEnabled: true,
  },
  {
    id: "dashboard_feedback_loops",
    label: "Dashboard Feedback Loops",
    description: "Shows goal and streak coaching on the home dashboard.",
    defaultEnabled: true,
  },
  {
    id: "xp_visibility",
    label: "XP Visibility",
    description: "Shows XP progress across home, practice, and completion surfaces.",
    defaultEnabled: true,
  },
  {
    id: "progress_signal_refresh",
    label: "Progress Signal Refresh",
    description: "Uses the newer progress signal and milestone framing in Progress.",
    defaultEnabled: true,
  },
  {
    id: "dashboard_goal_reminder_card",
    label: "Dashboard Goal Reminder Card",
    description: "Shows the visible dashboard card for goals and reminders.",
    defaultEnabled: true,
  },
  {
    id: "pricing_screen",
    label: "Pricing Screen",
    description: "Enables the dedicated pricing route and direct pricing entry points.",
    defaultEnabled: true,
  },
  {
    id: "contextual_paywalls",
    label: "Contextual Paywalls",
    description: "Shows upgrade prompts at high-intent product moments.",
    defaultEnabled: true,
  },
  {
    id: "locked_premium_states",
    label: "Locked Premium States",
    description: "Shows locked-state cards for premium-only surfaces and actions.",
    defaultEnabled: true,
  },
  {
    id: "drag_reorder_builder",
    label: "Drag Reorder Builder",
    description: "Uses drag handles instead of arrow nudges in the builder drill list.",
    defaultEnabled: true,
  },
  {
    id: "compact_builder_editor",
    label: "Compact Builder Editor",
    description: "Uses the condensed builder editor layout for secondary drill settings.",
    defaultEnabled: true,
  },
  {
    id: "onboarding_handoff_v2",
    label: "Onboarding Handoff V2",
    description: "Sends onboarding recommendations into the overview flow instead of a looser handoff.",
    defaultEnabled: true,
  },
] as const;

const BASELINE_FEATURE_FLAGS: FeatureFlags = FEATURE_FLAG_DEFINITIONS.reduce(
  (flags, definition) => {
    flags[definition.id] = definition.defaultEnabled;
    return flags;
  },
  {} as FeatureFlags,
);

export const LAUNCH_CANDIDATE_FEATURE_FLAGS: FeatureFlags = {
  ...BASELINE_FEATURE_FLAGS,
  session_overview: true,
  drill_complete_transition: true,
  drill_transition_audio_cues: false,
  dashboard_feedback_loops: true,
  xp_visibility: true,
  progress_signal_refresh: false,
  dashboard_goal_reminder_card: false,
  pricing_screen: false,
  contextual_paywalls: false,
  locked_premium_states: false,
  drag_reorder_builder: false,
  compact_builder_editor: false,
  onboarding_handoff_v2: false,
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = LAUNCH_CANDIDATE_FEATURE_FLAGS;

const RUNTIME_FEATURE_FLAG_OVERRIDES: Partial<FeatureFlags> = {
  ...LAUNCH_CANDIDATE_FEATURE_FLAGS,
};

export function normalizeFeatureFlags(input: unknown): FeatureFlags {
  const normalized = { ...DEFAULT_FEATURE_FLAGS };
  if (!isPlainObject(input)) return applyRuntimeFeatureFlagOverrides(normalized);

  for (const definition of FEATURE_FLAG_DEFINITIONS) {
    const rawValue = input[definition.id];
    normalized[definition.id] =
      typeof rawValue === "boolean" ? rawValue : definition.defaultEnabled;
  }

  return applyRuntimeFeatureFlagOverrides(normalized);
}

export function isFeatureFlagEnabled(
  featureFlags: FeatureFlags,
  featureFlagId: FeatureFlagId,
): boolean {
  return applyRuntimeFeatureFlagOverrides(featureFlags)[featureFlagId];
}

function applyRuntimeFeatureFlagOverrides(featureFlags: FeatureFlags): FeatureFlags {
  return {
    ...featureFlags,
    ...RUNTIME_FEATURE_FLAG_OVERRIDES,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
