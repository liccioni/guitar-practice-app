import { describe, expect, it } from "vitest";
import { PracticePipeline } from "../src/app/practicePipeline";
import { InMemoryPracticeRepository } from "../src/persistence/InMemoryPracticeRepository";

describe("practice pipeline integration", () => {
  it("creates template, runs session, and persists completed history", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);

    const warmup = repository.createDrill({ name: "Warmup", durationMinutes: 5 });
    const scales = repository.createDrill({ name: "Scales", durationMinutes: 10, targetBpm: 100 });

    const template = pipeline.createSessionTemplateFromDrills({
      id: "template_daily_15",
      name: "Daily 15",
      drills: [warmup, scales],
      nowIso: "2026-03-02T10:00:00.000Z",
    });

    pipeline.startSession(template.id, "2026-03-02T10:05:00.000Z");
    pipeline.markDrillComplete(warmup.id);
    pipeline.markDrillComplete(scales.id);
    const entry = pipeline.finishSession("2026-03-02T10:20:00.000Z");

    expect(entry.completed).toBe(true);
    expect(entry.durationCompletedSeconds).toBe(900);

    const history = repository.listHistory();
    expect(history).toHaveLength(1);
    expect(history[0].sessionNameSnapshot).toBe("Daily 15");
    expect(history[0].completedDrillIds).toEqual([warmup.id, scales.id]);
  });
});
