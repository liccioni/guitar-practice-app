import { describe, expect, it } from "vitest";
import { computeUnlockedBadgeIds } from "../src/domain/gamification/badges";

describe("badges", () => {
  it("unlocks streak badge at 7-day streak", () => {
    const unlocked = computeUnlockedBadgeIds({
      currentUnlockedBadgeIds: [],
      sessionXp: 20,
      completedDrillCount: 1,
      streakDays: 7,
      sessionsCompleted: 1,
      averageBpm: 80,
    });

    expect(unlocked).toContain("b1");
  });

  it("unlocks rhythm keeper from sustained session quality", () => {
    const unlocked = computeUnlockedBadgeIds({
      currentUnlockedBadgeIds: [],
      sessionXp: 40,
      completedDrillCount: 2,
      streakDays: 2,
      sessionsCompleted: 5,
      averageBpm: 100,
    });

    expect(unlocked).toContain("b2");
  });

  it("unlocks xp hunter and session beast from one strong session", () => {
    const unlocked = computeUnlockedBadgeIds({
      currentUnlockedBadgeIds: [],
      sessionXp: 150,
      completedDrillCount: 4,
      streakDays: 1,
      sessionsCompleted: 2,
      averageBpm: 90,
    });

    expect(unlocked).toEqual(["b3", "b4"]);
  });

  it("preserves already unlocked valid badges and ignores unknown ids", () => {
    const unlocked = computeUnlockedBadgeIds({
      currentUnlockedBadgeIds: ["b2", "unknown", "b2"],
      sessionXp: 10,
      completedDrillCount: 1,
      streakDays: 1,
      sessionsCompleted: 1,
      averageBpm: 70,
    });

    expect(unlocked).toEqual(["b2"]);
  });
});
