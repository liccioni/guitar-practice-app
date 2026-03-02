export interface GoalSettings {
  dailyMinutesTarget: number;
  reminderEnabled: boolean;
  reminderTime: string;
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  dailyMinutesTarget: 30,
  reminderEnabled: false,
  reminderTime: "18:00",
};
