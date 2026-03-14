import { describe, expect, it } from "vitest";
import { buildSessionOverviewSummary, toXp } from "../src/app/sessionOverview";
import type { Drill } from "../src/domain/exercises/types";

function makeDrill(id: string, durationSeconds: number, targetBpm?: number): Drill {
  return {
    id,
    name: `Drill ${id}`,
    durationSeconds,
    targetBpm,
    tags: [],
    createdAt: "2026-03-14T09:00:00.000Z",
    updatedAt: "2026-03-14T09:00:00.000Z",
  };
}

describe("session overview summary", () => {
  it("summarizes duration, reward, bpm average, and range", () => {
    const drills = [makeDrill("d1", 300, 90), makeDrill("d2", 420, 120), makeDrill("d3", 180, 150)];

    expect(buildSessionOverviewSummary(drills)).toEqual({
      estimatedMinutes: 15,
      totalXp: drills.reduce((sum, drill) => sum + toXp(drill), 0),
      averageBpm: 120,
      bpmRangeLabel: "90-150 BPM",
      drillCount: 3,
    });
  });

  it("returns a steady bpm label when every drill targets the same tempo", () => {
    const drills = [makeDrill("d1", 300, 100), makeDrill("d2", 300, 100)];

    expect(buildSessionOverviewSummary(drills).bpmRangeLabel).toBe("100 BPM steady");
  });

  it("handles drills without bpm targets", () => {
    const drills = [makeDrill("d1", 300), makeDrill("d2", 180)];

    expect(buildSessionOverviewSummary(drills)).toEqual({
      estimatedMinutes: 8,
      totalXp: drills.reduce((sum, drill) => sum + toXp(drill), 0),
      averageBpm: null,
      bpmRangeLabel: "No BPM target",
      drillCount: 2,
    });
  });
});
