import type { Drill } from "../exercises/types";
import type { SessionTemplate } from "./sessionTemplate";

export type RuntimeStatus = "idle" | "running" | "paused" | "segmentComplete" | "finished";

export interface RuntimeSegment {
  drillId: string;
  name: string;
  durationSeconds: number;
  remainingSeconds: number;
  targetBpm?: number;
}

export interface RuntimeState {
  status: RuntimeStatus;
  templateId: string;
  templateName: string;
  segments: RuntimeSegment[];
  currentIndex: number;
  totalRemainingSeconds: number;
  completedDrillIds: string[];
  durationCompletedSeconds: number;
  startedAt: string;
}

export function createRuntimeState(input: {
  template: SessionTemplate;
  drills: Drill[];
  nowIso: string;
}): RuntimeState {
  const segments = input.template.drillIds
    .map((drillId) => input.drills.find((drill) => drill.id === drillId))
    .filter((drill): drill is Drill => Boolean(drill))
    .map((drill) => ({
      drillId: drill.id,
      name: drill.name,
      durationSeconds: drill.durationSeconds,
      remainingSeconds: drill.durationSeconds,
      targetBpm: drill.targetBpm,
    }));

  if (segments.length === 0) {
    throw new Error("Template has no drills to run");
  }

  return {
    status: "idle",
    templateId: input.template.id,
    templateName: input.template.name,
    segments,
    currentIndex: 0,
    totalRemainingSeconds: segments.reduce((sum, item) => sum + item.durationSeconds, 0),
    completedDrillIds: [],
    durationCompletedSeconds: 0,
    startedAt: input.nowIso,
  };
}

export function startRuntime(state: RuntimeState): RuntimeState {
  if (state.status !== "idle") return state;
  return { ...state, status: "running" };
}

export function pauseRuntime(state: RuntimeState): RuntimeState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused" };
}

export function resumeRuntime(state: RuntimeState): RuntimeState {
  if (state.status !== "paused") return state;
  return { ...state, status: "running" };
}

export function tickRuntime(state: RuntimeState, seconds: number = 1): RuntimeState {
  if (state.status !== "running") return state;

  const current = state.segments[state.currentIndex];
  if (!current) return { ...state, status: "finished" };

  const nextRemaining = Math.max(0, current.remainingSeconds - seconds);
  const spent = current.remainingSeconds - nextRemaining;

  const nextSegments = state.segments.slice();
  nextSegments[state.currentIndex] = {
    ...current,
    remainingSeconds: nextRemaining,
  };

  const nextTotal = Math.max(0, state.totalRemainingSeconds - spent);

  if (nextRemaining > 0) {
    return {
      ...state,
      segments: nextSegments,
      totalRemainingSeconds: nextTotal,
    };
  }

  const alreadyCompleted = state.completedDrillIds.includes(current.drillId);
  const nextCompletedIds = alreadyCompleted
    ? state.completedDrillIds
    : [...state.completedDrillIds, current.drillId];

  const nextCompletedSeconds = alreadyCompleted
    ? state.durationCompletedSeconds
    : state.durationCompletedSeconds + current.durationSeconds;

  const isLast = state.currentIndex === state.segments.length - 1;

  return {
    ...state,
    status: isLast ? "finished" : "segmentComplete",
    segments: nextSegments,
    totalRemainingSeconds: nextTotal,
    completedDrillIds: nextCompletedIds,
    durationCompletedSeconds: nextCompletedSeconds,
  };
}

export function markCurrentSegmentComplete(state: RuntimeState): RuntimeState {
  if (!["running", "paused", "segmentComplete"].includes(state.status)) return state;

  const current = state.segments[state.currentIndex];
  if (!current) return { ...state, status: "finished" };

  const spent = current.remainingSeconds;
  const nextSegments = state.segments.slice();
  nextSegments[state.currentIndex] = {
    ...current,
    remainingSeconds: 0,
  };

  const alreadyCompleted = state.completedDrillIds.includes(current.drillId);
  const nextCompletedIds = alreadyCompleted
    ? state.completedDrillIds
    : [...state.completedDrillIds, current.drillId];
  const nextCompletedSeconds = alreadyCompleted
    ? state.durationCompletedSeconds
    : state.durationCompletedSeconds + current.durationSeconds;

  const isLast = state.currentIndex === state.segments.length - 1;
  return {
    ...state,
    status: isLast ? "finished" : "segmentComplete",
    segments: nextSegments,
    totalRemainingSeconds: Math.max(0, state.totalRemainingSeconds - spent),
    completedDrillIds: nextCompletedIds,
    durationCompletedSeconds: nextCompletedSeconds,
  };
}

export function skipCurrentSegment(state: RuntimeState): RuntimeState {
  if (!["running", "paused", "segmentComplete"].includes(state.status)) return state;

  const current = state.segments[state.currentIndex];
  if (!current) return { ...state, status: "finished" };

  const nextSegments = state.segments.slice();
  nextSegments[state.currentIndex] = {
    ...current,
    remainingSeconds: 0,
  };

  const isLast = state.currentIndex === state.segments.length - 1;
  if (isLast) {
    return {
      ...state,
      status: "finished",
      segments: nextSegments,
      totalRemainingSeconds: 0,
    };
  }

  return {
    ...state,
    status: "running",
    segments: nextSegments,
    totalRemainingSeconds: Math.max(0, state.totalRemainingSeconds - current.remainingSeconds),
    currentIndex: state.currentIndex + 1,
  };
}

export function advanceToNextSegment(state: RuntimeState): RuntimeState {
  if (state.status !== "segmentComplete") return state;
  const isLast = state.currentIndex === state.segments.length - 1;
  if (isLast) return { ...state, status: "finished" };

  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    status: "running",
  };
}

export function getCurrentSegment(state: RuntimeState): RuntimeSegment | undefined {
  return state.segments[state.currentIndex];
}
