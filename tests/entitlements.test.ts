import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENTITLEMENT_STATE,
  getFeatureGate,
  hasFeatureAccess,
  isPremiumPlan,
  type EntitlementState,
} from "../src/domain/monetization/entitlements";

describe("entitlements", () => {
  it("defaults to a local free plan", () => {
    expect(DEFAULT_ENTITLEMENT_STATE).toEqual({
      planId: "free",
      billingProvider: "local",
    });
  });

  it("treats monthly and lifetime plans as premium", () => {
    expect(isPremiumPlan("free")).toBe(false);
    expect(isPremiumPlan("premium-monthly")).toBe(true);
    expect(isPremiumPlan("premium-lifetime")).toBe(true);
  });

  it("blocks premium features for free users with upgrade metadata", () => {
    const gate = getFeatureGate(DEFAULT_ENTITLEMENT_STATE, "premium-content");

    expect(gate.allowed).toBe(false);
    expect(gate.currentPlanId).toBe("free");
    expect(gate.requiredPlanId).toBe("premium-monthly");
    expect(gate.upgradeCtaLabel).toBe("Unlock premium content");
    expect(gate.reason).toContain("premium library");
  });

  it("allows premium features for premium plans", () => {
    const premiumState: EntitlementState = {
      planId: "premium-lifetime",
      billingProvider: "local",
      activatedAt: "2026-03-16T09:00:00.000Z",
    };

    expect(hasFeatureAccess(premiumState, "advanced-practice")).toBe(true);
    expect(getFeatureGate(premiumState, "advanced-practice").reason).toContain("available");
  });
});
