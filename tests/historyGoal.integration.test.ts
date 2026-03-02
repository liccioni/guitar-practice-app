import { describe, expect, it } from "vitest";
import { PracticePipeline } from "../src/application/practicePipeline";
import { calculateDashboardMetrics } from "../src/domain/history/metrics";
import { calculateCurrentStreak } from "../src/domain/goals/streak";
import { InMemoryPracticeRepository } from "../src/persistence/InMemoryPracticeRepository";

describe("history + goal integration", () => {
  it("updates metrics and streak after finishing a session", () => {
    const repository = new InMemoryPracticeRepository();
    const pipeline = new PracticePipeline(repository);

    const warmup = repository.createDrill({
      name: "Warmup",
      durationMinutes: 5,
      targetBpm: 90,
      tags: ["warmup"],
    });

    const template = pipeline.createSessionTemplateFromDrills({
      id: "template_daily",
      name: "Daily",
      drills: [warmup],
      nowIso: "2026-03-02T09:00:00.000Z",
    });

    pipeline.startSession(template.id, "2026-03-02T10:00:00.000Z");
    pipeline.markDrillComplete(warmup.id);
    pipeline.finishSession("2026-03-02T10:05:00.000Z");

    const history = repository.listHistory();
    const metrics = calculateDashboardMetrics({
      entries: history,
      nowIso: "2026-03-02T12:00:00.000Z",
      dailyMinutesTarget: 20,
    });

    expect(metrics.todayMinutes).toBe(5);
    expect(metrics.sessionsCompleted).toBe(1);
    expect(metrics.goalProgressPercent).toBe(25);
    expect(calculateCurrentStreak(history, "2026-03-02T12:00:00.000Z")).toBe(1);
  });
});
