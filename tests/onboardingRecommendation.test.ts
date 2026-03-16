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
    weeklyFrequencyDays: 5,
    practicePreference: "balanced",
    ...overrides,
  };
}

describe("onboarding recommendation", () => {
  it("builds recommendation metadata from answers", () => {
    const suggestion = buildPracticeOnboardingSuggestion(
      makeAnswers({
        level: "expert",
        durationMinutes: 60,
        focus: "rhythm",
        outcome: "song-prep",
        weeklyFrequencyDays: 7,
        practicePreference: "structured",
      }),
    );

    expect(suggestion.recommendedMinutes).toBe(68);
    expect(suggestion.drillCount).toBe(7);
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

  it("applies frequency and preference adjustments across all recommendation branches", () => {
    const beginnerStructured = buildPracticeOnboardingSuggestion(
      makeAnswers({
        level: "beginner",
        durationMinutes: 20,
        weeklyFrequencyDays: 3,
        practicePreference: "structured",
      }),
    );
    expect(beginnerStructured.drillCount).toBe(3);
    expect(beginnerStructured.recommendedMinutes).toBe(20);
    expect(beginnerStructured.summary).toContain("20-minute");
    expect(beginnerStructured.summary).toContain("3 drills");
    expect(beginnerStructured.summary).toContain("structured progression");

    const intermediateBalanced = buildPracticeOnboardingSuggestion(
      makeAnswers({
        level: "intermediate",
        durationMinutes: 30,
        weeklyFrequencyDays: 5,
        practicePreference: "balanced",
      }),
    );
    expect(intermediateBalanced.drillCount).toBe(4);
    expect(intermediateBalanced.recommendedMinutes).toBe(39);
    expect(intermediateBalanced.summary).toContain("39-minute");
    expect(intermediateBalanced.summary).toContain("4 drills");
    expect(intermediateBalanced.summary).toContain("balanced progression");

    const expertExploratory = buildPracticeOnboardingSuggestion(
      makeAnswers({
        level: "expert",
        durationMinutes: 60,
        weeklyFrequencyDays: 7,
        practicePreference: "exploratory",
      }),
    );
    expect(expertExploratory.drillCount).toBe(8);
    expect(expertExploratory.recommendedMinutes).toBe(73);
    expect(expertExploratory.summary).toContain("73-minute");
    expect(expertExploratory.summary).toContain("8 drills");
    expect(expertExploratory.summary).toContain("exploratory progression");
  });
});
