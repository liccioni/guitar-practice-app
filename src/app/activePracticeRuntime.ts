import type { Drill, DrillRandomizer, DrillRandomizerKind } from "../domain/exercises/types";
import type { RuntimeState } from "../domain/sessions/runtimeState";

export interface RandomCueRuntimeState {
  label: string | null;
  nextLabel: string | null;
  beatsRemaining: number;
  pulseWindowActive: boolean;
}

export interface RandomCueAdvanceResult {
  nextState: RandomCueRuntimeState;
  shouldPulse: boolean;
}

export interface RuntimeProgress {
  activeDrillIds: string[];
  activeIndex: number;
  remainingSec: number;
  completedDrillIds: string[];
  completedDurationSec: number;
  sessionDurationSec: number;
  elapsedSec: number;
  sessionProgress: number;
  drillProgress: number;
}

export interface DrillCompletionTransition {
  completedDrillName: string;
  gainedXp: number;
  nextDrillName: string | null;
  nextDrillDurationSec: number | null;
  nextDrillTargetBpm: number | null;
  isSessionFinisher: boolean;
}

export function randomCueValues(kind: DrillRandomizerKind): string[] {
  if (kind === "note") return ["A", "B", "C", "D", "E", "F", "G"];
  if (kind === "triad") return ["A Maj", "A Min", "C Maj", "C Min", "D Maj", "E Min", "G Maj"];
  return ["1-2-3-4", "1-3-2-4", "4-3-2-1", "1-4-2-3", "2-4-1-3", "3-1-4-2"];
}

export function pickRandomCueValue(kind: DrillRandomizerKind): string {
  const pool = randomCueValues(kind);
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function createEmptyRandomCueState(): RandomCueRuntimeState {
  return {
    label: null,
    nextLabel: null,
    beatsRemaining: 0,
    pulseWindowActive: false,
  };
}

export function createRandomCueState(
  randomizer: DrillRandomizer,
  pickCue: (kind: DrillRandomizerKind) => string = pickRandomCueValue,
): RandomCueRuntimeState {
  const initialBeats = randomizer.everyBars * 4;

  return {
    label: pickCue(randomizer.kind),
    nextLabel: pickCue(randomizer.kind),
    beatsRemaining: initialBeats,
    pulseWindowActive: false,
  };
}

export function advanceRandomCueState(
  current: RandomCueRuntimeState,
  randomizer: DrillRandomizer,
  pickCue: (kind: DrillRandomizerKind) => string = pickRandomCueValue,
): RandomCueAdvanceResult {
  const nextRemaining = current.beatsRemaining - 1;

  if (nextRemaining <= 0) {
    const resetBeats = randomizer.everyBars * 4;
    const nextCue = pickCue(randomizer.kind);

    return {
      nextState: {
        label: current.nextLabel ?? nextCue,
        nextLabel: nextCue,
        beatsRemaining: resetBeats,
        pulseWindowActive: false,
      },
      shouldPulse: true,
    };
  }

  return {
    nextState: {
      ...current,
      beatsRemaining: nextRemaining,
      pulseWindowActive: nextRemaining === 1,
    },
    shouldPulse: nextRemaining === 1,
  };
}

export function getRuntimeProgress(runtimeState: RuntimeState | null): RuntimeProgress {
  if (!runtimeState) {
    return {
      activeDrillIds: [],
      activeIndex: 0,
      remainingSec: 0,
      completedDrillIds: [],
      completedDurationSec: 0,
      sessionDurationSec: 0,
      elapsedSec: 0,
      sessionProgress: 0,
      drillProgress: 0,
    };
  }

  const activeDrillIds = runtimeState.segments.map((segment) => segment.drillId);
  const currentSegment = runtimeState.segments[runtimeState.currentIndex];
  const sessionDurationSec = runtimeState.segments.reduce(
    (sum, segment) => sum + segment.durationSeconds,
    0,
  );
  const elapsedSec = sessionDurationSec - runtimeState.totalRemainingSeconds;
  const remainingSec = currentSegment?.remainingSeconds ?? 0;
  const drillProgress =
    !currentSegment || currentSegment.durationSeconds === 0
      ? 0
      : clampUnit((currentSegment.durationSeconds - remainingSec) / currentSegment.durationSeconds);

  return {
    activeDrillIds,
    activeIndex: runtimeState.currentIndex,
    remainingSec,
    completedDrillIds: runtimeState.completedDrillIds,
    completedDurationSec: runtimeState.durationCompletedSeconds,
    sessionDurationSec,
    elapsedSec,
    sessionProgress:
      sessionDurationSec === 0 ? 0 : clampUnit(elapsedSec / sessionDurationSec),
    drillProgress,
  };
}

export function buildDrillCompletionTransition(
  runtimeState: RuntimeState,
): DrillCompletionTransition | null {
  if (runtimeState.status !== "segmentComplete") return null;

  const completedSegment = runtimeState.segments[runtimeState.currentIndex];
  if (!completedSegment) return null;

  const nextSegment = runtimeState.segments[runtimeState.currentIndex + 1] ?? null;

  return {
    completedDrillName: completedSegment.name,
    gainedXp: toXp({
      id: completedSegment.drillId,
      name: completedSegment.name,
      durationSeconds: completedSegment.durationSeconds,
      targetBpm: completedSegment.targetBpm,
      tags: [],
      createdAt: "",
      updatedAt: "",
    }),
    nextDrillName: nextSegment?.name ?? null,
    nextDrillDurationSec: nextSegment?.durationSeconds ?? null,
    nextDrillTargetBpm: nextSegment?.targetBpm ?? null,
    isSessionFinisher: nextSegment === null,
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toXp(drill: Drill): number {
  const durationMinutes = Math.max(1, Math.round(drill.durationSeconds / 60));
  const bpmBonus = drill.targetBpm ? Math.round((drill.targetBpm - 40) / 10) : 0;
  return Math.max(25, durationMinutes * 10 + bpmBonus);
}
