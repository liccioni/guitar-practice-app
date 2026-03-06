import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PracticeHistoryEntry } from "../domain/history/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";
import type { Drill } from "../domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings, type GoalType } from "../domain/goals/types";
import { MAX_DRILL_MINUTES, MIN_DRILL_MINUTES } from "../domain/exercises/drill";
import { isValidBpm } from "../domain/metronome/metronome";

const STORAGE_KEY = "guitar-practice:v1";
export const PERSISTENCE_SCHEMA_VERSION = 3;

export interface PersistedProfileState {
  totalXp: number;
  unlockedBadgeIds: string[];
}

export interface PersistedPracticeState {
  drills: Drill[];
  templates: SessionTemplate[];
  history: PracticeHistoryEntry[];
  goalSettings: GoalSettings;
  profile: PersistedProfileState;
}

const DEFAULT_PROFILE_STATE: PersistedProfileState = {
  totalXp: 0,
  unlockedBadgeIds: [],
};

export const EMPTY_PRACTICE_STATE: PersistedPracticeState = {
  drills: [],
  templates: [],
  history: [],
  goalSettings: DEFAULT_GOAL_SETTINGS,
  profile: DEFAULT_PROFILE_STATE,
};

interface PersistedEnvelope {
  version: number;
  state: PersistedPracticeState;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeDrills(input: unknown): Drill[] {
  if (!Array.isArray(input)) return [];

  const sanitized: Drill[] = [];
  for (const raw of input) {
    if (!isPlainObject(raw)) continue;

    const item = raw;
    const durationSeconds = Number(item.durationSeconds);
    const minSeconds = MIN_DRILL_MINUTES * 60;
    const maxSeconds = MAX_DRILL_MINUTES * 60;
    const targetBpm = Number(item.targetBpm);
    const tags = Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string") : [];

    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
      continue;
    }

    if (!Number.isFinite(durationSeconds) || durationSeconds < minSeconds || durationSeconds > maxSeconds) {
      continue;
    }

    sanitized.push({
      id: item.id,
      name: item.name.trim(),
      description: typeof item.description === "string" ? item.description.trim() || undefined : undefined,
      durationSeconds,
      targetBpm: Number.isFinite(targetBpm) && isValidBpm(targetBpm) ? targetBpm : undefined,
      tags: tags as Drill["tags"],
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
    });
  }

  return sanitized;
}

function sanitizeTemplates(input: unknown, drills: Drill[]): SessionTemplate[] {
  if (!Array.isArray(input)) return [];

  const durationByDrillId = new Map(drills.map((drill) => [drill.id, drill.durationSeconds]));
  return input
    .filter(isPlainObject)
    .map((item) => {
      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
        return null;
      }

      const drillIds = Array.isArray(item.drillIds)
        ? item.drillIds.filter((id): id is string => isNonEmptyString(id) && durationByDrillId.has(id))
        : [];

      const totalDurationSeconds = drillIds.reduce(
        (sum, id) => sum + (durationByDrillId.get(id) ?? 0),
        0,
      );

      return {
        id: item.id,
        name: item.name.trim(),
        drillIds,
        totalDurationSeconds,
        isPreset: Boolean(item.isPreset),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      } satisfies SessionTemplate;
    })
    .filter((item): item is SessionTemplate => item !== null);
}

function sanitizeHistory(input: unknown): PracticeHistoryEntry[] {
  if (!Array.isArray(input)) return [];

  const sanitized: PracticeHistoryEntry[] = [];
  for (const raw of input) {
    if (!isPlainObject(raw)) continue;
    const item = raw;
    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.sessionNameSnapshot)) continue;
    if (!isNonEmptyString(item.startedAt)) continue;
    if (!isFiniteNumber(item.durationCompletedSeconds) || item.durationCompletedSeconds < 0) continue;

    const drillsSnapshot = Array.isArray(item.drillsSnapshot)
      ? item.drillsSnapshot
          .filter(isPlainObject)
          .map((drill) => {
            const durationSeconds = Number(drill.durationSeconds);
            const targetBpm = Number(drill.targetBpm);

            if (!isNonEmptyString(drill.id) || !isNonEmptyString(drill.name)) return null;
            if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

            return {
              id: drill.id,
              name: drill.name.trim(),
              durationSeconds,
              targetBpm: Number.isFinite(targetBpm) && isValidBpm(targetBpm) ? targetBpm : undefined,
            };
          })
          .filter((drill) => drill !== null)
      : [];

    const completedDrillIds = Array.isArray(item.completedDrillIds)
      ? item.completedDrillIds.filter((id): id is string => isNonEmptyString(id))
      : [];

    sanitized.push({
      id: item.id,
      sessionTemplateId: isNonEmptyString(item.sessionTemplateId) ? item.sessionTemplateId : undefined,
      sessionNameSnapshot: item.sessionNameSnapshot.trim(),
      drillsSnapshot,
      completedDrillIds,
      startedAt: item.startedAt,
      endedAt: isNonEmptyString(item.endedAt) ? item.endedAt : undefined,
      durationCompletedSeconds: item.durationCompletedSeconds,
      completed: Boolean(item.completed),
    });
  }

  return sanitized;
}

