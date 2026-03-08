import { describe, expect, it } from "vitest";
import { PracticePipeline } from "../src/application/practicePipeline";
import { InMemoryPracticeRepository } from "../src/persistence/InMemoryPracticeRepository";

describe("practice pipeline template CRUD", () => {
  it("updates an existing template", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);

    const warmup = repository.createDrill({ name: "Warmup", durationMinutes: 5, tags: ["warmup"] });
    const scales = repository.createDrill({
      name: "Scales",
      durationMinutes: 10,
      tags: ["scales"],
    });

    const template = pipeline.createSessionTemplateFromDrills({
      id: "t1",
      name: "Daily",
      drills: [warmup],
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    const updated = pipeline.updateSessionTemplateFromDrills({
      id: template.id,
      name: "Daily Plus",
      drills: [warmup, scales],
      nowIso: "2026-03-02T01:00:00.000Z",
    });

    expect(updated.name).toBe("Daily Plus");
    expect(updated.totalDurationSeconds).toBe(900);
    expect(updated.drillIds).toEqual([warmup.id, scales.id]);
    expect(updated.createdAt).toBe("2026-03-02T00:00:00.000Z");
  });

  it("deletes an existing template", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);

    const warmup = repository.createDrill({ name: "Warmup", durationMinutes: 5 });
    const template = pipeline.createSessionTemplateFromDrills({
      id: "t-delete",
      name: "Delete Me",
      drills: [warmup],
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    expect(repository.listSessionTemplates().map((item) => item.id)).toContain(template.id);
    pipeline.deleteSessionTemplate(template.id);
    expect(repository.listSessionTemplates().map((item) => item.id)).not.toContain(template.id);
  });

  it("throws when updating a missing template", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);
    const drill = repository.createDrill({ name: "Warmup", durationMinutes: 5 });

    expect(() =>
      pipeline.updateSessionTemplateFromDrills({
        id: "missing",
        name: "Missing",
        drills: [drill],
      }),
    ).toThrow("Template not found");
  });

  it("defaults update timestamp when nowIso is omitted", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);
    const drill = repository.createDrill({ name: "Warmup", durationMinutes: 5 });
    const template = pipeline.createSessionTemplateFromDrills({
      id: "t-now",
      name: "Now",
      drills: [drill],
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    const updated = pipeline.updateSessionTemplateFromDrills({
      id: template.id,
      name: "Now+",
      drills: [drill],
    });

    expect(updated.updatedAt).not.toBe("2026-03-02T00:00:00.000Z");
  });
});
