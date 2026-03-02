import { describe, expect, it } from "vitest";
import type { Drill } from "../src/domain/exercises/types";
import type { SessionTemplate } from "../src/domain/sessions/sessionTemplate";
import {
  advanceToNextSegment,
  createRuntimeState,
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
});
