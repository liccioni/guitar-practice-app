import { beforeEach, describe, expect, it, vi } from "vitest";
import { disableDailyReminder, parseReminderTime, scheduleDailyReminder } from "../src/application/reminders";

const notificationsMock = vi.hoisted(() => {
  return {
    getPermissionsAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
    cancelAllScheduledNotificationsAsync: vi.fn(),
    scheduleNotificationAsync: vi.fn(),
    SchedulableTriggerInputTypes: {
      DAILY: "daily",
    },
  };
});

vi.mock("expo-notifications", () => notificationsMock);

describe("reminder scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsMock.getPermissionsAsync.mockResolvedValue({ granted: true });
    notificationsMock.requestPermissionsAsync.mockResolvedValue({ granted: true });
    notificationsMock.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    notificationsMock.scheduleNotificationAsync.mockResolvedValue("id_1");
  });

  it("parses valid HH:MM format", () => {
    expect(parseReminderTime("18:30")).toEqual({ hour: 18, minute: 30 });
  });

  it("rejects invalid reminder time", () => {
    expect(() => parseReminderTime("99:99")).toThrow("valid 24-hour time");
    expect(() => parseReminderTime("abc")).toThrow("HH:MM");
  });

  it("schedules reminder when permission already granted", async () => {
    await scheduleDailyReminder("07:45");

    expect(notificationsMock.getPermissionsAsync).toHaveBeenCalledOnce();
    expect(notificationsMock.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledOnce();
    expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalledOnce();

    expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          hour: 7,
          minute: 45,
          type: notificationsMock.SchedulableTriggerInputTypes.DAILY,
        }),
      }),
    );
  });

  it("requests permission when not already granted", async () => {
    notificationsMock.getPermissionsAsync.mockResolvedValue({ granted: false });

    await scheduleDailyReminder("09:00");

    expect(notificationsMock.requestPermissionsAsync).toHaveBeenCalledOnce();
    expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalledOnce();
  });

  it("throws when permission request is denied", async () => {
    notificationsMock.getPermissionsAsync.mockResolvedValue({ granted: false });
    notificationsMock.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(scheduleDailyReminder("09:00")).rejects.toThrow("Notification permission denied");
    expect(notificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("disables reminders by cancelling scheduled notifications", async () => {
    await disableDailyReminder();
    expect(notificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledOnce();
  });
});
