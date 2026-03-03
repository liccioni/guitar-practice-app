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
        },
      }),
    );

    const result = await loadPersistedState();
    expect(result.goalSettings.dailyMinutesTarget).toBe(25);
  });

  it("returns empty state when async get fails", async () => {
    asyncStorageMock.getItem.mockRejectedValue(new Error("read failed"));
    const result = await loadPersistedState();

    expect(result.drills).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.history).toEqual([]);
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
      }),
    ).resolves.toBeUndefined();
  });
});
