export type DrillTag = "warmup" | "technique" | "scales" | "chords" | "rhythm" | "songs" | "improv";
export type DrillRandomizerKind = "note" | "triad" | "fingers4";
export type DrillCueMode = "random-pulse" | "fixed-note" | "circle-of-fifths" | "circle-of-fourths";

export interface DrillRandomizer {
  kind: DrillRandomizerKind;
  everyBars: number;
}

export interface DrillCueConfig {
  mode: DrillCueMode;
  everyBars?: number;
  kind?: DrillRandomizerKind;
}

export interface Drill {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  targetBpm?: number;
  tags: DrillTag[];
  randomizer?: DrillRandomizer;
  cue?: DrillCueConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrillInput {
  name: string;
  description?: string;
  durationMinutes: number;
  targetBpm?: number;
  tags?: DrillTag[];
  randomizer?: DrillRandomizer;
  cue?: DrillCueConfig;
}

export interface UpdateDrillInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  targetBpm?: number;
  tags?: DrillTag[];
  randomizer?: DrillRandomizer;
  cue?: DrillCueConfig;
}
