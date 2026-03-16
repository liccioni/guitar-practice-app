import { describe, expect, it } from "vitest";
import { buildComebackPrompt } from "../src/app/comebackPrompts";
import type { PracticeHistoryEntry } from "../src/domain/history/types";

function makeEntry(
  id: string,
  startedAt: string,
  overrides: Partial<PracticeHistoryEntry> = {},
): PracticeHistoryEntry {
  return {
    id,
    sessionTemplateId: `template_${id}`,
    sessionNameSnapshot: `Session ${id}`,
    drillsSnapshot: [{ id: "drill_1", name: "Warmup", durationSeconds: 300, targetBpm: 90 }],
    completedDrillIds: ["drill_1"],
    startedAt,
    endedAt: startedAt,
    durationCompletedSeconds: 300,
    completed: true,
    ...overrides,
  };
}

describe("comeback prompts", () => {
  it("creates a first-session prompt when no history exists", () => {
    expect(buildComebackPrompt([], "2026-03-16T10:00:00.000Z")).toEqual({
      kind: "new",
      homeTitle: "Start your first tracked session",
      homeBody: "One focused session is enough to build your baseline and unlock more useful coaching across the app.",
      homeActionLabel: "Start First Session",
      progressTitle: "No tracked practice yet",
      progressBody: "Finish one full session to unlock recent form, weekly trends, and more reliable progress signals.",
      recentFormEmptyBody: "Your first completed session will turn this into a real trendline instead of a placeholder.",
    });
  });

  it("pushes incomplete-only history toward finishing a first session", () => {
    const prompt = buildComebackPrompt(
      [
        makeEntry("1", "2026-03-15T10:00:00.000Z", {
          sessionNameSnapshot: "Starter Session",
          completed: false,
          completedDrillIds: [],
        }),
      ],
      "2026-03-16T10:00:00.000Z",
    );

    expect(prompt.kind).toBe("finish_loop");
    expect(prompt.homeBody).toContain("Starter Session");
    expect(prompt.homeActionLabel).toBe("Finish A Session");
  });

  it("creates a comeback prompt after a stale completed session", () => {
    const prompt = buildComebackPrompt(
      [makeEntry("1", "2026-03-06T10:00:00.000Z", { sessionNameSnapshot: "Rhythm Reset" })],
      "2026-03-16T10:00:00.000Z",
    );

    expect(prompt.kind).toBe("restart");
    expect(prompt.homeBody).toContain("10 days ago");
    expect(prompt.homeBody).toContain("Rhythm Reset");
    expect(prompt.progressBody).toContain("10 days ago");
  });

  it("stays quiet when recent completed history is healthy", () => {
    const prompt = buildComebackPrompt(
      [makeEntry("1", "2026-03-15T10:00:00.000Z")],
      "2026-03-16T10:00:00.000Z",
    );

    expect(prompt.kind).toBe("active");
  });
});
