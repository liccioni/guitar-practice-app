import { describe, expect, it } from "vitest";
import { appendDrillToTemplate, reorderDrillInTemplate } from "../src/application/sessionBuilder";
import type { Drill } from "../src/domain/exercises/types";
import type { SessionTemplate } from "../src/domain/sessions/sessionTemplate";

function makeDrill(id: string, durationSeconds: number): Drill {
  return {
    id,
    name: `Drill ${id}`,
    durationSeconds,
    tags: [],
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  };
}

function makeTemplate(id: string, drillIds: string[], totalDurationSeconds: number): SessionTemplate {
  return {
    id,
    name: `Template ${id}`,
    drillIds,
    totalDurationSeconds,
    isPreset: false,
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-03T00:00:00.000Z",
  };
}

describe("session builder UI state", () => {
  it("appends a drill to the active template", () => {
    const templates = [makeTemplate("t1", ["d1"], 300)];
    const drill = makeDrill("d2", 360);

    const result = appendDrillToTemplate({
      templates,
      activeTemplateId: "t1",
      drill,
      nowIso: "2026-03-03T10:00:00.000Z",
    });

    expect(result.targetTemplateId).toBe("t1");
    expect(result.templates[0].drillIds).toEqual(["d1", "d2"]);
    expect(result.templates[0].totalDurationSeconds).toBe(660);
  });

  it("falls back to the first template when no active template id is set", () => {
    const templates = [makeTemplate("t1", [], 0), makeTemplate("t2", [], 0)];
    const drill = makeDrill("d3", 420);

    const result = appendDrillToTemplate({
      templates,
      activeTemplateId: null,
      drill,
      nowIso: "2026-03-03T10:00:00.000Z",
    });

    expect(result.targetTemplateId).toBe("t1");
    expect(result.templates[0].drillIds).toEqual(["d3"]);
    expect(result.templates[1].drillIds).toEqual([]);
  });

  it("throws when no template exists", () => {
    expect(() =>
      appendDrillToTemplate({
        templates: [],
        activeTemplateId: null,
        drill: makeDrill("d4", 300),
        nowIso: "2026-03-03T10:00:00.000Z",
      }),
    ).toThrow("No session template available. Create a template first.");
  });

  it("throws when active template id does not exist during add", () => {
    expect(() =>
      appendDrillToTemplate({
        templates: [makeTemplate("t1", [], 0)],
        activeTemplateId: "missing-template",
        drill: makeDrill("d404", 300),
        nowIso: "2026-03-03T10:00:00.000Z",
      }),
    ).toThrow("Selected template could not be found.");
  });

  it("moves a drill down within the active template", () => {
    const templates = [makeTemplate("t1", ["d1", "d2", "d3"], 900)];
    const result = reorderDrillInTemplate({
      templates,
      activeTemplateId: "t1",
      drillId: "d1",
      direction: "down",
      nowIso: "2026-03-03T11:00:00.000Z",
    });

    expect(result.templates[0].drillIds).toEqual(["d2", "d1", "d3"]);
  });

  it("keeps order unchanged when moving top drill up", () => {
    const templates = [makeTemplate("t1", ["d1", "d2"], 600)];
    const result = reorderDrillInTemplate({
      templates,
      activeTemplateId: "t1",
      drillId: "d1",
      direction: "up",
      nowIso: "2026-03-03T11:00:00.000Z",
    });

    expect(result.templates[0].drillIds).toEqual(["d1", "d2"]);
  });

  it("keeps order unchanged when reorder drill id is missing", () => {
    const templates = [makeTemplate("t1", ["d1", "d2"], 600)];
    const result = reorderDrillInTemplate({
      templates,
      activeTemplateId: "t1",
      drillId: "missing",
      direction: "down",
      nowIso: "2026-03-03T11:00:00.000Z",
    });

    expect(result.templates[0].drillIds).toEqual(["d1", "d2"]);
  });

  it("throws when reorder is requested with no templates", () => {
    expect(() =>
      reorderDrillInTemplate({
        templates: [],
        activeTemplateId: null,
        drillId: "d1",
        direction: "down",
        nowIso: "2026-03-03T11:00:00.000Z",
      }),
    ).toThrow("No session template available. Create a template first.");
  });

  it("throws when active template id does not exist during reorder", () => {
    expect(() =>
      reorderDrillInTemplate({
        templates: [makeTemplate("t1", ["d1"], 300)],
        activeTemplateId: "missing-template",
        drillId: "d1",
        direction: "down",
        nowIso: "2026-03-03T11:00:00.000Z",
      }),
    ).toThrow("Selected template could not be found.");
  });
});
