import type { PracticeHistoryEntry } from "../history/types";
import { toLocalDayKey } from "../history/metrics";

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
