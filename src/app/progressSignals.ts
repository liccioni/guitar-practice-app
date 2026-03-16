import type { WeeklySummary } from "../ui/screens";

export interface ProgressMilestone {
  id: string;
  title: string;
  detail: string;
  progress: number;
}

const MINUTE_THRESHOLDS = [30, 60, 120, 240];
const STREAK_THRESHOLDS = [3, 7, 14, 30];
const BPM_THRESHOLDS = [90, 110, 140, 160];

export function buildProgressMilestones(input: {
  weeklySummary: WeeklySummary;
  streak: number;
  averageBpm: number;
}): ProgressMilestone[] {
  return [
    buildMinutesMilestone(input.weeklySummary.weekMinutes),
    buildStreakMilestone(input.streak),
    buildBpmMilestone(input.averageBpm),
  ];
}

function buildMinutesMilestone(weekMinutes: number): ProgressMilestone {
  const target = nextThreshold(weekMinutes, MINUTE_THRESHOLDS);
  return {
    id: "weekly_minutes",
    title: `${target} minute week`,
    detail: `${weekMinutes}/${target} minutes practiced this week`,
    progress: toProgress(weekMinutes, target),
  };
}

function buildStreakMilestone(streak: number): ProgressMilestone {
  const target = nextThreshold(streak, STREAK_THRESHOLDS);
  return {
    id: "streak_days",
    title: `${target} day streak`,
    detail: `${streak}/${target} days in a row at your current goal`,
    progress: toProgress(streak, target),
  };
}

function buildBpmMilestone(averageBpm: number): ProgressMilestone {
  if (averageBpm <= 0) {
    return {
      id: "tempo_history",
      title: "Tempo baseline",
      detail: "Complete more BPM-based drills to unlock a reliable tempo trend.",
      progress: 0,
    };
  }

  const target = nextThreshold(averageBpm, BPM_THRESHOLDS);
  return {
    id: "tempo_history",
    title: `${target} BPM average`,
    detail: `${averageBpm}/${target} BPM across tracked sessions`,
    progress: toProgress(averageBpm, target),
  };
}

function nextThreshold(value: number, thresholds: number[]): number {
  return thresholds.find((threshold) => value < threshold) ?? thresholds[thresholds.length - 1];
}

function toProgress(value: number, target: number): number {
  return Math.max(0, Math.min(100, Math.round((Math.max(0, value) / Math.max(1, target)) * 100)));
}
