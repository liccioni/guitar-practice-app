import type { Drill } from "../domain/exercises/types";

export interface SessionOverviewSummary {
  estimatedMinutes: number;
  totalXp: number;
  averageBpm: number | null;
  bpmRangeLabel: string;
  drillCount: number;
}

export function toXp(drill: Drill): number {
  const durationMinutes = Math.max(1, Math.round(drill.durationSeconds / 60));
  const bpmBonus = drill.targetBpm ? Math.round((drill.targetBpm - 40) / 10) : 0;
  return Math.max(25, durationMinutes * 10 + bpmBonus);
}

export function buildSessionOverviewSummary(drills: Drill[]): SessionOverviewSummary {
  const estimatedMinutes = Math.max(
    0,
    Math.round(drills.reduce((sum, drill) => sum + drill.durationSeconds, 0) / 60),
  );
  const totalXp = drills.reduce((sum, drill) => sum + toXp(drill), 0);
  const bpmValues = drills
    .map((drill) => drill.targetBpm)
    .filter((bpm): bpm is number => typeof bpm === "number" && Number.isFinite(bpm));

  const averageBpm =
    bpmValues.length > 0 ? Math.round(bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length) : null;
  const minBpm = bpmValues.length > 0 ? Math.min(...bpmValues) : null;
  const maxBpm = bpmValues.length > 0 ? Math.max(...bpmValues) : null;

  const bpmRangeLabel =
    minBpm === null || maxBpm === null
      ? "No BPM target"
      : minBpm === maxBpm
        ? `${minBpm} BPM steady`
        : `${minBpm}-${maxBpm} BPM`;

  return {
    estimatedMinutes,
    totalXp,
    averageBpm,
    bpmRangeLabel,
    drillCount: drills.length,
  };
}
