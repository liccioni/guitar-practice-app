import { describe, expect, it } from "vitest";
import { buildProgressMilestones } from "../src/app/progressSignals";

describe("progress signals", () => {
  it("builds grounded progress milestones from tracked weekly activity", () => {
    expect(
      buildProgressMilestones({
        weeklySummary: {
          weekMinutes: 42,
          weekSessions: 3,
          weekDrillsCompleted: 8,
          completionRatePercent: 75,
          avgSessionMinutes: 14,
          weekMinutesDelta: 12,
        },
        streak: 5,
        averageBpm: 104,
      }),
    ).toEqual([
      {
        id: "weekly_minutes",
        title: "60 minute week",
        detail: "42/60 minutes practiced this week",
        progress: 70,
      },
      {
        id: "streak_days",
        title: "7 day streak",
        detail: "5/7 days in a row at your current goal",
        progress: 71,
      },
      {
        id: "tempo_history",
        title: "110 BPM average",
        detail: "104/110 BPM across tracked sessions",
        progress: 95,
      },
    ]);
  });

  it("frames missing tempo history honestly", () => {
    const milestones = buildProgressMilestones({
      weeklySummary: {
        weekMinutes: 0,
        weekSessions: 0,
        weekDrillsCompleted: 0,
        completionRatePercent: 0,
        avgSessionMinutes: 0,
        weekMinutesDelta: 0,
      },
      streak: 0,
      averageBpm: 0,
    });

    expect(milestones[2]).toEqual({
      id: "tempo_history",
      title: "Tempo baseline",
      detail: "Complete more BPM-based drills to unlock a reliable tempo trend.",
      progress: 0,
    });
  });
});
