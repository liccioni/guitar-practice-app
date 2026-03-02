export type DrillTag = "warmup" | "technique" | "scales" | "chords" | "rhythm" | "songs" | "improv";

export interface Drill {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  targetBpm?: number;
  tags: DrillTag[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrillInput {
  name: string;
  description?: string;
  durationMinutes: number;
  targetBpm?: number;
  tags?: DrillTag[];
}

export interface UpdateDrillInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  targetBpm?: number;
  tags?: DrillTag[];
}
