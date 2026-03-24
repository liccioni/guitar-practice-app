import type { FeatureGate } from "../domain/monetization/entitlements";

export interface LockedStateCopy {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
}

export function buildLockedStateCopy(
  gate: FeatureGate,
  variant: "card" | "action",
): LockedStateCopy {
  if (variant === "action") {
    return {
      eyebrow: "Premium Action",
      title: gate.upgradeCtaLabel,
      body: gate.reason,
      ctaLabel: "See Plans",
    };
  }

  return {
    eyebrow: "Premium Access",
    title:
      gate.featureId === "premium-content"
        ? "This content is locked on the free plan."
        : gate.featureId === "advanced-practice"
          ? "This flow is locked on the free plan."
          : "This area is locked on the free plan.",
    body: gate.reason,
    ctaLabel: "Open Pricing",
  };
}
