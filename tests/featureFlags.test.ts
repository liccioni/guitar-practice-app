import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_DEFINITIONS,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
} from "../src/domain/features/flags";

describe("feature flags", () => {
  it("enables every defined flag by default", () => {
    expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual(
      FEATURE_FLAG_DEFINITIONS.map((definition) => definition.id).sort(),
    );

    for (const definition of FEATURE_FLAG_DEFINITIONS) {
      expect(DEFAULT_FEATURE_FLAGS[definition.id]).toBe(true);
    }
  });

  it("normalizes invalid payloads back to defaults", () => {
    expect(normalizeFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(
      normalizeFeatureFlags({
        pricing_screen: false,
        session_overview: "nope",
        contextual_paywalls: true,
      }),
    ).toEqual({
      ...DEFAULT_FEATURE_FLAGS,
      pricing_screen: false,
      contextual_paywalls: true,
    });
  });

  it("reads enabled state with a safe default fallback", () => {
    expect(isFeatureFlagEnabled(DEFAULT_FEATURE_FLAGS, "pricing_screen")).toBe(true);
    expect(
      isFeatureFlagEnabled({ ...DEFAULT_FEATURE_FLAGS, drill_transition_audio_cues: false }, "drill_transition_audio_cues"),
    ).toBe(false);
    expect(
      isFeatureFlagEnabled({ pricing_screen: undefined } as never, "pricing_screen"),
    ).toBe(true);
  });
});
