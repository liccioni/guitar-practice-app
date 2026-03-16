import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetAnalyticsClient,
  setAnalyticsClient,
  trackAnalyticsEvent,
  trackOnboardingCompleted,
  trackSessionCompleted,
  trackSessionStarted,
  trackStarterSessionReviewOpened,
} from "../src/app/analytics";
import type { SessionTemplate } from "../src/domain/sessions/sessionTemplate";

const TEMPLATE: SessionTemplate = {
  id: "template_1",
  name: "Starter Session",
  drillIds: ["drill_1", "drill_2"],
  totalDurationSeconds: 720,
  isPreset: false,
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T10:00:00.000Z",
};

afterEach(() => {
  resetAnalyticsClient();
});

describe("analytics contract", () => {
  it("forwards provider-agnostic funnel events to the configured client", () => {
    const track = vi.fn();
    setAnalyticsClient({ track });

    trackOnboardingCompleted({
      answers: {
        level: "beginner",
        durationMinutes: 30,
        focus: "technique",
        outcome: "consistency",
        weeklyFrequencyDays: 5,
        practicePreference: "balanced",
      },
      recommendedMinutes: 35,
      recommendationVersion: "v2",
    });

    trackStarterSessionReviewOpened({
      sessionName: "Beginner technique 30m",
      recommendedMinutes: 35,
      drillCount: 4,
    });

    trackSessionStarted({
      source: "overview",
      template: TEMPLATE,
      drillCount: 2,
    });

    trackSessionCompleted({
      template: TEMPLATE,
      completedDrillCount: 2,
      totalDrillCount: 2,
      durationCompletedSec: 720,
      elapsedSec: 720,
      sessionXp: 90,
    });

    expect(track).toHaveBeenCalledTimes(4);
    expect(track).toHaveBeenNthCalledWith(1, {
      name: "onboarding_completed",
      params: expect.objectContaining({
        level: "beginner",
        recommendedMinutes: 35,
        recommendationVersion: "v2",
      }),
    });
    expect(track).toHaveBeenNthCalledWith(2, {
      name: "starter_session_review_opened",
      params: {
        source: "onboarding",
        sessionName: "Beginner technique 30m",
        recommendedMinutes: 35,
        drillCount: 4,
      },
    });
    expect(track).toHaveBeenNthCalledWith(3, {
      name: "session_started",
      params: {
        source: "overview",
        sessionTemplateId: "template_1",
        sessionName: "Starter Session",
        drillCount: 2,
        plannedDurationSec: 720,
      },
    });
    expect(track).toHaveBeenNthCalledWith(4, {
      name: "session_completed",
      params: {
        sessionTemplateId: "template_1",
        sessionName: "Starter Session",
        completionState: "complete",
        completedDrillCount: 2,
        totalDrillCount: 2,
        durationCompletedSec: 720,
        elapsedSec: 720,
        sessionXp: 90,
      },
    });
  });

  it("swallows provider failures so analytics cannot break the app flow", () => {
    setAnalyticsClient({
      track(): void {
        throw new Error("provider down");
      },
    });

    expect(() =>
      trackAnalyticsEvent({
        name: "upgrade_entry_opened",
        params: {
          entryPoint: "session_complete",
          sourceScreen: "complete",
        },
      }),
    ).not.toThrow();
  });
});
