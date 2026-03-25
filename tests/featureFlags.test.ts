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

  it("normalizes invalid payloads back to defaults", () => {
    expect(normalizeFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(
      normalizeFeatureFlags({
        pricing_screen: true,
        session_overview: "nope",
        contextual_paywalls: true,
      }),
    ).toEqual({
      ...DEFAULT_FEATURE_FLAGS,
      pricing_screen: false,
      contextual_paywalls: false,
    });
  });

  it("reads enabled state with a safe default fallback", () => {
    expect(isFeatureFlagEnabled(DEFAULT_FEATURE_FLAGS, "pricing_screen")).toBe(false);
    expect(
      isFeatureFlagEnabled({ ...DEFAULT_FEATURE_FLAGS, drill_transition_audio_cues: false }, "drill_transition_audio_cues"),
    ).toBe(false);
    expect(
      isFeatureFlagEnabled({ pricing_screen: undefined } as never, "pricing_screen"),
    ).toBe(false);
  });
});
