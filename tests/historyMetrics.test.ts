import { describe, expect, it } from "vitest";
import { calculateDashboardMetrics, toLocalDayKey } from "../src/domain/history/metrics";
import type { PracticeHistoryEntry } from "../src/domain/history/types";

const entries: PracticeHistoryEntry[] = [
  {
    id: "h1",
    sessionNameSnapshot: "Daily A",
    drillsSnapshot: [{ id: "d1", name: "Warmup", durationSeconds: 600, targetBpm: 90 }],
    completedDrillIds: ["d1"],
    startedAt: "2026-03-02T08:00:00.000Z",
    endedAt: "2026-03-02T08:10:00.000Z",
    durationCompletedSeconds: 600,
    completed: true,
  },
  {
    id: "h2",
    sessionNameSnapshot: "Daily B",
    drillsSnapshot: [{ id: "d2", name: "Scales", durationSeconds: 1200, targetBpm: 110 }],
    completedDrillIds: ["d2"],
    startedAt: "2026-02-28T10:00:00.000Z",
    endedAt: "2026-02-28T10:20:00.000Z",
    durationCompletedSeconds: 1200,
    completed: true,
  },
];

describe("history metrics", () => {
  it("aggregates total/weekly/today/goal progress and average bpm", () => {
    const metrics = calculateDashboardMetrics({
      entries,
      nowIso: "2026-03-02T18:00:00.000Z",
      dailyMinutesTarget: 30,
    });

    expect(metrics.totalMinutes).toBe(30);
    expect(metrics.weeklyMinutes).toBe(30);
    expect(metrics.todayMinutes).toBe(10);
    expect(metrics.sessionsCompleted).toBe(2);
    expect(metrics.averageBpm).toBe(100);
    expect(metrics.goalProgressPercent).toBe(33);
  });

  it("uses local day key for boundary calculations", () => {
    expect(toLocalDayKey("2026-03-02T23:59:00.000Z")).not.toBe("");
  });

  it("handles zero/invalid goal target and entries without bpm", () => {
    const metrics = calculateDashboardMetrics({
      entries: [
        {
          id: "h3",
          sessionNameSnapshot: "No bpm",
          drillsSnapshot: [{ id: "d3", name: "Rhythm", durationSeconds: 300 }],
          completedDrillIds: ["d3"],
          startedAt: "2026-02-20T08:00:00.000Z",
          durationCompletedSeconds: 300,
          completed: false,
        },
      ],
      nowIso: "2026-03-02T18:00:00.000Z",
      dailyMinutesTarget: 0,
    });

    expect(metrics.weeklyMinutes).toBe(0);
    expect(metrics.todayMinutes).toBe(0);
    expect(metrics.averageBpm).toBe(0);
    expect(metrics.goalProgressPercent).toBe(100);
  });
});
