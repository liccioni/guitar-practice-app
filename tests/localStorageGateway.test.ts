import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPersistedState,
  parsePersistedState,
  PERSISTENCE_SCHEMA_VERSION,
  savePersistedState,
} from "../src/persistence/LocalStorageGateway";

const asyncStorageMock = vi.hoisted(() => {
  return {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageMock,
}));

describe("LocalStorageGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads parsed state from async storage", async () => {
    asyncStorageMock.getItem.mockResolvedValue(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 25,
            reminderEnabled: true,
            reminderTime: "20:10",
          },
          profile: {
            totalXp: 1500,
            unlockedBadgeIds: ["b3"],
          },
        },
      }),
    );

    const result = await loadPersistedState();
    expect(result.goalSettings.dailyMinutesTarget).toBe(25);
    expect(result.profile.totalXp).toBe(1500);
    expect(result.profile.unlockedBadgeIds).toEqual(["b3"]);
  });

  it("returns empty state when async get fails", async () => {
    asyncStorageMock.getItem.mockRejectedValue(new Error("read failed"));
    const result = await loadPersistedState();

    expect(result.drills).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.history).toEqual([]);
    expect(result.profile.totalXp).toBe(0);
    expect(result.profile.unlockedBadgeIds).toEqual([]);
  });

  it("saves versioned envelope", async () => {
    const state = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 30,
            reminderEnabled: false,
            reminderTime: "18:00",
          },
          profile: {
            totalXp: 300,
            unlockedBadgeIds: ["b4", "b4", "bad-id"],
          },
        },
      }),
    );

    await savePersistedState(state);

    expect(asyncStorageMock.setItem).toHaveBeenCalledOnce();
    const [, payload] = asyncStorageMock.setItem.mock.calls[0];
    expect(JSON.parse(payload).version).toBe(PERSISTENCE_SCHEMA_VERSION);
  });

  it("swallows async storage write errors", async () => {
    asyncStorageMock.setItem.mockRejectedValue(new Error("write failed"));

    await expect(
      savePersistedState({
        drills: [],
        templates: [],
        history: [],
        goalSettings: {
          dailyMinutesTarget: 30,
          reminderEnabled: false,
          reminderTime: "18:00",
        },
        profile: {
          totalXp: 0,
          unlockedBadgeIds: [],
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("sanitizes malformed persisted payloads", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [
            "bad-shape",
            {
              id: "bad-duration",
              name: "Bad",
              durationSeconds: 0,
              tags: [],
              createdAt: "",
              updatedAt: "",
            },
            {
              id: "good-drill",
              name: "  Good Drill ",
              durationSeconds: 300,
              targetBpm: 300,
              tags: ["warmup", 42],
              createdAt: "",
              updatedAt: "",
            },
          ],
          templates: [
            { id: "", name: "Invalid", drillIds: ["good-drill"] },
            {
              id: "t1",
              name: "  Template One ",
              drillIds: ["good-drill", "missing-id"],
              totalDurationSeconds: 999,
              isPreset: 1,
            },
          ],
          history: [
            "invalid-entry",
            {
              id: "h-invalid",
              sessionNameSnapshot: "No duration",
              startedAt: "2026-03-03T12:00:00.000Z",
              durationCompletedSeconds: -1,
              completed: true,
            },
            {
              id: "h1",
              sessionTemplateId: "",
              sessionNameSnapshot: "  Session ",
              drillsSnapshot: [
                { id: "snap-bad", name: "", durationSeconds: 60 },
                { id: "snap-1", name: " Snap ", durationSeconds: 120, targetBpm: 1000 },
              ],
              completedDrillIds: ["good-drill", "", 25],
              startedAt: "2026-03-03T12:00:00.000Z",
              endedAt: "",
              durationCompletedSeconds: 120,
              completed: 1,
            },
          ],
          goalSettings: {
            dailyMinutesTarget: 999,
            reminderEnabled: 1,
            reminderTime: "bad-time",
          },
          profile: {
            totalXp: -1,
            unlockedBadgeIds: ["b3", "", "b3", 25],
          },
        },
      }),
    );

    expect(parsed.drills).toHaveLength(1);
    expect(parsed.drills[0]?.name).toBe("Good Drill");
    expect(parsed.drills[0]?.targetBpm).toBeUndefined();

    expect(parsed.templates).toHaveLength(1);
    expect(parsed.templates[0]?.name).toBe("Template One");
    expect(parsed.templates[0]?.drillIds).toEqual(["good-drill"]);
    expect(parsed.templates[0]?.totalDurationSeconds).toBe(300);

    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0]?.sessionTemplateId).toBeUndefined();
    expect(parsed.history[0]?.sessionNameSnapshot).toBe("Session");
    expect(parsed.history[0]?.drillsSnapshot).toEqual([
      { id: "snap-1", name: "Snap", durationSeconds: 120, targetBpm: undefined },
    ]);
    expect(parsed.history[0]?.completedDrillIds).toEqual(["good-drill"]);
    expect(parsed.history[0]?.endedAt).toBeUndefined();
    expect(parsed.history[0]?.completed).toBe(true);

    expect(parsed.goalSettings.dailyMinutesTarget).toBe(30);
    expect(parsed.goalSettings.reminderEnabled).toBe(true);
    expect(parsed.goalSettings.reminderTime).toBe("18:00");

    expect(parsed.profile.totalXp).toBe(0);
    expect(parsed.profile.unlockedBadgeIds).toEqual(["b3"]);
  });
});
