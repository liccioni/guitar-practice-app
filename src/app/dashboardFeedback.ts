import type { GoalType } from "../domain/goals/types";

export interface DashboardFeedback {
  heroSubtitle: string;
  goalStatusLabel: string;
  goalStatusBody: string;
  streakStatusLabel: string;
  streakStatusBody: string;
}

export function buildDashboardFeedback(input: {
  goalType: GoalType;
  goalCurrentValue: number;
  goalTarget: number;
  streak: number;
}): DashboardFeedback {
  const current = Math.max(0, input.goalCurrentValue);
  const target = Math.max(1, Math.round(input.goalTarget));
  const streak = Math.max(0, input.streak);
  const remaining = Math.max(0, target - current);

  if (current >= target) {
    return {
      heroSubtitle:
        streak > 0
          ? `Goal hit. Your ${streak}-day streak is secure today.`
          : "Goal hit. Today is already a win.",
      goalStatusLabel: "Today's target is complete",
      goalStatusBody: "You can stop here or keep playing to build extra momentum.",
      streakStatusLabel:
        streak > 0 ? `${streak}-day streak maintained` : "Today counts toward a new streak",
      streakStatusBody:
        streak > 0
          ? "Come back tomorrow to keep the chain moving."
          : "A second day in a row turns this into a streak.",
    };
  }

  const remainingLabel = formatGoalAmount(input.goalType, remaining);

  if (streak > 0) {
    return {
      heroSubtitle: `${remainingLabel} keeps your ${streak}-day streak alive.`,
      goalStatusLabel: `${remainingLabel} left today`,
      goalStatusBody: "One more focused block closes the loop for today.",
      streakStatusLabel: `${streak}-day streak in progress`,
      streakStatusBody: "You do not need a perfect session. You only need today's target.",
    };
  }

  return {
    heroSubtitle: `${remainingLabel} starts a new streak today.`,
    goalStatusLabel: `${remainingLabel} to hit today's target`,
    goalStatusBody: "A small session today is enough to create momentum.",
    streakStatusLabel: "No active streak yet",
    streakStatusBody: "Today is the easiest time to start one.",
  };
}

function formatGoalAmount(goalType: GoalType, value: number): string {
  if (goalType === "minutes") return `${value} min${value === 1 ? "" : ""}`;
  if (goalType === "sessions") return `${value} session${value === 1 ? "" : "s"}`;
  return `${value} drill${value === 1 ? "" : "s"}`;
}
