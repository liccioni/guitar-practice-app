import { describe, expect, it } from "vitest";
import {
  advanceRandomCueState,
  buildDrillCompletionTransition,
  createEmptyRandomCueState,
  createRandomCueState,
  getRuntimeProgress,
} from "../src/app/activePracticeRuntime";
import type { RuntimeState } from "../src/domain/sessions/runtimeState";

describe("activePracticeRuntime helpers", () => {
  it("creates an empty random cue state when no cue is active", () => {
    expect(createEmptyRandomCueState()).toEqual({
      label: null,
      nextLabel: null,
      beatsRemaining: 0,
      pulseWindowActive: false,
    });
  });

  it("initializes random cue state with a current and next cue", () => {
    const values = ["A", "C", "E"];
    let index = 0;

    const state = createRandomCueState(
      { kind: "note", everyBars: 2 },
      () => values[index++],
    );

    expect(state).toEqual({
      label: "A",
      nextLabel: "C",
      beatsRemaining: 8,
      pulseWindowActive: false,
    });
  });

  it("enters the pulse window one beat before the cue changes", () => {
    const result = advanceRandomCueState(
      {
        label: "A",
        nextLabel: "C",
        beatsRemaining: 2,
        pulseWindowActive: false,
      },
      { kind: "note", everyBars: 1 },
      () => "E",
    );

    expect(result.shouldPulse).toBe(true);
    expect(result.nextState).toEqual({
      label: "A",
      nextLabel: "C",
      beatsRemaining: 1,
      pulseWindowActive: true,
    });
  });

  it("reveals the queued cue and resets the beat counter when a cue triggers", () => {
    const result = advanceRandomCueState(
      {
        label: "A",
        nextLabel: "C",
        beatsRemaining: 1,
        pulseWindowActive: true,
      },
      { kind: "note", everyBars: 2 },
      () => "E",
    );

    expect(result.shouldPulse).toBe(true);
    expect(result.nextState).toEqual({
      label: "C",
      nextLabel: "E",
      beatsRemaining: 8,
      pulseWindowActive: false,
    });
  });

  it("derives session and drill progress from runtime state", () => {
    const runtimeState: RuntimeState = {
      status: "running",
      templateId: "template_1",
      templateName: "Daily Session",
      currentIndex: 1,
      totalRemainingSeconds: 75,
      completedDrillIds: ["drill_1"],
      durationCompletedSeconds: 60,
      startedAt: "2026-03-13T14:00:00.000Z",
      segments: [
        {
          drillId: "drill_1",
          name: "Warmup",
          durationSeconds: 60,
          remainingSeconds: 0,
          targetBpm: 90,
        },
        {
          drillId: "drill_2",
          name: "Scales",
          durationSeconds: 90,
          remainingSeconds: 75,
          targetBpm: 110,
        },
      ],
    };

    expect(getRuntimeProgress(runtimeState)).toEqual({
      activeDrillIds: ["drill_1", "drill_2"],
      activeIndex: 1,
      remainingSec: 75,
      completedDrillIds: ["drill_1"],
      completedDurationSec: 60,
      sessionDurationSec: 150,
      elapsedSec: 75,
      sessionProgress: 0.5,
      drillProgress: 1 / 6,
    });
  });

  it("returns zeroed progress when runtime is missing", () => {
    expect(getRuntimeProgress(null)).toEqual({
      activeDrillIds: [],
      activeIndex: 0,
      remainingSec: 0,
      completedDrillIds: [],
      completedDurationSec: 0,
      sessionDurationSec: 0,
      elapsedSec: 0,
      sessionProgress: 0,
      drillProgress: 0,
    });
  });

  it("builds a drill-complete transition with the next drill preview", () => {
    const runtimeState: RuntimeState = {
      status: "segmentComplete",
      templateId: "template_1",
      templateName: "Daily Session",
      currentIndex: 0,
      totalRemainingSeconds: 90,
      completedDrillIds: ["drill_1"],
      durationCompletedSeconds: 60,
      startedAt: "2026-03-13T14:00:00.000Z",
      segments: [
        {
          drillId: "drill_1",
          name: "Warmup",
          durationSeconds: 60,
          remainingSeconds: 0,
          targetBpm: 90,
        },
        {
          drillId: "drill_2",
          name: "Scales",
          durationSeconds: 90,
          remainingSeconds: 90,
          targetBpm: 120,
        },
      ],
    };

    expect(buildDrillCompletionTransition(runtimeState)).toEqual({
      completedDrillName: "Warmup",
      gainedXp: 25,
      nextDrillName: "Scales",
      nextDrillDurationSec: 90,
      nextDrillTargetBpm: 120,
      isSessionFinisher: false,
    });
  });

  it("marks the transition as a session finisher when no next drill exists", () => {
    const runtimeState: RuntimeState = {
      status: "segmentComplete",
      templateId: "template_1",
      templateName: "Daily Session",
      currentIndex: 0,
      totalRemainingSeconds: 0,
      completedDrillIds: ["drill_1"],
      durationCompletedSeconds: 60,
      startedAt: "2026-03-13T14:00:00.000Z",
      segments: [
        {
          drillId: "drill_1",
          name: "Warmup",
          durationSeconds: 60,
          remainingSeconds: 0,
          targetBpm: 90,
        },
      ],
    };

    expect(buildDrillCompletionTransition(runtimeState)).toEqual({
      completedDrillName: "Warmup",
      gainedXp: 25,
      nextDrillName: null,
      nextDrillDurationSec: null,
      nextDrillTargetBpm: null,
      isSessionFinisher: true,
    });
  });
});
