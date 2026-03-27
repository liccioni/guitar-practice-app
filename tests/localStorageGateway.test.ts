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
          drills: [
            {
              id: "d1",
              name: "Warmup",
              durationSeconds: 300,
              cue: { mode: "fixed-note" },
              tags: [],
              createdAt: "",
              updatedAt: "",
            },
          ],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 25,
            goalType: "sessions",
            goalTarget: 2,
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
    expect(result.goalSettings.goalType).toBe("sessions");
    expect(result.goalSettings.goalTarget).toBe(2);
    expect(result.drills[0]?.cue).toEqual({ mode: "fixed-note" });
    expect(result.profile.totalXp).toBe(1500);
    expect(result.profile.unlockedBadgeIds).toEqual(["b3"]);
    expect(result.profile.entitlements.planId).toBe("free");
    expect(result.profile.drillCueMode).toBe("chime");
    expect(result.profile.featureFlags.pricing_screen).toBe(true);
  });

  it("returns empty state when async get fails", async () => {
    asyncStorageMock.getItem.mockRejectedValue(new Error("read failed"));
    const result = await loadPersistedState();

    expect(result.drills).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.history).toEqual([]);
    expect(result.profile.totalXp).toBe(0);
    expect(result.profile.unlockedBadgeIds).toEqual([]);
    expect(result.profile.entitlements.planId).toBe("free");
    expect(result.profile.drillCueMode).toBe("chime");
    expect(result.profile.featureFlags.pricing_screen).toBe(true);
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
          onboarding: { completed: false },
          entitlements: { planId: "free", billingProvider: "local" },
          drillCueMode: "chime",
          featureFlags: {
            pricing_screen: true,
            session_overview: true,
            drill_complete_transition: true,
            drill_transition_audio_cues: true,
            dashboard_feedback_loops: true,
            xp_visibility: true,
            progress_signal_refresh: true,
            dashboard_goal_reminder_card: true,
            contextual_paywalls: true,
            locked_premium_states: true,
            drag_reorder_builder: true,
            compact_builder_editor: true,
            onboarding_handoff_v2: true,
          },
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
              id: "",
              name: "No id",
              durationSeconds: 300,
              tags: [],
              createdAt: "",
              updatedAt: "",
            },
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
            cue: { mode: "circle-of-fourths", everyBars: 2 },
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
            goalType: "invalid",
            goalTarget: 999,
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
    expect(parsed.drills[0]?.cue).toEqual({ mode: "circle-of-fourths", everyBars: 2 });

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
    expect(parsed.goalSettings.goalType).toBe("minutes");
    expect(parsed.goalSettings.goalTarget).toBe(30);
    expect(parsed.goalSettings.reminderEnabled).toBe(true);
    expect(parsed.goalSettings.reminderTime).toBe("18:00");

    expect(parsed.profile.totalXp).toBe(0);
    expect(parsed.profile.unlockedBadgeIds).toEqual(["b3"]);
    expect(parsed.profile.entitlements.planId).toBe("free");
    expect(parsed.profile.drillCueMode).toBe("chime");
    expect(parsed.profile.featureFlags.pricing_screen).toBe(true);
  });

  it("returns empty state for invalid or empty persisted payload", () => {
    expect(parsePersistedState(null).drills).toEqual([]);
    expect(parsePersistedState("not-json").templates).toEqual([]);

    const versionWithoutState = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
      }),
    );
    expect(versionWithoutState.history).toEqual([]);
  });

  it("migrates legacy direct payload and preserves valid goals/profile fields", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        drills: [
          {
            id: "d1",
            name: " Drill ",
            description: "  desc  ",
            durationSeconds: 300,
            targetBpm: 120,
            tags: ["a", "a", 1],
            randomizer: { kind: "note", everyBars: 3 },
            createdAt: "c",
            updatedAt: "u",
          },
        ],
        templates: [{ id: "t1", name: " T ", drillIds: ["d1"], isPreset: false }],
        history: [
          {
            id: "h1",
            sessionTemplateId: "t1",
            sessionNameSnapshot: " Session ",
            drillsSnapshot: [{ id: "d1", name: " Drill ", durationSeconds: 300, targetBpm: 120 }],
            completedDrillIds: ["d1"],
            startedAt: "2026-03-03T12:00:00.000Z",
            endedAt: "2026-03-03T12:05:00.000Z",
            durationCompletedSeconds: 300,
            completed: true,
          },
        ],
        goalSettings: {
          dailyMinutesTarget: 45,
          goalType: "drills",
          goalTarget: 7,
          reminderEnabled: false,
          reminderTime: "19:30",
        },
        profile: {
          totalXp: 42.8,
          unlockedBadgeIds: ["b1", "b2", "b1"],
        },
      }),
    );

    expect(parsed.drills[0]?.name).toBe("Drill");
    expect(parsed.drills[0]?.description).toBe("desc");
    expect(parsed.drills[0]?.randomizer).toEqual({ kind: "note", everyBars: 3 });
    expect(parsed.templates[0]?.totalDurationSeconds).toBe(300);
    expect(parsed.history[0]?.sessionNameSnapshot).toBe("Session");
    expect(parsed.goalSettings.goalType).toBe("drills");
    expect(parsed.goalSettings.goalTarget).toBe(7);
    expect(parsed.goalSettings.reminderTime).toBe("19:30");
    expect(parsed.profile.totalXp).toBe(43);
    expect(parsed.profile.unlockedBadgeIds).toEqual(["b1", "b2"]);
    expect(parsed.profile.entitlements.planId).toBe("free");
    expect(parsed.profile.drillCueMode).toBe("chime");
    expect(parsed.profile.featureFlags.pricing_screen).toBe(true);
  });

  it("normalizes goal target defaults per goal type and invalid reminder format", () => {
    const sessionsGoal = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 30,
            goalType: "sessions",
            goalTarget: Number.NaN,
            reminderEnabled: true,
            reminderTime: "25:99",
          },
        },
      }),
    );

    const drillsGoal = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 30,
            goalType: "drills",
            goalTarget: Number.NaN,
            reminderEnabled: true,
            reminderTime: "00:00",
          },
        },
      }),
    );

    expect(sessionsGoal.goalSettings.goalTarget).toBe(1);
    expect(sessionsGoal.goalSettings.reminderTime).toBe("25:99");
    expect(drillsGoal.goalSettings.goalTarget).toBe(4);
    expect(drillsGoal.goalSettings.reminderTime).toBe("00:00");
  });

  it("covers sanitizer fallback branches for optional/invalid field shapes", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [
            {
            id: "d-fallback",
            name: "Fallback",
            description: 42,
            durationSeconds: 300,
            targetBpm: 120,
            tags: "not-array",
            randomizer: { kind: "unknown", everyBars: 99 },
            cue: { mode: "circle-of-fifths", everyBars: 99 },
            createdAt: 1,
            updatedAt: null,
          },
        ],
          templates: [
            {
              id: "t-fallback",
              name: "Fallback",
              drillIds: "not-array",
              isPreset: true,
              createdAt: 1,
              updatedAt: null,
            },
          ],
          history: [
            {
              id: "h-missing-start",
              sessionNameSnapshot: "Bad",
              durationCompletedSeconds: 10,
              completed: false,
            },
            {
              id: "h-no-arrays",
              sessionNameSnapshot: "No Arrays",
              startedAt: "2026-03-03T12:00:00.000Z",
              drillsSnapshot: "bad",
              completedDrillIds: "bad",
              durationCompletedSeconds: 60,
              completed: true,
              endedAt: "2026-03-03T12:01:00.000Z",
            },
            {
              id: "h-bad-snap-duration",
              sessionNameSnapshot: "Bad Snap",
              startedAt: "2026-03-03T12:00:00.000Z",
              drillsSnapshot: [{ id: "d1", name: "X", durationSeconds: 0 }],
              completedDrillIds: [],
              durationCompletedSeconds: 60,
              completed: false,
            },
          ],
          goalSettings: {
            dailyMinutesTarget: 30,
            goalType: "minutes",
            goalTarget: 30,
            reminderEnabled: 1,
            reminderTime: 999,
          },
          profile: {
            totalXp: 12,
            unlockedBadgeIds: "not-array",
          },
        },
      }),
    );

    expect(parsed.drills[0]?.tags).toEqual([]);
    expect(parsed.drills[0]?.description).toBeUndefined();
    expect(parsed.drills[0]?.randomizer).toBeUndefined();
    expect(parsed.drills[0]?.cue).toBeUndefined();
    expect(parsed.drills[0]?.createdAt).toBe("");
    expect(parsed.drills[0]?.updatedAt).toBe("");
    expect(parsed.templates[0]?.drillIds).toEqual([]);
    expect(parsed.templates[0]?.createdAt).toBe("");
    expect(parsed.history).toHaveLength(2);
    expect(parsed.history[0]?.drillsSnapshot).toEqual([]);
    expect(parsed.history[1]?.drillsSnapshot).toEqual([]);
    expect(parsed.goalSettings.reminderTime).toBe("18:00");
    expect(parsed.profile.unlockedBadgeIds).toEqual([]);
    expect(parsed.profile.onboarding.completed).toBe(false);
    expect(parsed.profile.entitlements.planId).toBe("free");
    expect(parsed.profile.drillCueMode).toBe("chime");
    expect(parsed.profile.featureFlags.pricing_screen).toBe(true);
  });

  it("preserves valid onboarding answers and drops invalid ones", () => {
    const valid = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 30,
            goalType: "minutes",
            goalTarget: 30,
            reminderEnabled: false,
            reminderTime: "18:00",
          },
          profile: {
            totalXp: 10,
            unlockedBadgeIds: [],
            onboarding: {
              completed: true,
              answers: {
                level: "intermediate",
                durationMinutes: 30,
                focus: "technique",
                outcome: "speed",
                weeklyFrequencyDays: 5,
                practicePreference: "balanced",
              },
              lastSuggestedTemplateName: "Starter",
              onboardingCompletedAt: "2026-03-10T10:00:00.000Z",
              recommendationVersion: "v2",
            },
          },
        },
      }),
    );

    const invalid = parsePersistedState(
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
            totalXp: 10,
            unlockedBadgeIds: [],
            onboarding: {
              completed: true,
              answers: {
                level: "wrong",
                durationMinutes: 999,
                focus: "none",
                outcome: "none",
              },
            },
          },
        },
      }),
    );

    expect(valid.profile.onboarding.completed).toBe(true);
    expect(valid.profile.onboarding.answers?.level).toBe("intermediate");
    expect(valid.profile.onboarding.answers?.weeklyFrequencyDays).toBe(5);
    expect(valid.profile.onboarding.answers?.practicePreference).toBe("balanced");
    expect(valid.profile.onboarding.lastSuggestedTemplateName).toBe("Starter");
    expect(valid.profile.onboarding.onboardingCompletedAt).toBe("2026-03-10T10:00:00.000Z");
    expect(valid.profile.onboarding.recommendationVersion).toBe("v2");
    expect(invalid.profile.onboarding.completed).toBe(true);
    expect(invalid.profile.onboarding.answers).toBeUndefined();
  });

  it("drops invalid onboarding metadata fields while preserving completion state", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        state: {
          drills: [],
          templates: [],
          history: [],
          goalSettings: {
            dailyMinutesTarget: 30,
            goalType: "minutes",
            goalTarget: 30,
            reminderEnabled: false,
            reminderTime: "18:00",
          },
          profile: {
            totalXp: 0,
            unlockedBadgeIds: [],
            onboarding: {
              completed: true,
              onboardingCompletedAt: "   ",
              recommendationVersion: "",
            },
          },
        },
      }),
    );

    expect(parsed.profile.onboarding.completed).toBe(true);
    expect(parsed.profile.onboarding.onboardingCompletedAt).toBeUndefined();
    expect(parsed.profile.onboarding.recommendationVersion).toBeUndefined();
  });

  it("preserves valid local entitlement state and drops invalid plans", () => {
    const valid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            entitlements: {
              planId: "premium-lifetime",
              billingProvider: "storekit",
              activatedAt: "2026-03-16T08:00:00.000Z",
              expiresAt: "2027-03-16T08:00:00.000Z",
            },
          },
        },
      }),
    );

    const invalid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            entitlements: {
              planId: "enterprise",
              activatedAt: "   ",
            },
          },
        },
      }),
    );

    expect(valid.profile.entitlements).toEqual({
      planId: "premium-lifetime",
      billingProvider: "local",
      activatedAt: "2026-03-16T08:00:00.000Z",
      expiresAt: "2027-03-16T08:00:00.000Z",
    });
    expect(invalid.profile.entitlements).toEqual({
      planId: "free",
      billingProvider: "local",
      activatedAt: undefined,
      expiresAt: undefined,
    });
  });

  it("preserves valid drill cue settings and falls back for invalid ones", () => {
    const valid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            drillCueMode: "spoken",
          },
        },
      }),
    );

    const invalid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            drillCueMode: "sirens",
          },
        },
      }),
    );

    expect(valid.profile.drillCueMode).toBe("spoken");
    expect(invalid.profile.drillCueMode).toBe("chime");
  });

  it("preserves valid feature flags and falls back for invalid ones", () => {
    const valid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            featureFlags: {
              pricing_screen: false,
              session_overview: false,
            },
          },
        },
      }),
    );

    const invalid = parsePersistedState(
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
            totalXp: 0,
            unlockedBadgeIds: [],
            featureFlags: {
              pricing_screen: "no",
            },
          },
        },
      }),
    );

    expect(valid.profile.featureFlags.pricing_screen).toBe(false);
    expect(valid.profile.featureFlags.session_overview).toBe(false);
    expect(invalid.profile.featureFlags.pricing_screen).toBe(true);
  });
});
