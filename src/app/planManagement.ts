import type { EntitlementState } from "../domain/monetization/entitlements";

export interface CurrentPlanSummary {
  title: string;
  statusLabel: string;
  detail: string;
  renewalLabel?: string;
}

export interface RestorePurchasesResult {
  message: string;
  restored: boolean;
}

function formatPlanName(planId: EntitlementState["planId"]): string {
  if (planId === "premium-lifetime") return "Lifetime";
  if (planId === "premium-monthly") return "Monthly";
  return "Free";
}

function formatDateLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildCurrentPlanSummary(entitlements: EntitlementState): CurrentPlanSummary {
  const planName = formatPlanName(entitlements.planId);
  const activatedLabel = formatDateLabel(entitlements.activatedAt);
  const expiresLabel = formatDateLabel(entitlements.expiresAt);

  if (entitlements.planId === "premium-monthly") {
    return {
      title: `${planName} plan`,
      statusLabel: "Active on this device",
      detail: activatedLabel
        ? `Started ${activatedLabel}. This local preview is ready for a future restore/subscription backend.`
        : "Active now. This local preview is ready for a future restore/subscription backend.",
      renewalLabel: expiresLabel ? `Renews ${expiresLabel}` : undefined,
    };
  }

  if (entitlements.planId === "premium-lifetime") {
    return {
      title: `${planName} plan`,
      statusLabel: "Unlocked on this device",
      detail: activatedLabel
        ? `Activated ${activatedLabel}. Lifetime access does not renew.`
        : "Lifetime access is active on this device.",
    };
  }

  return {
    title: `${planName} plan`,
    statusLabel: "No paid plan active",
    detail: "You can compare plans here and use Restore Purchases once billing is wired to a real store provider.",
  };
}

export function restoreLocalPurchases(entitlements: EntitlementState): RestorePurchasesResult {
  if (entitlements.planId === "premium-monthly") {
    return {
      restored: true,
      message: "Monthly plan already active on this device.",
    };
  }

  if (entitlements.planId === "premium-lifetime") {
    return {
      restored: true,
      message: "Lifetime plan already active on this device.",
    };
  }

  return {
    restored: false,
    message: "No purchases were found to restore in this local preview yet.",
  };
}
