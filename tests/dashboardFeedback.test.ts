import { describe, expect, it } from "vitest";
import { buildDashboardFeedback } from "../src/app/dashboardFeedback";

describe("dashboard feedback", () => {
  it("frames remaining progress as a streak-saving action when a streak is active", () => {
    expect(
      buildDashboardFeedback({
        goalType: "minutes",
        goalCurrentValue: 12,
        goalTarget: 30,
        streak: 4,
      }),
    ).toEqual({
      heroSubtitle: "18 min keeps your 4-day streak alive.",
      goalStatusLabel: "18 min left today",
      goalStatusBody: "One more focused block closes the loop for today.",
      streakStatusLabel: "4-day streak in progress",
      streakStatusBody: "You do not need a perfect session. You only need today's target.",
    });
  });

  it("celebrates completion without adding pressure", () => {
    expect(
      buildDashboardFeedback({
        goalType: "sessions",
        goalCurrentValue: 1,
        goalTarget: 1,
        streak: 6,
      }),
    ).toEqual({
      heroSubtitle: "Goal hit. Your 6-day streak is secure today.",
      goalStatusLabel: "Today's target is complete",
      goalStatusBody: "You can stop here or keep playing to build extra momentum.",
      streakStatusLabel: "6-day streak maintained",
      streakStatusBody: "Come back tomorrow to keep the chain moving.",
    });
  });

  it("nudges a fresh start when no streak is active", () => {
    expect(
      buildDashboardFeedback({
        goalType: "drills",
        goalCurrentValue: 1,
        goalTarget: 4,
        streak: 0,
      }),
    ).toEqual({
      heroSubtitle: "3 drills starts a new streak today.",
      goalStatusLabel: "3 drills to hit today's target",
      goalStatusBody: "A small session today is enough to create momentum.",
      streakStatusLabel: "No active streak yet",
      streakStatusBody: "Today is the easiest time to start one.",
    });
  });
});
