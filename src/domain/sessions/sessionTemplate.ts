import type { Drill } from "../exercises/types";

export interface SessionTemplate {
  id: string;
  name: string;
  drillIds: string[];
  totalDurationSeconds: number;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MIN_SEGMENT_MINUTES = 1;
export const MAX_SEGMENT_MINUTES = 30;
export const MIN_SESSION_MINUTES = 5;

export function createSessionTemplate(input: {
  id: string;
  name: string;
  drillIds: string[];
  totalDurationSeconds: number;
  isPreset?: boolean;
  nowIso: string;
}): SessionTemplate {
  if (!input.name.trim()) throw new Error("Session name is required");
  if (input.totalDurationSeconds < MIN_SESSION_MINUTES * 60) {
    throw new Error("Session must be at least 5 minutes");
  }

  return {
    id: input.id,
    name: input.name.trim(),
    drillIds: input.drillIds,
    totalDurationSeconds: input.totalDurationSeconds,
    isPreset: Boolean(input.isPreset),
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function calculateTotalDurationSeconds(drills: Drill[]): number {
  return drills.reduce((sum, drill) => sum + drill.durationSeconds, 0);
}

export function renderSessionSummary(template: SessionTemplate, drills: Drill[]): string {
  const lines = drills.map((drill, index) => {
    const minutes = Math.round(drill.durationSeconds / 60);
    return `${index + 1}. ${drill.name} (${minutes}m)`;
  });

  const totalMinutes = Math.round(template.totalDurationSeconds / 60);
  return `${template.name} - ${totalMinutes}m\n${lines.join("\n")}`;
}
