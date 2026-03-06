import { describe, expect, it } from "vitest";
import {
  calculateCurrentStreak,
  calculateGoalTypeStreak,
  incrementStreakIfPracticedToday,
} from "../src/domain/goals/streak";
import type { PracticeHistoryEntry } from "../src/domain/history/types";

function entry(dayIso: string): PracticeHistoryEntry {
  return {
    id: dayIso,
    sessionNameSnapshot: "Session",
    drillsSnapshot: [{ id: "d1", name: "Warmup", durationSeconds: 600 }],
    completedDrillIds: ["d1"],
    startedAt: dayIso,
    endedAt: dayIso,
    durationCompletedSeconds: 600,
    completed: true,
  };
}

describe("streak rules", () => {
  it("counts consecutive practiced days ending today", () => {
    const entries = [
      entry("2026-03-02T09:00:00.000Z"),
      entry("2026-03-01T09:00:00.000Z"),
      entry("2026-02-28T09:00:00.000Z"),
    ];

    expect(calculateCurrentStreak(entries, "2026-03-02T12:00:00.000Z")).toBe(3);
  });

  it("breaks streak when a day is missing", () => {
    const entries = [entry("2026-03-02T09:00:00.000Z"), entry("2026-02-28T09:00:00.000Z")];

    expect(calculateCurrentStreak(entries, "2026-03-02T12:00:00.000Z")).toBe(1);
  });

  it("returns 0 when no practice on current day", () => {
    const entries = [entry("2026-03-01T09:00:00.000Z")];
    expect(calculateCurrentStreak(entries, "2026-03-02T12:00:00.000Z")).toBe(0);
  });

  it("increments streak when minutes were completed today", () => {
    expect(incrementStreakIfPracticedToday(4, 1)).toBe(5);
  });

  it("keeps streak unchanged when no minutes were completed today", () => {
    expect(incrementStreakIfPracticedToday(4, 0)).toBe(4);
  });

  it("tracks goal streak by sessions target", () => {
    const entries = [
      entry("2026-03-03T09:00:00.000Z"),
      entry("2026-03-02T09:00:00.000Z"),
      entry("2026-03-01T09:00:00.000Z"),
    ];

    expect(calculateGoalTypeStreak(entries, "2026-03-03T12:00:00.000Z", "sessions", 1)).toBe(3);
    expect(calculateGoalTypeStreak(entries, "2026-03-03T12:00:00.000Z", "sessions", 2)).toBe(0);
  });

  it("tracks goal streak by drills target", () => {
    const entries: PracticeHistoryEntry[] = [
      { ...entry("2026-03-03T09:00:00.000Z"), completedDrillIds: ["d1", "d2", "d3"] },
      { ...entry("2026-03-02T09:00:00.000Z"), completedDrillIds: ["d1", "d2", "d3"] },
      { ...entry("2026-03-01T09:00:00.000Z"), completedDrillIds: ["d1"] },
    ];

    expect(calculateGoalTypeStreak(entries, "2026-03-03T12:00:00.000Z", "drills", 3)).toBe(2);
  });
});
