import { isValidBpm } from "../metronome/metronome";
import type {
  CreateDrillInput,
  Drill,
  DrillCueConfig,
  DrillRandomizer,
  UpdateDrillInput,
} from "./types";

export const MIN_DRILL_MINUTES = 1;
export const MAX_DRILL_MINUTES = 30;
export const MIN_RANDOM_BARS = 1;
export const MAX_RANDOM_BARS = 16;

export function validateDrillInput(input: CreateDrillInput | UpdateDrillInput): void {
  if ("name" in input && input.name !== undefined && !input.name.trim()) {
    throw new Error("Drill name is required");
  }

  if (input.durationMinutes !== undefined) {
    if (input.durationMinutes < MIN_DRILL_MINUTES || input.durationMinutes > MAX_DRILL_MINUTES) {
      throw new Error("Drill duration must be between 1 and 30 minutes");
    }
  }

  if (input.targetBpm !== undefined && !isValidBpm(input.targetBpm)) {
    throw new Error("Drill BPM must be between 40 and 240");
  }

  if (input.randomizer !== undefined) {
    validateRandomCueBars(input.randomizer.everyBars);
  }

  if (input.cue !== undefined) {
    validateCueConfig(input.cue);
  }
}

export function createDrillFromInput(id: string, input: CreateDrillInput, nowIso: string): Drill {
  validateDrillInput(input);
  const cue = normalizeCueConfig(input.cue, input.randomizer);
  const randomizer = normalizeRandomizer(input.randomizer, cue);

  return {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    durationSeconds: input.durationMinutes * 60,
    targetBpm: input.targetBpm,
    tags: input.tags ?? [],
    randomizer,
    cue,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateDrillFromInput(drill: Drill, input: UpdateDrillInput, nowIso: string): Drill {
  validateDrillInput(input);
  const cue = normalizeCueConfig(
    input.cue === undefined ? drill.cue : input.cue,
    input.randomizer === undefined ? drill.randomizer : input.randomizer,
  );
  const randomizer = normalizeRandomizer(
    input.randomizer === undefined ? drill.randomizer : input.randomizer,
    cue,
  );

  return {
    ...drill,
    name: input.name === undefined ? drill.name : input.name.trim(),
    description:
      input.description === undefined ? drill.description : input.description.trim() || undefined,
    durationSeconds:
      input.durationMinutes === undefined ? drill.durationSeconds : input.durationMinutes * 60,
    targetBpm: input.targetBpm === undefined ? drill.targetBpm : input.targetBpm,
    tags: input.tags === undefined ? drill.tags : input.tags,
    randomizer,
    cue,
    updatedAt: nowIso,
  };
}

function validateRandomCueBars(everyBars: number): void {
  if (everyBars < MIN_RANDOM_BARS || everyBars > MAX_RANDOM_BARS) {
    throw new Error("Random cue bars must be between 1 and 16");
  }
}

function validateCueConfig(cue: DrillCueConfig): void {
  if (cue.mode === "random-pulse") {
    if (!cue.kind) {
      throw new Error("Random pulse cue kind is required");
    }
    if (cue.everyBars === undefined) {
      throw new Error("Random pulse cue bars are required");
    }
    validateRandomCueBars(cue.everyBars);
    return;
  }

  if (cue.mode === "fixed-note") {
    return;
  }

  if (cue.everyBars === undefined) {
    throw new Error("Cue bars are required");
  }
  validateRandomCueBars(cue.everyBars);
}

function normalizeCueConfig(
  cue: DrillCueConfig | undefined,
  randomizer: DrillRandomizer | undefined,
): DrillCueConfig | undefined {
  if (cue) return cue;
  if (!randomizer) return undefined;
  return {
    mode: "random-pulse",
    kind: randomizer.kind,
    everyBars: randomizer.everyBars,
  };
}

function normalizeRandomizer(
  randomizer: DrillRandomizer | undefined,
  cue: DrillCueConfig | undefined,
): DrillRandomizer | undefined {
  if (randomizer) return randomizer;
  if (!cue || cue.mode !== "random-pulse" || !cue.kind || cue.everyBars === undefined) {
    return undefined;
  }

  return {
    kind: cue.kind,
    everyBars: cue.everyBars,
  };
}
