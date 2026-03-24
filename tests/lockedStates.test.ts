import { describe, expect, it } from "vitest";
import { getFeatureGate } from "../src/domain/monetization/entitlements";
import { buildLockedStateCopy } from "../src/app/lockedStates";

describe("lockedStates", () => {
  it("builds card copy for locked premium content", () => {
    const gate = getFeatureGate({ planId: "free", billingProvider: "local" }, "premium-content");
    const copy = buildLockedStateCopy(gate, "card");

    expect(copy.eyebrow).toBe("Premium Access");
    expect(copy.title).toContain("locked");
    expect(copy.body).toContain("premium library");
    expect(copy.ctaLabel).toBe("Open Pricing");
  });

  it("builds action copy for locked advanced practice", () => {
    const gate = getFeatureGate({ planId: "free", billingProvider: "local" }, "advanced-practice");
    const copy = buildLockedStateCopy(gate, "action");

    expect(copy.eyebrow).toBe("Premium Action");
    expect(copy.title).toBe("Unlock advanced practice");
    expect(copy.ctaLabel).toBe("See Plans");
  });
});
