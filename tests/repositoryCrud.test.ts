import { describe, expect, it } from "vitest";
import { InMemoryPracticeRepository } from "../src/persistence/InMemoryPracticeRepository";

describe("repository drill and template CRUD", () => {
  it("creates and updates drills with tags", () => {
    const repository = new InMemoryPracticeRepository();

    const created = repository.createDrill({
      name: "Chord changes",
      durationMinutes: 8,
      targetBpm: 90,
      tags: ["chords"],
    });

    const updated = repository.updateDrill(created.id, {
      durationMinutes: 12,
      tags: ["chords", "rhythm"],
    });

    expect(updated.durationSeconds).toBe(720);
    expect(updated.tags).toEqual(["chords", "rhythm"]);
  });

  it("deletes session templates", () => {
    const repository = new InMemoryPracticeRepository();
    const drill = repository.createDrill({ name: "Warmup", durationMinutes: 5, tags: ["warmup"] });

    const template = {
      id: "t1",
      name: "Quick",
      drillIds: [drill.id],
      totalDurationSeconds: 300,
      isPreset: false,
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    };

    repository.saveSessionTemplate(template);
    expect(repository.listSessionTemplates()).toHaveLength(1);

    repository.deleteSessionTemplate(template.id);
    expect(repository.listSessionTemplates()).toHaveLength(0);
  });
});
