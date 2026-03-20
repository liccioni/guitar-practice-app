import { describe, expect, it } from "vitest";
import { buildPaywallEntryPoint } from "../src/app/paywallEntryPoints";

describe("paywallEntryPoints", () => {
  it("returns a songs entry point for free users", () => {
    const entry = buildPaywallEntryPoint({
      surface: "songs",
      currentPlanId: "free",
    });

    expect(entry?.surface).toBe("songs");
    expect(entry?.featureId).toBe("premium-content");
    expect(entry?.ctaLabel).toBe("Unlock premium content");
  });

  it("returns an overview entry point for free users", () => {
    const entry = buildPaywallEntryPoint({
      surface: "overview",
      currentPlanId: "free",
    });

    expect(entry?.surface).toBe("overview");
    expect(entry?.featureId).toBe("advanced-practice");
  });

  it("only returns a progress entry point after meaningful momentum", () => {
    expect(
      buildPaywallEntryPoint({
        surface: "progress",
        currentPlanId: "free",
        streak: 1,
        completedSessions: 0,
      }),
    ).toBeNull();

    expect(
      buildPaywallEntryPoint({
        surface: "progress",
        currentPlanId: "free",
        streak: 3,
        completedSessions: 1,
      })?.surface,
    ).toBe("progress");
  });

  it("does not return paywall entries for premium plans", () => {
    expect(
      buildPaywallEntryPoint({
        surface: "songs",
        currentPlanId: "premium-monthly",
      }),
    ).toBeNull();
  });
});
