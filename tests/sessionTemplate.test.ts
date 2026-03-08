import { describe, expect, it } from "vitest";
import type { Drill } from "../src/domain/exercises/types";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
  renderSessionSummary,
} from "../src/domain/sessions/sessionTemplate";

describe("session template output", () => {
  it("renders a summary string with drill names and total duration", () => {
    const drills: Drill[] = [
      {
        id: "d1",
        name: "Warmup",
        durationSeconds: 300,
        tags: ["warmup"],
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
      },
      {
        id: "d2",
        name: "Scales",
        durationSeconds: 600,
        tags: ["scales"],
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
      },
    ];

    const template = createSessionTemplate({
      id: "s1",
      name: "Daily 15",
      drillIds: drills.map((d) => d.id),
      totalDurationSeconds: calculateTotalDurationSeconds(drills),
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    expect(renderSessionSummary(template, drills)).toContain("Daily 15 - 15m");
    expect(renderSessionSummary(template, drills)).toContain("1. Warmup (5m)");
    expect(renderSessionSummary(template, drills)).toContain("2. Scales (10m)");
  });

  it("validates required name and minimum session duration", () => {
    expect(() =>
      createSessionTemplate({
        id: "bad-1",
        name: "   ",
        drillIds: [],
        totalDurationSeconds: 600,
        nowIso: "2026-03-02T00:00:00.000Z",
      }),
    ).toThrow("Session name is required");

    expect(() =>
      createSessionTemplate({
        id: "bad-2",
        name: "Too short",
        drillIds: ["d1"],
        totalDurationSeconds: 60,
        nowIso: "2026-03-02T00:00:00.000Z",
      }),
    ).toThrow("Session must be at least 5 minutes");
  });

  it("defaults preset flag to false", () => {
    const template = createSessionTemplate({
      id: "s2",
      name: "Default Preset",
      drillIds: ["d1"],
      totalDurationSeconds: 300,
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    expect(template.isPreset).toBe(false);
  });
});