function sanitizeGoalSettings(input: unknown): GoalSettings {
  if (!isPlainObject(input)) return DEFAULT_GOAL_SETTINGS;

  const dailyMinutesTarget = Number(input.dailyMinutesTarget);
  const goalTypeRaw = input.goalType;
  const goalType: GoalType =
    goalTypeRaw === "minutes" || goalTypeRaw === "sessions" || goalTypeRaw === "drills"
      ? goalTypeRaw
      : DEFAULT_GOAL_SETTINGS.goalType ?? "minutes";
  const goalTargetRaw = Number(input.goalTarget);
  const defaultTargetByType: Record<GoalType, number> = {
    minutes: DEFAULT_GOAL_SETTINGS.goalTarget ?? DEFAULT_GOAL_SETTINGS.dailyMinutesTarget,
    sessions: 1,
    drills: 4,
  };
  const targetBoundsByType: Record<GoalType, [number, number]> = {
    minutes: [5, 300],
    sessions: [1, 20],
    drills: [1, 60],
  };
  const [targetMin, targetMax] = targetBoundsByType[goalType];
  const normalizedGoalTarget =
    Number.isFinite(goalTargetRaw) && goalTargetRaw >= targetMin && goalTargetRaw <= targetMax
      ? Math.round(goalTargetRaw)
      : defaultTargetByType[goalType];
  const reminderEnabled = Boolean(input.reminderEnabled);
  const reminderTime = typeof input.reminderTime === "string" ? input.reminderTime : DEFAULT_GOAL_SETTINGS.reminderTime;

  return {
    dailyMinutesTarget:
      Number.isFinite(dailyMinutesTarget) && dailyMinutesTarget >= 5 && dailyMinutesTarget <= 300
        ? Math.round(dailyMinutesTarget)
        : DEFAULT_GOAL_SETTINGS.dailyMinutesTarget,
    goalType,
    goalTarget: normalizedGoalTarget,
    reminderEnabled,
    reminderTime: /^\d{2}:\d{2}$/.test(reminderTime) ? reminderTime : DEFAULT_GOAL_SETTINGS.reminderTime,
  };
}

function sanitizeProfileState(input: unknown): PersistedProfileState {
  if (!isPlainObject(input)) return DEFAULT_PROFILE_STATE;

  const totalXp = Number(input.totalXp);
  const unlockedBadgeIds = Array.isArray(input.unlockedBadgeIds)
    ? Array.from(
        new Set(
          input.unlockedBadgeIds
            .filter((id): id is string => typeof id === "string")
            .map((id) => id.trim())
            .filter((id) => id.length > 0),
        ),
      )
    : [];

  return {
    totalXp: Number.isFinite(totalXp) && totalXp >= 0 ? Math.round(totalXp) : DEFAULT_PROFILE_STATE.totalXp,
    unlockedBadgeIds,
  };
}

function normalizeState(
  input: Partial<PersistedPracticeState> | null | undefined,
): PersistedPracticeState {
  const drills = sanitizeDrills(input?.drills);
  return {
    drills,
    templates: sanitizeTemplates(input?.templates, drills),
    history: sanitizeHistory(input?.history),
    goalSettings: sanitizeGoalSettings(input?.goalSettings),
    profile: sanitizeProfileState(input?.profile),
  };
}

export function parsePersistedState(raw: string | null): PersistedPracticeState {
  if (!raw) return EMPTY_PRACTICE_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope> & Partial<PersistedPracticeState>;

    // Current versioned envelope.
    if (typeof parsed.version === "number" && parsed.state) {
      return normalizeState(parsed.state);
    }

    // Legacy direct state payload migration.
    return normalizeState(parsed);
  } catch {
    return EMPTY_PRACTICE_STATE;
  }
}

export async function loadPersistedState(): Promise<PersistedPracticeState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return parsePersistedState(raw);
  } catch {
    return EMPTY_PRACTICE_STATE;
  }
}

export async function savePersistedState(state: PersistedPracticeState): Promise<void> {
  try {
    const envelope: PersistedEnvelope = {
      version: PERSISTENCE_SCHEMA_VERSION,
      state,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Intentionally swallow storage failures so core app flow remains usable.
  }
}
