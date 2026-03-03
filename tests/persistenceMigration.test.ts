import { describe, expect, it } from "vitest";
import {
  parsePersistedState,
  PERSISTENCE_SCHEMA_VERSION,
} from "../src/persistence/LocalStorageGateway";

describe("persistence migration", () => {
  it("parses current versioned envelope", () => {
    const raw = JSON.stringify({
      version: PERSISTENCE_SCHEMA_VERSION,
      state: {
        drills: [
          {
            id: "d1",
            name: "Warmup",
            durationSeconds: 300,
            tags: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
        templates: [],
        history: [],
        goalSettings: { dailyMinutesTarget: 20, reminderEnabled: true, reminderTime: "19:30" },
      },
    });

    const parsed = parsePersistedState(raw);
    expect(parsed.drills).toHaveLength(1);
    expect(parsed.goalSettings.dailyMinutesTarget).toBe(20);
  });

  it("migrates legacy direct payload", () => {
    const raw = JSON.stringify({
      drills: [],
      templates: [],
      history: [],
    });

    const parsed = parsePersistedState(raw);
    expect(parsed.goalSettings.dailyMinutesTarget).toBe(30);
    expect(parsed.goalSettings.reminderEnabled).toBe(false);
  });

  it("falls back to empty state on invalid json", () => {
    const parsed = parsePersistedState("not-json");
    expect(parsed.drills).toEqual([]);
    expect(parsed.templates).toEqual([]);
    expect(parsed.history).toEqual([]);
  });

  it("drops malformed drills and invalid template drill references", () => {
    const raw = JSON.stringify({
      version: PERSISTENCE_SCHEMA_VERSION,
      state: {
        drills: [
          {
            id: "valid",
            name: "Warmup",
            durationSeconds: 300,
            tags: [],
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "broken",
            name: "Broken",
            durationSeconds: "NaN",
            tags: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
        templates: [
          {
            id: "t1",
            name: "Template",
            drillIds: ["valid", "missing", "broken"],
            totalDurationSeconds: 9999,
            isPreset: false,
            createdAt: "",
            updatedAt: "",
          },
        ],
        history: [],
        goalSettings: { dailyMinutesTarget: 20, reminderEnabled: true, reminderTime: "19:30" },
      },
    });

    const parsed = parsePersistedState(raw);
    expect(parsed.drills.map((drill) => drill.id)).toEqual(["valid"]);
    expect(parsed.templates[0]?.drillIds).toEqual(["valid"]);
    expect(parsed.templates[0]?.totalDurationSeconds).toBe(300);
  });
});
