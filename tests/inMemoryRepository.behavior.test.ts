import { describe, expect, it } from "vitest";
import { InMemoryPracticeRepository } from "../src/persistence/InMemoryPracticeRepository";

describe("InMemoryPracticeRepository behavior", () => {
  it("removes deleted drills from templates and recalculates total duration", () => {
    const repo = new InMemoryPracticeRepository();
    const warmup = repo.createDrill({ name: "Warmup", durationMinutes: 5 });
    const scales = repo.createDrill({ name: "Scales", durationMinutes: 10 });

    repo.saveSessionTemplate({
      id: "t1",
      name: "Daily",
      drillIds: [warmup.id, scales.id],
      totalDurationSeconds: warmup.durationSeconds + scales.durationSeconds,
      isPreset: false,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });

    repo.deleteDrill(warmup.id);

    const template = repo.getSessionTemplateById("t1");
    expect(template?.drillIds).toEqual([scales.id]);
    expect(template?.totalDurationSeconds).toBe(scales.durationSeconds);
  });

  it("throws when updating a missing template", () => {
    const repo = new InMemoryPracticeRepository();

    expect(() =>
      repo.updateSessionTemplate({
        id: "missing",
        name: "Missing",
        drillIds: [],
        totalDurationSeconds: 0,
        isPreset: false,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
    ).toThrow("Template not found");
  });

  it("exports and imports repository state", () => {
    const repoA = new InMemoryPracticeRepository();
    const drill = repoA.createDrill({ name: "Arpeggios", durationMinutes: 7 });

    repoA.saveSessionTemplate({
      id: "tA",
      name: "Session A",
      drillIds: [drill.id],
      totalDurationSeconds: drill.durationSeconds,
      isPreset: false,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });

    repoA.saveHistory({
      id: "h1",
      sessionTemplateId: "tA",
      sessionNameSnapshot: "Session A",
      drillsSnapshot: [{ id: drill.id, name: drill.name, durationSeconds: drill.durationSeconds }],
      completedDrillIds: [drill.id],
      startedAt: "2026-03-01T10:00:00.000Z",
      endedAt: "2026-03-01T10:07:00.000Z",
      durationCompletedSeconds: drill.durationSeconds,
      completed: true,
    });

    const snapshot = repoA.exportState();

    const repoB = new InMemoryPracticeRepository();
    repoB.importState(snapshot);

    expect(repoB.listDrills()).toHaveLength(1);
    expect(repoB.listSessionTemplates()).toHaveLength(1);
    expect(repoB.listHistory()).toHaveLength(1);
  });
});
