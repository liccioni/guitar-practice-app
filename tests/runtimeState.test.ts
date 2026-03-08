import { describe, expect, it } from "vitest";
import type { Drill } from "../src/domain/exercises/types";
import type { SessionTemplate } from "../src/domain/sessions/sessionTemplate";
import {
  advanceToNextSegment,
  createRuntimeState,
  getCurrentSegment,
  markCurrentSegmentComplete,
  pauseRuntime,
  resumeRuntime,
  skipCurrentSegment,
  startRuntime,
  tickRuntime,
} from "../src/domain/sessions/runtimeState";

const drills: Drill[] = [
  {
    id: "d1",
    name: "Warmup",
    durationSeconds: 60,
    targetBpm: 80,
    tags: ["warmup"],
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
  },
  {
    id: "d2",
    name: "Scales",
    durationSeconds: 120,
    targetBpm: 100,
    tags: ["scales"],
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
  },
];

const template: SessionTemplate = {
  id: "t1",
  name: "Daily",
  drillIds: ["d1", "d2"],
  totalDurationSeconds: 180,
  isPreset: false,
  createdAt: "2026-03-02T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
};

describe("runtime state machine", () => {
  it("transitions running -> paused -> running", () => {
    const state = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const paused = pauseRuntime(state);
    const resumed = resumeRuntime(paused);

    expect(paused.status).toBe("paused");
    expect(resumed.status).toBe("running");
  });

  it("counts completed seconds when segment naturally reaches zero", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const doneSegmentOne = tickRuntime(started, 60);

    expect(doneSegmentOne.status).toBe("segmentComplete");
    expect(doneSegmentOne.completedDrillIds).toEqual(["d1"]);
    expect(doneSegmentOne.durationCompletedSeconds).toBe(60);

    const next = advanceToNextSegment(doneSegmentOne);
    expect(next.currentIndex).toBe(1);
    expect(next.status).toBe("running");
  });

  it("skip does not inflate completed minutes", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const skipped = skipCurrentSegment(started);

    expect(skipped.currentIndex).toBe(1);
    expect(skipped.completedDrillIds).toEqual([]);
    expect(skipped.durationCompletedSeconds).toBe(0);
  });

  it("manual completion marks full segment complete", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const completed = markCurrentSegmentComplete(started);

    expect(completed.completedDrillIds).toEqual(["d1"]);
    expect(completed.durationCompletedSeconds).toBe(60);
    expect(completed.status).toBe("segmentComplete");
  });

  it("handles invalid or no-op transitions safely", () => {
    const idle = createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" });
    expect(pauseRuntime(idle)).toBe(idle);
    expect(resumeRuntime(idle)).toBe(idle);
    expect(tickRuntime(idle, 10)).toBe(idle);
    expect(advanceToNextSegment(idle)).toBe(idle);
  });

  it("throws when template has no runnable drills", () => {
    expect(() =>
      createRuntimeState({
        template: { ...template, drillIds: ["missing"] },
        drills,
        nowIso: "2026-03-02T00:00:00.000Z",
      }),
    ).toThrow("Template has no drills to run");
  });

  it("finishes when current index is out of bounds", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const brokenState = { ...started, currentIndex: 99 };

    expect(tickRuntime(brokenState).status).toBe("finished");
    expect(markCurrentSegmentComplete(brokenState).status).toBe("finished");
    expect(skipCurrentSegment(brokenState).status).toBe("finished");
    expect(getCurrentSegment(brokenState)).toBeUndefined();
  });

  it("finishes when skipping the final segment", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const atLast = { ...started, currentIndex: started.segments.length - 1 };
    const skipped = skipCurrentSegment(atLast);

    expect(skipped.status).toBe("finished");
    expect(skipped.totalRemainingSeconds).toBe(0);
  });

  it("does not double-count completed drill when ticking an already completed segment", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const alreadyCompletedState = {
      ...started,
      completedDrillIds: [started.segments[0].drillId],
      durationCompletedSeconds: started.segments[0].durationSeconds,
    };

    const afterTick = tickRuntime(alreadyCompletedState, started.segments[0].durationSeconds);
    expect(afterTick.completedDrillIds).toEqual([started.segments[0].drillId]);
    expect(afterTick.durationCompletedSeconds).toBe(started.segments[0].durationSeconds);
  });

  it("mark complete and skip are no-op for non-runnable status", () => {
    const idle = createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" });
    const finished = { ...idle, status: "finished" as const };
    expect(markCurrentSegmentComplete(finished)).toBe(finished);
    expect(skipCurrentSegment(finished)).toBe(finished);
  });

  it("advance finishes when current segment is already last", () => {
    const state = {
      ...createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
      status: "segmentComplete" as const,
      currentIndex: 1,
    };
    const next = advanceToNextSegment(state);
    expect(next.status).toBe("finished");
  });

  it("start is a no-op unless state is idle", () => {
    const running = startRuntime(
      startRuntime(createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" })),
    );
    expect(startRuntime(running)).toBe(running);
  });

  it("tick on final segment transitions to finished", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const onLast = { ...started, currentIndex: 1 };
    const finished = tickRuntime(onLast, 120);
    expect(finished.status).toBe("finished");
  });

  it("tick can decrement without completing segment", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const next = tickRuntime(started, 10);
    expect(next.status).toBe("running");
    expect(next.segments[0].remainingSeconds).toBe(50);
    expect(next.totalRemainingSeconds).toBe(170);
  });

  it("mark complete does not double-count and can finish on last segment", () => {
    const started = startRuntime(
      createRuntimeState({ template, drills, nowIso: "2026-03-02T00:00:00.000Z" }),
    );
    const withAlreadyCompleted = {
      ...started,
      completedDrillIds: [started.segments[0].drillId],
      durationCompletedSeconds: started.segments[0].durationSeconds,
    };
    const completedOnce = markCurrentSegmentComplete(withAlreadyCompleted);
    expect(completedOnce.durationCompletedSeconds).toBe(started.segments[0].durationSeconds);

    const atLast = {
      ...started,
      currentIndex: 1,
      completedDrillIds: [started.segments[0].drillId],
      durationCompletedSeconds: started.segments[0].durationSeconds,
    };
    const finished = markCurrentSegmentComplete(atLast);
    expect(finished.status).toBe("finished");
  });
});
