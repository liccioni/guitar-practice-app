export type EntitlementPlanId = "free" | "premium-monthly" | "premium-lifetime";

export type EntitlementFeatureId =
  | "advanced-practice"
  | "premium-content"
  | "plan-management"
  | "priority-support";

export interface EntitlementState {
  planId: EntitlementPlanId;
  billingProvider: "local";
  activatedAt?: string;
  expiresAt?: string;
}

export interface FeatureGate {
  featureId: EntitlementFeatureId;
  allowed: boolean;
  requiredPlanId: Extract<EntitlementPlanId, "premium-monthly" | "premium-lifetime">;
  currentPlanId: EntitlementPlanId;
  upgradeCtaLabel: string;
  reason: string;
}

interface FeatureDefinition {
  label: string;
  upgradeCtaLabel: string;
  reason: string;
}

const PREMIUM_PLAN_IDS: EntitlementPlanId[] = ["premium-monthly", "premium-lifetime"];

const FEATURE_DEFINITIONS: Record<EntitlementFeatureId, FeatureDefinition> = {
  "advanced-practice": {
    label: "Advanced practice flows",
    upgradeCtaLabel: "Unlock advanced practice",
    reason: "This flow is reserved for premium practice sessions.",
  },
  "premium-content": {
    label: "Premium content",
    upgradeCtaLabel: "Unlock premium content",
    reason: "This content is part of the premium library.",
  },
  "plan-management": {
    label: "Plan management",
    upgradeCtaLabel: "Manage your plan",
    reason: "Plan management is available once a premium plan is active.",
  },
  "priority-support": {
    label: "Priority support",
    upgradeCtaLabel: "Unlock priority support",
    reason: "Priority support is reserved for premium members.",
  },
};

export const DEFAULT_ENTITLEMENT_STATE: EntitlementState = {
  planId: "free",
  billingProvider: "local",
};

export function isPremiumPlan(planId: EntitlementPlanId): boolean {
  return PREMIUM_PLAN_IDS.includes(planId);
}

export function hasFeatureAccess(
  state: EntitlementState,
  featureId: EntitlementFeatureId,
): boolean {
  return getFeatureGate(state, featureId).allowed;
}

export function getFeatureGate(
  state: EntitlementState,
  featureId: EntitlementFeatureId,
): FeatureGate {
  const definition = FEATURE_DEFINITIONS[featureId];
  const allowed = isPremiumPlan(state.planId);

  return {
    featureId,
    allowed,
    requiredPlanId: "premium-monthly",
    currentPlanId: state.planId,
    upgradeCtaLabel: definition.upgradeCtaLabel,
    reason: allowed ? `${definition.label} is available on your current plan.` : definition.reason,
  };
}
