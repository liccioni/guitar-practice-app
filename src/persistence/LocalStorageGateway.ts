import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PracticeHistoryEntry } from "../domain/history/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";
import type { Drill } from "../domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings } from "../domain/goals/types";

const STORAGE_KEY = "guitar-practice:v1";
export const PERSISTENCE_SCHEMA_VERSION = 2;

export interface PersistedPracticeState {
  drills: Drill[];
  templates: SessionTemplate[];
  history: PracticeHistoryEntry[];
  goalSettings: GoalSettings;
}

export const EMPTY_PRACTICE_STATE: PersistedPracticeState = {
  drills: [],
  templates: [],
  history: [],
  goalSettings: DEFAULT_GOAL_SETTINGS,
};

interface PersistedEnvelope {
  version: number;
  state: PersistedPracticeState;
}

function normalizeState(
  input: Partial<PersistedPracticeState> | null | undefined,
): PersistedPracticeState {
  return {
    drills: input?.drills ?? [],
    templates: input?.templates ?? [],
    history: input?.history ?? [],
    goalSettings: input?.goalSettings ?? DEFAULT_GOAL_SETTINGS,
  };
}

export function parsePersistedState(raw: string | null): PersistedPracticeState {
  if (!raw) return EMPTY_PRACTICE_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope> & Partial<PersistedPracticeState>;

    // Current versioned envelope.
    if (
      typeof parsed.version === "number" &&
      parsed.version >= PERSISTENCE_SCHEMA_VERSION &&
      parsed.state
    ) {
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
