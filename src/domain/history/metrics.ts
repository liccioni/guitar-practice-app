import type { PracticeHistoryEntry } from "./types";

export interface DashboardMetrics {
  totalMinutes: number;
  sessionsCompleted: number;
  weeklyMinutes: number;
  todayMinutes: number;
  averageBpm: number;
  goalProgressPercent: number;
}

function toDayKey(dateIso: string): string {
  const d = new Date(dateIso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWithinLastDays(dateIso: string, nowIso: string, days: number): boolean {
  const diffMs = new Date(nowIso).getTime() - new Date(dateIso).getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

function estimateEntryAverageBpm(entry: PracticeHistoryEntry): number {
  const known = entry.drillsSnapshot
    .map((drill) => drill.targetBpm)
    .filter((bpm): bpm is number => typeof bpm === "number");
  if (known.length === 0) return 0;
  return Math.round(known.reduce((sum, bpm) => sum + bpm, 0) / known.length);
}

export function calculateDashboardMetrics(input: {
  entries: PracticeHistoryEntry[];
  nowIso: string;
  dailyMinutesTarget: number;
}): DashboardMetrics {
  const totalMinutes = Math.round(
    input.entries.reduce((sum, entry) => sum + entry.durationCompletedSeconds, 0) / 60,
  );

  const sessionsCompleted = input.entries.filter((entry) => entry.completed).length;

  const weeklyMinutes = Math.round(
    input.entries
      .filter((entry) => isWithinLastDays(entry.startedAt, input.nowIso, 7))
      .reduce((sum, entry) => sum + entry.durationCompletedSeconds, 0) / 60,
  );

  const todayKey = toDayKey(input.nowIso);
  const todayMinutes = Math.round(
    input.entries
      .filter((entry) => toDayKey(entry.startedAt) === todayKey)
      .reduce((sum, entry) => sum + entry.durationCompletedSeconds, 0) / 60,
  );

  const bpmValues = input.entries.map(estimateEntryAverageBpm).filter((bpm) => bpm > 0);

  const averageBpm =
    bpmValues.length === 0
      ? 0
      : Math.round(bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length);

  const goalProgressPercent =
    input.dailyMinutesTarget <= 0
      ? 100
      : Math.min(100, Math.round((todayMinutes / input.dailyMinutesTarget) * 100));

  return {
    totalMinutes,
    sessionsCompleted,
    weeklyMinutes,
    todayMinutes,
    averageBpm,
    goalProgressPercent,
  };
}

export function toLocalDayKey(dateIso: string): string {
  return toDayKey(dateIso);
}
