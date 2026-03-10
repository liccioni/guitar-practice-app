import type { CreateDrillInput } from "../exercises/types";

export type GuitarLevel = "beginner" | "intermediate" | "expert";
export type PracticeDurationMinutes = 20 | 30 | 60;
export type PracticeFocus = "technique" | "rhythm" | "fretboard" | "improv";
export type PracticeOutcome = "consistency" | "speed" | "song-prep";
export type WeeklyFrequencyDays = 3 | 5 | 7;
export type PracticePreference = "structured" | "balanced" | "exploratory";
export const ONBOARDING_RECOMMENDATION_VERSION = "v2";

export interface PracticeOnboardingAnswers {
  level: GuitarLevel;
  durationMinutes: PracticeDurationMinutes;
  focus: PracticeFocus;
  outcome: PracticeOutcome;
  weeklyFrequencyDays: WeeklyFrequencyDays;
  practicePreference: PracticePreference;
}

export interface PracticeOnboardingState {
  completed: boolean;
  answers?: PracticeOnboardingAnswers;
  lastSuggestedTemplateName?: string;
  onboardingCompletedAt?: string;
  recommendationVersion?: string;
}

export interface PracticeOnboardingSuggestion {
  sessionName: string;
  summary: string;
  recommendedMinutes: number;
  targetTags: string[];
  drillCount: number;
}

export const DEFAULT_PRACTICE_ONBOARDING_STATE: PracticeOnboardingState = {
  completed: false,
};

const FOCUS_TAGS: Record<PracticeFocus, string[]> = {
  technique: ["technique", "warmup"],
  rhythm: ["rhythm", "chords"],
  fretboard: ["scales", "technique"],
  improv: ["scales", "rhythm"],
};

const OUTCOME_TAGS: Record<PracticeOutcome, string[]> = {
  consistency: ["warmup", "rhythm"],
  speed: ["technique", "scales"],
  "song-prep": ["chords", "rhythm"],
};

const LEVEL_NAME: Record<GuitarLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};

export function buildPracticeOnboardingSuggestion(
  answers: PracticeOnboardingAnswers,
): PracticeOnboardingSuggestion {
  const targetTags = Array.from(new Set([...FOCUS_TAGS[answers.focus], ...OUTCOME_TAGS[answers.outcome]]));
  const frequencyBonus = answers.weeklyFrequencyDays === 7 ? 1 : answers.weeklyFrequencyDays === 5 ? 0 : -1;
  const baseDrillCount = answers.durationMinutes === 20 ? 3 : answers.durationMinutes === 30 ? 4 : 6;
  const preferenceDrillDelta = answers.practicePreference === "exploratory" ? 1 : 0;
  const drillCount = Math.max(3, baseDrillCount + frequencyBonus + preferenceDrillDelta);
  const levelOffset = answers.level === "expert" ? 8 : answers.level === "intermediate" ? 4 : 0;
  const preferenceMinutesOffset = answers.practicePreference === "structured" ? 0 : 5;
  const recommendedMinutes = answers.durationMinutes + levelOffset + preferenceMinutesOffset;
  const styleLine =
    answers.practicePreference === "structured"
      ? "structured progression"
      : answers.practicePreference === "balanced"
        ? "balanced progression"
        : "exploratory progression";

  return {
    sessionName: `${LEVEL_NAME[answers.level]} ${answers.focus} ${answers.durationMinutes}m`,
    summary: `Start with ${drillCount} drills for ${styleLine} in ${answers.focus}, targeting ${answers.outcome}.`,
    recommendedMinutes,
    targetTags,
    drillCount,
  };
}

function hasAnyTag(drill: CreateDrillInput, tags: string[]): boolean {
  return (drill.tags ?? []).some((tag) => tags.includes(tag));
}

export function selectSuggestedDrills(
  pool: CreateDrillInput[],
  suggestion: PracticeOnboardingSuggestion,
): CreateDrillInput[] {
  const prioritized = pool.filter((drill) => hasAnyTag(drill, suggestion.targetTags));
  const fallback = pool.filter((drill) => !hasAnyTag(drill, suggestion.targetTags));
  const merged = [...prioritized, ...fallback];

  const unique: CreateDrillInput[] = [];
  const seenNames = new Set<string>();
  for (const drill of merged) {
    if (seenNames.has(drill.name)) continue;
    unique.push(drill);
    seenNames.add(drill.name);
    if (unique.length >= suggestion.drillCount) break;
  }

  return unique;
}
