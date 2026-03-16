import type { EntitlementPlanId, EntitlementState } from "../domain/monetization/entitlements";

export interface PricingPlanCard {
  planId: Extract<EntitlementPlanId, "premium-monthly" | "premium-lifetime">;
  name: string;
  priceLabel: string;
  billingLabel: string;
  kicker: string;
  savingsLabel?: string;
  featured: boolean;
  isCurrent: boolean;
  highlights: string[];
  ctaLabel: string;
}

export interface PricingScreenSummary {
  eyebrow: string;
  title: string;
  subtitle: string;
  comparisonRows: { label: string; free: string; premium: string }[];
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function buildPricingPlanCards(currentPlanId: EntitlementPlanId): PricingPlanCard[] {
  return [
    {
      planId: "premium-monthly",
      name: "Monthly",
      priceLabel: "$8.99",
      billingLabel: "per month",
      kicker: "Best for trying the full premium flow without a long commitment.",
      featured: false,
      isCurrent: currentPlanId === "premium-monthly",
      highlights: ["Advanced practice flows", "Premium song and session content", "Plan management surface"],
      ctaLabel: currentPlanId === "premium-monthly" ? "Current plan" : "Choose Monthly",
    },
    {
      planId: "premium-lifetime",
      name: "Lifetime",
      priceLabel: "$119",
      billingLabel: "one-time",
      kicker: "Best value if Fretline is part of your long-term practice routine.",
      savingsLabel: "Best value",
      featured: true,
      isCurrent: currentPlanId === "premium-lifetime",
      highlights: ["Everything in Monthly", "No recurring renewal", "Fits serious long-term practice"],
      ctaLabel: currentPlanId === "premium-lifetime" ? "Current plan" : "Choose Lifetime",
    },
  ];
}

export function buildPricingScreenSummary(currentPlanId: EntitlementPlanId): PricingScreenSummary {
  return {
    eyebrow: currentPlanId === "free" ? "Premium Practice" : "Manage Your Plan",
    title: currentPlanId === "free" ? "Choose the premium setup that fits your routine." : "Your premium practice is active.",
    subtitle:
      currentPlanId === "free"
        ? "Monthly keeps the commitment light. Lifetime is the simple long-term option."
        : "You can review plans here and keep the offer readable from any upgrade entry point.",
    comparisonRows: [
      { label: "Practice flows", free: "Core builder + sessions", premium: "Advanced guided flows" },
      { label: "Content access", free: "Starter drills and songs", premium: "Full premium library" },
      { label: "Plan tools", free: "Not available", premium: "Plan state and future restore flow" },
    ],
  };
}

export function createLocalPlanSelection(
  planId: EntitlementPlanId,
  nowIso: string,
): EntitlementState {
  if (planId === "free") {
    return {
      planId: "free",
      billingProvider: "local",
    };
  }

  return {
    planId,
    billingProvider: "local",
    activatedAt: nowIso,
    expiresAt: planId === "premium-monthly" ? new Date(Date.parse(nowIso) + MONTH_MS).toISOString() : undefined,
  };
}
