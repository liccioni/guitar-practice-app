import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSessionCompletionResult } from "../src/application/sessionCompletion";
import type { Drill } from "../src/domain/exercises/types";
import type { PracticeHistoryEntry } from "../src/domain/history/types";
import type { SessionTemplate } from "../src/domain/sessions/sessionTemplate";

const BASE_DRILLS: Drill[] = [
  {
    id: "drill_1",
    name: "Chromatic Warmup",
    durationSeconds: 240,
    targetBpm: 90,
    tags: ["warmup"],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "drill_2",
    name: "Major Scale Ladder",
    durationSeconds: 360,
    targetBpm: 110,
    tags: ["scales"],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "drill_3",
    name: "Chord Change Sprint",
    durationSeconds: 300,
    targetBpm: 100,
    tags: ["chords"],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "drill_4",
    name: "Alternate Picking Burst",
    durationSeconds: 300,
    targetBpm: 100,
    tags: ["technique"],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  },
];

const BASE_TEMPLATE: SessionTemplate = {
  id: "template_daily",
  name: "Daily Core Session",
  drillIds: BASE_DRILLS.map((drill) => drill.id),
  totalDurationSeconds: BASE_DRILLS.reduce((sum, drill) => sum + drill.durationSeconds, 0),
  isPreset: false,
  createdAt: "2026-05-01T09:00:00.000Z",
  updatedAt: "2026-05-01T09:00:00.000Z",
};

const BASE_HISTORY: PracticeHistoryEntry[] = [
  {
    id: "history_prev_1",
    sessionTemplateId: "template_prev",
    sessionNameSnapshot: "Speed Builder",
    drillsSnapshot: [
      {
        id: "speed_1",
        name: "Speed Burst",
        durationSeconds: 600,
        targetBpm: 100,
      },
    ],
    completedDrillIds: ["speed_1"],
    startedAt: "2026-05-03T08:00:00.000Z",
    endedAt: "2026-05-03T08:10:00.000Z",
    durationCompletedSeconds: 600,
    completed: true,
  },
  {
    id: "history_prev_2",
    sessionTemplateId: "template_prev",
    sessionNameSnapshot: "Speed Builder",
    drillsSnapshot: [
      {
        id: "speed_2",
        name: "Speed Flow",
        durationSeconds: 600,
        targetBpm: 100,
      },
    ],
    completedDrillIds: ["speed_2"],
    startedAt: "2026-05-02T08:00:00.000Z",
    endedAt: "2026-05-02T08:10:00.000Z",
    durationCompletedSeconds: 600,
    completed: true,
  },
  {
    id: "history_prev_3",
    sessionTemplateId: "template_prev",
    sessionNameSnapshot: "Speed Builder",
    drillsSnapshot: [
      {
        id: "speed_3",
        name: "Speed Loop",
        durationSeconds: 600,
        targetBpm: 100,
      },
    ],
    completedDrillIds: ["speed_3"],
    startedAt: "2026-05-01T08:00:00.000Z",
    endedAt: "2026-05-01T08:10:00.000Z",
    durationCompletedSeconds: 600,
    completed: true,
  },
  {
    id: "history_prev_4",
    sessionTemplateId: "template_prev",
    sessionNameSnapshot: "Speed Builder",
    drillsSnapshot: [
      {
        id: "speed_4",
        name: "Speed Climb",
        durationSeconds: 600,
        targetBpm: 100,
      },
    ],
    completedDrillIds: ["speed_4"],
    startedAt: "2026-04-30T08:00:00.000Z",
    endedAt: "2026-04-30T08:10:00.000Z",
    durationCompletedSeconds: 600,
    completed: true,
  },
];

