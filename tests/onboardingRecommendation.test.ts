import { describe, expect, it } from "vitest";
import {
  buildPracticeOnboardingSuggestion,
  selectSuggestedDrills,
  type PracticeOnboardingAnswers,
} from "../src/domain/profile/onboarding";
import type { CreateDrillInput } from "../src/domain/exercises/types";

const POOL: CreateDrillInput[] = [
  { name: "Chromatic Warmup", durationMinutes: 4, tags: ["warmup"] },
  { name: "Major Scale Ladder", durationMinutes: 6, tags: ["scales"] },
  { name: "Chord Change Sprint", durationMinutes: 5, tags: ["chords"] },
  { name: "Alternate Picking Burst", durationMinutes: 5, tags: ["technique"] },
  { name: "Rhythm Pocket", durationMinutes: 4, tags: ["rhythm"] },
];

function makeAnswers(overrides: Partial<PracticeOnboardingAnswers>): PracticeOnboardingAnswers {
  return {
    level: "beginner",
    durationMinutes: 30,
    focus: "technique",
    outcome: "consistency",
    ...overrides,
  };
}

describe("onboarding recommendation", () => {
  it("builds recommendation metadata from answers", () => {
    const suggestion = buildPracticeOnboardingSuggestion(
      makeAnswers({ level: "expert", durationMinutes: 60, focus: "rhythm", outcome: "song-prep" }),
    );

    expect(suggestion.recommendedMinutes).toBe(65);
    expect(suggestion.drillCount).toBe(6);
    expect(suggestion.sessionName).toContain("Expert");
    expect(suggestion.targetTags).toEqual(expect.arrayContaining(["rhythm", "chords"]));
  });

  it("prioritizes drills that match target tags", () => {
    const suggestion = buildPracticeOnboardingSuggestion(
      makeAnswers({ focus: "rhythm", outcome: "song-prep", durationMinutes: 20 }),
    );
    const selected = selectSuggestedDrills(POOL, suggestion);

    expect(selected).toHaveLength(3);
    expect(selected[0]?.tags?.join(",")).toMatch(/chords|rhythm/);
    expect(selected[1]?.tags?.join(",")).toMatch(/chords|rhythm/);
  });

  it("falls back to pool drills when prioritized matches are not enough", () => {
    const suggestion = {
      ...buildPracticeOnboardingSuggestion(makeAnswers({ durationMinutes: 60 })),
      targetTags: ["non-existent"],
      drillCount: 4,
    };
    const selected = selectSuggestedDrills(POOL, suggestion);

    expect(selected).toHaveLength(4);
    expect(selected.map((drill) => drill.name)).toEqual([
      "Chromatic Warmup",
      "Major Scale Ladder",
      "Chord Change Sprint",
      "Alternate Picking Burst",
    ]);
  });

  it("deduplicates repeated drill names and supports drills without tags", () => {
    const pool: CreateDrillInput[] = [
      { name: "No Tags", durationMinutes: 5 },
      { name: "No Tags", durationMinutes: 6, tags: ["technique"] },
      { name: "Unique", durationMinutes: 5, tags: ["technique"] },
    ];
    const suggestion = buildPracticeOnboardingSuggestion(
      makeAnswers({ focus: "technique", durationMinutes: 30 }),
    );
    const selected = selectSuggestedDrills(pool, suggestion);

    expect(selected).toHaveLength(2);
    expect(selected.map((drill) => drill.name)).toEqual(["No Tags", "Unique"]);
  });
});
