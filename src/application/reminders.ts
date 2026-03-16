import * as Notifications from "expo-notifications";

export interface ReminderTime {
  hour: number;
  minute: number;
}

export function parseReminderTime(value: string): ReminderTime {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error("Reminder time must be HH:MM");

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Reminder time must be a valid 24-hour time");
  }

  return { hour, minute };
}

export async function scheduleDailyReminder(time: string): Promise<void> {
  const parsed = parseReminderTime(time);

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const asked = await Notifications.requestPermissionsAsync();
    if (!asked.granted) throw new Error("Notification permission denied");
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Fretline",
      body: "Time for your Fretline practice session.",
      sound: true,
    },
    trigger: {
      hour: parsed.hour,
      minute: parsed.minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });
}

export async function disableDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
