import { createDrillFromInput } from "../domain/exercises/drill";
import type { CreateDrillInput } from "../domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalType } from "../domain/goals/types";
import {
  DEFAULT_PRACTICE_ONBOARDING_STATE,
  type PracticeOnboardingState,
} from "../domain/profile/onboarding";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
} from "../domain/sessions/sessionTemplate";
import type { PersistedPracticeState } from "../persistence/LocalStorageGateway";

export interface Badge {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

interface BadgeDefinition {
  id: string;
  label: string;
  icon: string;
}

export const DRILL_POOL: CreateDrillInput[] = [
  { name: "Chromatic Warmup", durationMinutes: 4, targetBpm: 90, tags: ["warmup"] },
  { name: "Major Scale Ladder", durationMinutes: 6, targetBpm: 100, tags: ["scales"] },
  { name: "Chord Change Sprint", durationMinutes: 5, targetBpm: 80, tags: ["chords"] },
  { name: "Alternate Picking Burst", durationMinutes: 5, targetBpm: 120, tags: ["technique"] },
  { name: "Pentatonic Run", durationMinutes: 5, targetBpm: 110, tags: ["scales"] },
  { name: "Rhythm Pocket", durationMinutes: 4, targetBpm: 95, tags: ["rhythm"] },
  { name: "Arpeggio Climb", durationMinutes: 6, targetBpm: 105, tags: ["technique"] },
  { name: "Legato Builder", durationMinutes: 5, targetBpm: 100, tags: ["technique"] },
];

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "b1", label: "7-Day Streak", icon: "🔥" },
  { id: "b2", label: "Rhythm Keeper", icon: "🎵" },
  { id: "b3", label: "XP Hunter", icon: "⚡" },
  { id: "b4", label: "Session Beast", icon: "🏆" },
];

export const DEFAULT_PROFILE: {
  totalXp: number;
  unlockedBadgeIds: string[];
  onboarding: PracticeOnboardingState;
} = {
  totalXp: 0,
  unlockedBadgeIds: [],
  onboarding: DEFAULT_PRACTICE_ONBOARDING_STATE,
};

const GOAL_TARGET_BOUNDS: Record<GoalType, [number, number]> = {
  minutes: [5, 300],
  sessions: [1, 20],
  drills: [1, 60],
};

export function getDefaultGoalTarget(goalType: GoalType, dailyMinutesTarget: number): number {
  if (goalType === "minutes") return dailyMinutesTarget;
  if (goalType === "sessions") return 1;
  return 4;
}

export function normalizeGoalTarget(
  goalType: GoalType,
  target: number,
  dailyMinutesTarget: number,
): number {
  const [min, max] = GOAL_TARGET_BOUNDS[goalType];
  const fallback = getDefaultGoalTarget(goalType, dailyMinutesTarget);
  if (!Number.isFinite(target)) return fallback;
  return Math.min(max, Math.max(min, Math.round(target)));
}

export function buildBadgeState(unlockedBadgeIds: string[]): Badge[] {
  const unlocked = new Set(unlockedBadgeIds);
  return BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    unlocked: unlocked.has(badge.id),
  }));
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSeedState(nowIso: string): PersistedPracticeState {
  const drills = DRILL_POOL.slice(0, 4).map((input, idx) =>
    createDrillFromInput(`seed_drill_${idx + 1}`, input, nowIso),
  );

  const starterTemplate = createSessionTemplate({
    id: "template_starter",
    name: "Daily Core Session",
    drillIds: drills.map((drill) => drill.id),
    totalDurationSeconds: calculateTotalDurationSeconds(drills),
    nowIso,
  });

  return {
    drills,
    templates: [starterTemplate],
    history: [],
    goalSettings: DEFAULT_GOAL_SETTINGS,
    profile: DEFAULT_PROFILE,
  };
}
