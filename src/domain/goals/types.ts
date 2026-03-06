export type GoalType = "minutes" | "sessions" | "drills";

export interface GoalSettings {
  dailyMinutesTarget: number;
  goalType?: GoalType;
  goalTarget?: number;
  reminderEnabled: boolean;
  reminderTime: string;
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  dailyMinutesTarget: 30,
  goalType: "minutes",
  goalTarget: 30,
  reminderEnabled: false,
  reminderTime: "18:00",
};
