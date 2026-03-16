import type { PracticeOnboardingAnswers } from "../domain/profile/onboarding";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";
import type { Drill } from "../domain/exercises/types";

export type AnalyticsEvent =
  | {
      name: "onboarding_completed";
      params: PracticeOnboardingAnswers & {
        recommendedMinutes: number;
        recommendationVersion: string;
      };
    }
  | {
      name: "starter_session_review_opened";
      params: {
        source: "onboarding";
        sessionName: string;
        recommendedMinutes: number;
        drillCount: number;
      };
    }
  | {
      name: "session_started";
      params: {
        source: "overview" | "builder" | "unknown";
        sessionTemplateId: string;
        sessionName: string;
        drillCount: number;
        plannedDurationSec: number;
      };
    }
  | {
      name: "drill_completed";
      params: {
        sessionTemplateId: string;
        sessionName: string;
        drillId: string;
        drillName: string;
        drillIndex: number;
        totalDrills: number;
        gainedXp: number;
        targetBpm: number | null;
      };
    }
  | {
      name: "session_completed";
      params: {
        sessionTemplateId: string;
        sessionName: string;
        completionState: "complete" | "partial";
        completedDrillCount: number;
        totalDrillCount: number;
        durationCompletedSec: number;
        elapsedSec: number;
        sessionXp: number;
      };
    }
  | {
      name: "upgrade_entry_opened";
      params: {
        entryPoint: string;
        sourceScreen: string;
      };
    }
  | {
      name: "conversion_step_viewed";
      params: {
        step: string;
        planId?: string;
      };
    };

export interface AnalyticsClient {
  track(event: AnalyticsEvent): void;
}

const NOOP_ANALYTICS_CLIENT: AnalyticsClient = {
  track(): void {
    // Intentionally empty until a provider is attached.
  },
};

let analyticsClient: AnalyticsClient = NOOP_ANALYTICS_CLIENT;

export function setAnalyticsClient(client: AnalyticsClient): void {
  analyticsClient = client;
}

export function resetAnalyticsClient(): void {
  analyticsClient = NOOP_ANALYTICS_CLIENT;
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  try {
    analyticsClient.track(event);
  } catch {
    // Analytics must never break the core practice flow.
  }
}

export function trackOnboardingCompleted(input: {
  answers: PracticeOnboardingAnswers;
  recommendedMinutes: number;
  recommendationVersion: string;
}): void {
  trackAnalyticsEvent({
    name: "onboarding_completed",
    params: {
      ...input.answers,
      recommendedMinutes: input.recommendedMinutes,
      recommendationVersion: input.recommendationVersion,
    },
  });
}

export function trackStarterSessionReviewOpened(input: {
  sessionName: string;
  recommendedMinutes: number;
  drillCount: number;
}): void {
  trackAnalyticsEvent({
    name: "starter_session_review_opened",
    params: {
      source: "onboarding",
      sessionName: input.sessionName,
      recommendedMinutes: input.recommendedMinutes,
      drillCount: input.drillCount,
    },
  });
}

export function trackSessionStarted(input: {
  source: "overview" | "builder" | "unknown";
  template: SessionTemplate;
  drillCount: number;
}): void {
  trackAnalyticsEvent({
    name: "session_started",
    params: {
      source: input.source,
      sessionTemplateId: input.template.id,
      sessionName: input.template.name,
      drillCount: input.drillCount,
      plannedDurationSec: input.template.totalDurationSeconds,
    },
  });
}

export function trackDrillCompleted(input: {
  template: SessionTemplate;
  drill: Drill;
  drillIndex: number;
  totalDrills: number;
  gainedXp: number;
}): void {
  trackAnalyticsEvent({
    name: "drill_completed",
    params: {
      sessionTemplateId: input.template.id,
      sessionName: input.template.name,
      drillId: input.drill.id,
      drillName: input.drill.name,
      drillIndex: input.drillIndex,
      totalDrills: input.totalDrills,
      gainedXp: input.gainedXp,
      targetBpm: input.drill.targetBpm ?? null,
    },
  });
}

export function trackSessionCompleted(input: {
  template: SessionTemplate;
  completedDrillCount: number;
  totalDrillCount: number;
  durationCompletedSec: number;
  elapsedSec: number;
  sessionXp: number;
}): void {
  trackAnalyticsEvent({
    name: "session_completed",
    params: {
      sessionTemplateId: input.template.id,
      sessionName: input.template.name,
      completionState: input.completedDrillCount === input.totalDrillCount ? "complete" : "partial",
      completedDrillCount: input.completedDrillCount,
      totalDrillCount: input.totalDrillCount,
      durationCompletedSec: input.durationCompletedSec,
      elapsedSec: input.elapsedSec,
      sessionXp: input.sessionXp,
    },
  });
}
