import { computeUnlockedBadgeIds } from "../domain/gamification/badges";
import { calculateGoalTypeStreak } from "../domain/goals/streak";
import { calculateDashboardMetrics } from "../domain/history/metrics";
import type { DrillSnapshot, PracticeHistoryEntry } from "../domain/history/types";
import type { GoalType } from "../domain/goals/types";
import type { Drill } from "../domain/exercises/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";

export interface BuildSessionCompletionResultInput {
  selectedTemplate: SessionTemplate | null;
  allDrills: Drill[];
  history: PracticeHistoryEntry[];
  currentUnlockedBadgeIds: string[];
  goalType: GoalType;
  goalTarget: number;
  dailyMinutesTarget: number;
  finalActiveDrillIds: string[];
  finalCompletedDrillIds: string[];
  finalCompletedDurationSec: number;
  finalElapsedSec: number;
  finalSessionXp: number;
  createHistoryId: () => string;
  nowMs?: () => number;
  nowIso?: () => string;
}

export interface SessionCompletionResult {
  entry: PracticeHistoryEntry;
  nextHistory: PracticeHistoryEntry[];
  nextUnlockedBadgeIds: string[];
}

function toSnapshot(drill: Drill): DrillSnapshot {
  return {
    id: drill.id,
    name: drill.name,
    durationSeconds: drill.durationSeconds,
    targetBpm: drill.targetBpm,
  };
}

export function buildSessionCompletionResult(
  input: BuildSessionCompletionResultInput,
): SessionCompletionResult | null {
  if (!input.selectedTemplate) return null;

  const nowMs = input.nowMs ?? Date.now;
  const nowIso = input.nowIso ?? (() => new Date().toISOString());

  const drillsSnapshot = input.finalActiveDrillIds
    .map((id) => input.allDrills.find((drill) => drill.id === id))
    .filter((drill): drill is Drill => Boolean(drill))
    .map(toSnapshot);

  const entry: PracticeHistoryEntry = {
    id: input.createHistoryId(),
    sessionTemplateId: input.selectedTemplate.id,
    sessionNameSnapshot: input.selectedTemplate.name,
    drillsSnapshot,
    completedDrillIds: input.finalCompletedDrillIds,
    startedAt: new Date(nowMs() - input.finalElapsedSec * 1000).toISOString(),
    endedAt: nowIso(),
    durationCompletedSeconds: input.finalCompletedDurationSec,
    completed: input.finalCompletedDrillIds.length === input.finalActiveDrillIds.length,
  };

  const nextHistory = [entry, ...input.history];
  const nextStreak = calculateGoalTypeStreak(
    nextHistory,
    nowIso(),
    input.goalType,
    input.goalTarget,
  );
  const nextMetrics = calculateDashboardMetrics({
    entries: nextHistory,
    nowIso: nowIso(),
    dailyMinutesTarget: input.dailyMinutesTarget,
  });
  const nextSessionsCompleted = nextHistory.filter((item) => item.completed).length;
  const nextUnlockedBadgeIds = computeUnlockedBadgeIds({
    currentUnlockedBadgeIds: input.currentUnlockedBadgeIds,
    sessionXp: input.finalSessionXp,
    completedDrillCount: input.finalCompletedDrillIds.length,
    streakDays: nextStreak,
    sessionsCompleted: nextSessionsCompleted,
    averageBpm: nextMetrics.averageBpm,
  });

  return {
    entry,
    nextHistory,
    nextUnlockedBadgeIds,
  };
}
