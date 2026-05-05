import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_DEFINITIONS,
  LAUNCH_CANDIDATE_FEATURE_FLAGS,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
} from "../src/domain/features/flags";

describe("feature flags", () => {
  it("matches the launch candidate profile by default", () => {
    expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual(
      FEATURE_FLAG_DEFINITIONS.map((definition) => definition.id).sort(),
    );
    expect(DEFAULT_FEATURE_FLAGS).toEqual(LAUNCH_CANDIDATE_FEATURE_FLAGS);
  });

  it("honors valid persisted flag values", () => {
    expect(
      normalizeFeatureFlags({
        pricing_screen: true,
        contextual_paywalls: true,
        drill_transition_audio_cues: false,
        session_overview: false,
      }),
    ).toEqual({
      ...DEFAULT_FEATURE_FLAGS,
      pricing_screen: true,
      contextual_paywalls: true,
      drill_transition_audio_cues: false,
      session_overview: false,
    });
  });

  it("normalizes invalid or missing payload values back to launch defaults", () => {
    expect(normalizeFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(
      normalizeFeatureFlags({
        pricing_screen: "yes",
        session_overview: "nope",
        contextual_paywalls: undefined,
      }),
    ).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("reads enabled state with a safe default fallback", () => {
    expect(isFeatureFlagEnabled(DEFAULT_FEATURE_FLAGS, "pricing_screen")).toBe(false);
    expect(
      isFeatureFlagEnabled({ ...DEFAULT_FEATURE_FLAGS, pricing_screen: true }, "pricing_screen"),
    ).toBe(true);
    expect(
      isFeatureFlagEnabled({ pricing_screen: undefined } as never, "pricing_screen"),
    ).toBe(false);
  });
});
