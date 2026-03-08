import { isValidBpm } from "../metronome/metronome";
import type { CreateDrillInput, Drill, UpdateDrillInput } from "./types";

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
    if (input.randomizer.everyBars < MIN_RANDOM_BARS || input.randomizer.everyBars > MAX_RANDOM_BARS) {
      throw new Error("Random cue bars must be between 1 and 16");
    }
  }
}

export function createDrillFromInput(id: string, input: CreateDrillInput, nowIso: string): Drill {
  validateDrillInput(input);

  return {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    durationSeconds: input.durationMinutes * 60,
    targetBpm: input.targetBpm,
    tags: input.tags ?? [],
    randomizer: input.randomizer,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateDrillFromInput(drill: Drill, input: UpdateDrillInput, nowIso: string): Drill {
  validateDrillInput(input);

  return {
    ...drill,
    name: input.name === undefined ? drill.name : input.name.trim(),
    description:
      input.description === undefined ? drill.description : input.description.trim() || undefined,
    durationSeconds:
      input.durationMinutes === undefined ? drill.durationSeconds : input.durationMinutes * 60,
    targetBpm: input.targetBpm === undefined ? drill.targetBpm : input.targetBpm,
    tags: input.tags === undefined ? drill.tags : input.tags,
    randomizer: input.randomizer === undefined ? drill.randomizer : input.randomizer,
    updatedAt: nowIso,
  };
}