function buildCompletion(overrides: Partial<Parameters<typeof buildSessionCompletionResult>[0]> = {}) {
  return buildSessionCompletionResult({
    selectedTemplate: BASE_TEMPLATE,
    allDrills: BASE_DRILLS,
    history: BASE_HISTORY,
    currentUnlockedBadgeIds: [],
    goalType: "sessions",
    goalTarget: 1,
    dailyMinutesTarget: 30,
    finalActiveDrillIds: BASE_DRILLS.map((drill) => drill.id),
    finalCompletedDrillIds: BASE_DRILLS.map((drill) => drill.id),
    finalCompletedDurationSec: BASE_TEMPLATE.totalDurationSeconds,
    finalElapsedSec: BASE_TEMPLATE.totalDurationSeconds,
    finalSessionXp: 180,
    createHistoryId: () => "history_new",
    nowMs: () => Date.parse("2026-05-04T10:20:00.000Z"),
    nowIso: () => "2026-05-04T10:20:00.000Z",
    ...overrides,
  });
}

describe("sessionCompletion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds a full session completion entry and prepends it to history", () => {
    const result = buildCompletion();

    expect(result).not.toBeNull();
    expect(result?.entry).toEqual({
      id: "history_new",
      sessionTemplateId: "template_daily",
      sessionNameSnapshot: "Daily Core Session",
      drillsSnapshot: [
        { id: "drill_1", name: "Chromatic Warmup", durationSeconds: 240, targetBpm: 90 },
        { id: "drill_2", name: "Major Scale Ladder", durationSeconds: 360, targetBpm: 110 },
        { id: "drill_3", name: "Chord Change Sprint", durationSeconds: 300, targetBpm: 100 },
        { id: "drill_4", name: "Alternate Picking Burst", durationSeconds: 300, targetBpm: 100 },
      ],
      completedDrillIds: ["drill_1", "drill_2", "drill_3", "drill_4"],
      startedAt: "2026-05-04T10:00:00.000Z",
      endedAt: "2026-05-04T10:20:00.000Z",
      durationCompletedSeconds: 1200,
      completed: true,
    });
    expect(result?.nextHistory).toHaveLength(BASE_HISTORY.length + 1);
    expect(result?.nextHistory[0]).toEqual(result?.entry);
  });

  it("marks a partial session incomplete and keeps the completed drill subset", () => {
    const result = buildCompletion({
      finalCompletedDrillIds: ["drill_1", "drill_2"],
      finalCompletedDurationSec: 600,
      finalSessionXp: 90,
    });

    expect(result?.entry.completed).toBe(false);
    expect(result?.entry.completedDrillIds).toEqual(["drill_1", "drill_2"]);
    expect(result?.entry.durationCompletedSeconds).toBe(600);
  });

  it("creates drill snapshots from active drill ids and filters missing drills", () => {
    const result = buildCompletion({
      finalActiveDrillIds: ["drill_1", "missing_drill", "drill_3"],
      finalCompletedDrillIds: ["drill_1"],
      finalSessionXp: 40,
    });

    expect(result?.entry.drillsSnapshot).toEqual([
      { id: "drill_1", name: "Chromatic Warmup", durationSeconds: 240, targetBpm: 90 },
      { id: "drill_3", name: "Chord Change Sprint", durationSeconds: 300, targetBpm: 100 },
    ]);
  });

  it("computes unlocked badges from the same completion inputs", () => {
    const result = buildCompletion({
      currentUnlockedBadgeIds: ["b1"],
    });

    expect(result?.nextUnlockedBadgeIds).toEqual(["b1", "b2", "b3", "b4"]);
  });

  it("returns null when the selected template is missing", () => {
    const result = buildCompletion({
      selectedTemplate: null,
    });

    expect(result).toBeNull();
  });

  it("falls back to default time providers when explicit timestamps are omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:34:56.000Z"));
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-05-04T12:34:56.000Z"));

    const result = buildCompletion({
      nowMs: undefined,
      nowIso: undefined,
    });

    expect(result?.entry.startedAt).toBe("2026-05-04T12:14:56.000Z");
    expect(result?.entry.endedAt).toBe("2026-05-04T12:34:56.000Z");
  });
});
