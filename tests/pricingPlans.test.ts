import { describe, expect, it } from "vitest";
import {
  buildPricingPlanCards,
  buildPricingScreenSummary,
  createLocalPlanSelection,
} from "../src/app/pricingPlans";

describe("pricingPlans", () => {
  it("marks the current plan in the pricing cards", () => {
    const cards = buildPricingPlanCards("premium-monthly");

    expect(cards).toHaveLength(2);
    expect(cards[0]?.isCurrent).toBe(true);
    expect(cards[0]?.ctaLabel).toBe("Current plan");
    expect(cards[1]?.featured).toBe(true);
  });

  it("builds a free-user pricing summary", () => {
    const summary = buildPricingScreenSummary("free");

    expect(summary.eyebrow).toBe("Premium Practice");
    expect(summary.title).toContain("Choose");
    expect(summary.comparisonRows).toHaveLength(3);
  });

  it("creates local monthly entitlements with an expiry", () => {
    const selection = createLocalPlanSelection("premium-monthly", "2026-03-16T10:00:00.000Z");

    expect(selection.planId).toBe("premium-monthly");
    expect(selection.billingProvider).toBe("local");
    expect(selection.activatedAt).toBe("2026-03-16T10:00:00.000Z");
    expect(selection.expiresAt).toBe("2026-04-15T10:00:00.000Z");
  });

  it("creates local lifetime entitlements without an expiry", () => {
    const selection = createLocalPlanSelection("premium-lifetime", "2026-03-16T10:00:00.000Z");

    expect(selection.planId).toBe("premium-lifetime");
    expect(selection.expiresAt).toBeUndefined();
  });
});
