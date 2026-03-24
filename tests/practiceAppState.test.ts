import { describe, expect, it } from "vitest";
import {
  buildBadgeState,
  createSeedState,
  getDefaultGoalTarget,
  normalizeGoalTarget,
} from "../src/app/practiceAppStateHelpers";

describe("usePracticeAppState helpers", () => {
  it("creates a usable starter state with drills and one template", () => {
    const state = createSeedState("2026-03-13T15:00:00.000Z");

    expect(state.drills).toHaveLength(4);
    expect(state.templates).toHaveLength(1);
    expect(state.templates[0]?.drillIds).toEqual(state.drills.map((drill) => drill.id));
    expect(state.templates[0]?.totalDurationSeconds).toBeGreaterThanOrEqual(4 * 60);
    expect(state.history).toEqual([]);
    expect(state.profile.totalXp).toBe(0);
    expect(state.profile.entitlements.planId).toBe("free");
    expect(state.profile.drillCueMode).toBe("chime");
  });

  it("maps unlocked badge ids onto the fixed badge definitions", () => {
    expect(buildBadgeState(["b2", "b4"])).toEqual([
      { id: "b1", label: "7-Day Streak", icon: "🔥", unlocked: false },
      { id: "b2", label: "Rhythm Keeper", icon: "🎵", unlocked: true },
      { id: "b3", label: "XP Hunter", icon: "⚡", unlocked: false },
      { id: "b4", label: "Session Beast", icon: "🏆", unlocked: true },
    ]);
  });

  it("returns goal defaults that match each goal type", () => {
    expect(getDefaultGoalTarget("minutes", 25)).toBe(25);
    expect(getDefaultGoalTarget("sessions", 25)).toBe(1);
    expect(getDefaultGoalTarget("drills", 25)).toBe(4);
  });

  it("clamps goal targets to the allowed bounds for each goal type", () => {
    expect(normalizeGoalTarget("minutes", 999, 20)).toBe(300);
    expect(normalizeGoalTarget("minutes", 0, 20)).toBe(5);
    expect(normalizeGoalTarget("sessions", 99, 20)).toBe(20);
    expect(normalizeGoalTarget("drills", -3, 20)).toBe(1);
  });

  it("falls back to the goal default when the target is invalid", () => {
    expect(normalizeGoalTarget("minutes", Number.NaN, 18)).toBe(18);
    expect(normalizeGoalTarget("sessions", Number.POSITIVE_INFINITY, 18)).toBe(1);
  });
});
