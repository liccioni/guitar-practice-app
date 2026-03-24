import { describe, expect, it } from "vitest";
import { buildCurrentPlanSummary, restoreLocalPurchases } from "../src/app/planManagement";

describe("planManagement", () => {
  it("builds a free-plan summary", () => {
    const summary = buildCurrentPlanSummary({
      planId: "free",
      billingProvider: "local",
    });

    expect(summary.title).toBe("Free plan");
    expect(summary.statusLabel).toBe("No paid plan active");
    expect(summary.detail).toContain("Restore Purchases");
  });

  it("builds a monthly summary with renewal info", () => {
    const summary = buildCurrentPlanSummary({
      planId: "premium-monthly",
      billingProvider: "local",
      activatedAt: "2026-03-24T10:00:00.000Z",
      expiresAt: "2026-04-23T10:00:00.000Z",
    });

    expect(summary.title).toBe("Monthly plan");
    expect(summary.statusLabel).toBe("Active on this device");
    expect(summary.renewalLabel).toContain("2026");
  });

  it("returns a no-op restore message for free users", () => {
    expect(
      restoreLocalPurchases({
        planId: "free",
        billingProvider: "local",
      }),
    ).toEqual({
      restored: false,
      message: "No purchases were found to restore in this local preview yet.",
    });
  });

  it("returns an active-state restore message for premium users", () => {
    expect(
      restoreLocalPurchases({
        planId: "premium-lifetime",
        billingProvider: "local",
      }),
    ).toEqual({
      restored: true,
      message: "Lifetime plan already active on this device.",
    });
  });
});
