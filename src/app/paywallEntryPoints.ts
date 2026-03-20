import { getFeatureGate, type EntitlementFeatureId, type EntitlementPlanId } from "../domain/monetization/entitlements";

export type PaywallEntrySurface = "songs" | "overview" | "progress";

export interface PaywallEntryPoint {
  surface: PaywallEntrySurface;
  featureId: EntitlementFeatureId;
  title: string;
  body: string;
  ctaLabel: string;
}

interface BuildPaywallEntryPointParams {
  surface: PaywallEntrySurface;
  currentPlanId: EntitlementPlanId;
  streak?: number;
  completedSessions?: number;
}

export function buildPaywallEntryPoint(
  params: BuildPaywallEntryPointParams,
): PaywallEntryPoint | null {
  const { surface, currentPlanId, streak = 0, completedSessions = 0 } = params;

  if (currentPlanId !== "free") return null;

  if (surface === "songs") {
    const gate = getFeatureGate({ planId: currentPlanId, billingProvider: "local" }, "premium-content");
    return {
      surface,
      featureId: gate.featureId,
      title: "Unlock premium song packs",
      body: "You’re already browsing songs. Premium adds deeper packs and more focused content instead of scattering upgrades everywhere.",
      ctaLabel: gate.upgradeCtaLabel,
    };
  }

  if (surface === "overview") {
    const gate = getFeatureGate({ planId: currentPlanId, billingProvider: "local" }, "advanced-practice");
    return {
      surface,
      featureId: gate.featureId,
      title: "Upgrade this session into a guided premium flow",
      body: "You’re at the commit point. Premium can take this routine into advanced practice flows without interrupting the builder itself.",
      ctaLabel: gate.upgradeCtaLabel,
    };
  }

  if (completedSessions === 0 && streak < 3) {
    return null;
  }

  const gate = getFeatureGate({ planId: currentPlanId, billingProvider: "local" }, "advanced-practice");
  return {
    surface,
    featureId: gate.featureId,
    title: "Turn your momentum into a deeper practice system",
    body: "You’ve built enough consistency for premium practice flows to feel relevant. This is the right moment to surface the paid offer.",
    ctaLabel: gate.upgradeCtaLabel,
  };
}
