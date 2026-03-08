import { describe, expect, it } from "vitest";
import { prepareSessionStart } from "../src/application/startSessionPreparation";
import { createDrillFromInput } from "../src/domain/exercises/drill";
import { createSessionTemplate } from "../src/domain/sessions/sessionTemplate";

describe("prepareSessionStart", () => {
  it("returns template-missing error when no template is selected", () => {
    const result = prepareSessionStart({
      selectedTemplate: null,
      allDrills: [],
      currentMetronomeBpm: 90,
    });

    expect(result).toEqual({
      ok: false,
      error: "No session template available. Create a template first.",
    });
  });

  it("returns valid drill payload and first-drill bpm when template is valid", () => {
    const now = "2026-03-07T12:00:00.000Z";
    const drill = createDrillFromInput(
      "drill_1",
      { name: "Alt Picking", durationMinutes: 5, targetBpm: 120 },
      now,
    );
    const template = createSessionTemplate({
      id: "template_1",
      name: "Daily Session",
      drillIds: [drill.id],
      totalDurationSeconds: drill.durationSeconds,
      nowIso: now,
    });

    const result = prepareSessionStart({
      selectedTemplate: template,
      allDrills: [drill],
      currentMetronomeBpm: 90,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolvedDrills.map((item) => item.id)).toEqual([drill.id]);
    expect(result.nextMetronomeBpm).toBe(120);
  });

  it("rejects template when no runtime-valid drills can be resolved", () => {
    const now = "2026-03-07T12:00:00.000Z";
    const invalid = createDrillFromInput(
      "drill_invalid",
      { name: "Broken Drill", durationMinutes: 5, targetBpm: 100 },
      now,
    );
    const template = createSessionTemplate({
      id: "template_invalid",
      name: "Invalid",
      drillIds: [invalid.id],
      totalDurationSeconds: invalid.durationSeconds,
      nowIso: now,
    });

    const result = prepareSessionStart({
      selectedTemplate: template,
      allDrills: [{ ...invalid, durationSeconds: 0 }],
      currentMetronomeBpm: 90,
    });

    expect(result).toEqual({
      ok: false,
      error: "Selected template has no valid drills. Edit drills and try again.",
    });
  });

  it("falls back to current bpm when first drill bpm is missing/invalid", () => {
    const now = "2026-03-07T12:00:00.000Z";
    const drill = createDrillFromInput(
      "drill_fallback",
      { name: "Timing", durationMinutes: 5, targetBpm: 100 },
      now,
    );
    const template = createSessionTemplate({
      id: "template_fallback",
      name: "Fallback",
      drillIds: ["missing", drill.id],
      totalDurationSeconds: drill.durationSeconds,
      nowIso: now,
    });

    const result = prepareSessionStart({
      selectedTemplate: template,
      allDrills: [{ ...drill, targetBpm: 999 }],
      currentMetronomeBpm: 95,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextMetronomeBpm).toBe(95);
    expect(result.resolvedDrills).toHaveLength(1);
  });
});
