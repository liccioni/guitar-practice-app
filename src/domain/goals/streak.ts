import type { PracticeHistoryEntry } from "../history/types";
import { toLocalDayKey } from "../history/metrics";
import type { GoalType } from "./types";

function addDays(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function calculateCurrentStreak(entries: PracticeHistoryEntry[], nowIso: string): number {
  const dayKeys = new Set(
    entries
      .filter((entry) => entry.durationCompletedSeconds > 0)
      .map((entry) => toLocalDayKey(entry.startedAt)),
  );

  let streak = 0;
  let cursorIso = nowIso;

  while (dayKeys.has(toLocalDayKey(cursorIso))) {
    streak += 1;
    cursorIso = addDays(cursorIso, -1);
  }

  return streak;
}

export function incrementStreakIfPracticedToday(
  currentStreak: number,
  completedMinutesToday: number,
): number {
  if (completedMinutesToday <= 0) return currentStreak;
  return currentStreak + 1;
}

function normalizeGoalTarget(goalType: GoalType, goalTarget: number): number {
  if (!Number.isFinite(goalTarget)) {
    return goalType === "minutes" ? 30 : goalType === "sessions" ? 1 : 4;
  }
  const rounded = Math.round(goalTarget);
  if (goalType === "minutes") return Math.min(300, Math.max(5, rounded));
  if (goalType === "sessions") return Math.min(20, Math.max(1, rounded));
  return Math.min(60, Math.max(1, rounded));
}

function getDayTotals(entries: PracticeHistoryEntry[]): Map<string, { minutes: number; sessions: number; drills: number }> {
  const map = new Map<string, { minutes: number; sessions: number; drills: number }>();
  for (const entry of entries) {
    const dayKey = toLocalDayKey(entry.startedAt);
    const current = map.get(dayKey) ?? { minutes: 0, sessions: 0, drills: 0 };
    current.minutes += Math.round(entry.durationCompletedSeconds / 60);
    if (entry.completed) {
      current.sessions += 1;
      current.drills += entry.completedDrillIds.length;
    }
    map.set(dayKey, current);
  }
  return map;
}

export function calculateGoalTypeStreak(
  entries: PracticeHistoryEntry[],
  nowIso: string,
  goalType: GoalType,
  goalTarget: number,
): number {
  const totalsByDay = getDayTotals(entries);
  const target = normalizeGoalTarget(goalType, goalTarget);
  let streak = 0;
  let cursorIso = nowIso;

  for (;;) {
    const key = toLocalDayKey(cursorIso);
    const totals = totalsByDay.get(key) ?? { minutes: 0, sessions: 0, drills: 0 };
    const value =
      goalType === "minutes" ? totals.minutes : goalType === "sessions" ? totals.sessions : totals.drills;
    if (value < target) break;
    streak += 1;
    cursorIso = addDays(cursorIso, -1);
  }

  return streak;
}
