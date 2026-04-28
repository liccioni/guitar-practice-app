import type {
  Drill,
  DrillCueConfig,
  DrillRandomizer,
  DrillRandomizerKind,
} from "../domain/exercises/types";
import type { RuntimeState } from "../domain/sessions/runtimeState";

export interface RandomCueRuntimeState {
  label: string | null;
  nextLabel: string | null;
  beatsRemaining: number;
  pulseWindowActive: boolean;
  sequenceIndex?: number | null;
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
  nextDrillCueLine: string | null;
  preparationCountdownSec: number;
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
    sequenceIndex: null,
  };
}

const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"] as const;
const CIRCLE_OF_FOURTHS = ["C", "F", "A#", "D#", "G#", "C#", "F#", "B", "E", "A", "D", "G"] as const;

export function createRandomCueState(
  cueInput: DrillRandomizer | DrillCueConfig,
  pickCue: (kind: DrillRandomizerKind) => string = pickRandomCueValue,
): RandomCueRuntimeState {
  const cue = normalizeCueInput(cueInput);
  if (!cue) return createEmptyRandomCueState();

  if (cue.mode === "fixed-note") {
    const fixedLabel = pickCue("note");
    return {
      label: fixedLabel,
      nextLabel: fixedLabel,
      beatsRemaining: 0,
      pulseWindowActive: false,
      sequenceIndex: null,
    };
  }

  if (cue.mode === "circle-of-fifths" || cue.mode === "circle-of-fourths") {
    const sequence = cue.mode === "circle-of-fifths" ? CIRCLE_OF_FIFTHS : CIRCLE_OF_FOURTHS;
    const initialBeats = (cue.everyBars ?? 1) * 4;
    return {
      label: sequence[0],
      nextLabel: sequence[1] ?? sequence[0],
      beatsRemaining: initialBeats,
      pulseWindowActive: false,
      sequenceIndex: 0,
    };
  }

  const initialBeats = (cue.everyBars ?? 1) * 4;

  return {
    label: pickCue(cue.kind ?? "note"),
    nextLabel: pickCue(cue.kind ?? "note"),
    beatsRemaining: initialBeats,
    pulseWindowActive: false,
    sequenceIndex: null,
  };
}

export function advanceRandomCueState(
  current: RandomCueRuntimeState,
  cueInput: DrillRandomizer | DrillCueConfig,
  pickCue: (kind: DrillRandomizerKind) => string = pickRandomCueValue,
): RandomCueAdvanceResult {
  const cue = normalizeCueInput(cueInput);
  if (!cue) {
    return {
      nextState: createEmptyRandomCueState(),
      shouldPulse: false,
    };
  }

  if (cue.mode === "fixed-note") {
    return {
      nextState: current,
      shouldPulse: false,
    };
  }

  const nextRemaining = current.beatsRemaining - 1;

  if (nextRemaining <= 0) {
    const resetBeats = (cue.everyBars ?? 1) * 4;
    const nextCue = buildNextCueLabel(cue, current, pickCue);

    return {
      nextState: {
        label: current.nextLabel ?? nextCue,
        nextLabel: nextCue,
        beatsRemaining: resetBeats,
        pulseWindowActive: false,
        sequenceIndex: getAdvancedSequenceIndex(cue, current),
      },
      shouldPulse: true,
    };
  }

  return {
    nextState: {
      ...current,
      beatsRemaining: nextRemaining,
      pulseWindowActive: nextRemaining === 1,
      sequenceIndex: current.sequenceIndex ?? null,
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
    nextDrillCueLine:
      nextSegment === null
        ? null
        : buildNextDrillCueLine(nextSegment.name, nextSegment.durationSeconds, nextSegment.targetBpm),
    preparationCountdownSec: nextSegment === null ? 0 : 3,
    isSessionFinisher: nextSegment === null,
  };
}

export function buildNextDrillCueLine(
  nextDrillName: string,
  durationSec: number,
  targetBpm: number | undefined,
): string {
  const minutes = Math.max(1, Math.round(durationSec / 60));
  return `${nextDrillName} in ${minutes} min${targetBpm ? ` at ${targetBpm} BPM` : ""}`;
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

function normalizeCueInput(
  cueInput: DrillRandomizer | DrillCueConfig,
): (DrillCueConfig & { everyBars?: number; kind?: DrillRandomizerKind }) | null {
  if ("mode" in cueInput) {
    if (cueInput.mode === "random-pulse") {
      if (!cueInput.kind || cueInput.everyBars === undefined) return null;
      return cueInput;
    }

    if (cueInput.mode === "fixed-note") {
      return cueInput;
    }

    if (cueInput.everyBars === undefined) return null;
    return cueInput;
  }

  return {
    mode: "random-pulse",
    kind: cueInput.kind,
    everyBars: cueInput.everyBars,
  };
}

function buildNextCueLabel(
  cue: DrillCueConfig,
  current: RandomCueRuntimeState,
  pickCue: (kind: DrillRandomizerKind) => string,
): string {
  if (cue.mode === "random-pulse" && cue.kind) {
    return pickCue(cue.kind);
  }

  if (cue.mode === "circle-of-fifths" || cue.mode === "circle-of-fourths") {
    const sequence = cue.mode === "circle-of-fifths" ? CIRCLE_OF_FIFTHS : CIRCLE_OF_FOURTHS;
    const currentIndex = current.sequenceIndex ?? 0;
    const nextIndex = (currentIndex + 2) % sequence.length;
    return sequence[nextIndex] ?? sequence[0];
  }

  return current.label ?? "C";
}

function getAdvancedSequenceIndex(
  cue: DrillCueConfig,
  current: RandomCueRuntimeState,
): number | null {
  if (cue.mode !== "circle-of-fifths" && cue.mode !== "circle-of-fourths") {
    return null;
  }

  const sequence = cue.mode === "circle-of-fifths" ? CIRCLE_OF_FIFTHS : CIRCLE_OF_FOURTHS;
  const currentIndex = current.sequenceIndex ?? 0;
  return (currentIndex + 1) % sequence.length;
}
