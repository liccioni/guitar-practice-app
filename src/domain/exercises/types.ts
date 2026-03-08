export type DrillTag = "warmup" | "technique" | "scales" | "chords" | "rhythm" | "songs" | "improv";
export type DrillRandomizerKind = "note" | "triad" | "fingers4";

export interface DrillRandomizer {
  kind: DrillRandomizerKind;
  everyBars: number;
}

export interface Drill {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  targetBpm?: number;
  tags: DrillTag[];
  randomizer?: DrillRandomizer;
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
}

export interface UpdateDrillInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  targetBpm?: number;
  tags?: DrillTag[];
  randomizer?: DrillRandomizer;
}
