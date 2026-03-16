import { useMemo, useState } from "react";
import { disableDailyReminder, parseReminderTime, scheduleDailyReminder } from "../application/reminders";
import {
  trackOnboardingCompleted,
  trackStarterSessionReviewOpened,
} from "./analytics";
import type { CreateDrillInput } from "../domain/exercises/types";
import type { GoalSettings, GoalType } from "../domain/goals/types";
import {
  buildPracticeOnboardingSuggestion,
  DEFAULT_PRACTICE_ONBOARDING_STATE,
  ONBOARDING_RECOMMENDATION_VERSION,
  selectSuggestedDrills,
  type PracticeOnboardingAnswers,
  type PracticeOnboardingState,
} from "../domain/profile/onboarding";
import { DRILL_POOL, getDefaultGoalTarget, normalizeGoalTarget } from "./practiceAppStateHelpers";

interface UseProfileSettingsStateInput {
  goalSettings: GoalSettings;
  setGoalSettings: React.Dispatch<React.SetStateAction<GoalSettings>>;
  onboardingState: PracticeOnboardingState;
  setOnboardingState: React.Dispatch<React.SetStateAction<PracticeOnboardingState>>;
  onApplySuggestedSession: (params: {
    sessionName: string;
    suggestedInputs: CreateDrillInput[];
    destinationScreen?: "builder" | "overview";
  }) => void;
}

function getGoalBounds(goalType: GoalType): [number, number] {
  if (goalType === "minutes") return [5, 300];
  if (goalType === "sessions") return [1, 20];
  return [1, 60];
}

export function useProfileSettingsState({
  goalSettings,
  setGoalSettings,
  onboardingState,
  setOnboardingState,
  onApplySuggestedSession,
}: UseProfileSettingsStateInput) {
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const goalType: GoalType = goalSettings.goalType ?? "minutes";
  const goalTarget = normalizeGoalTarget(
    goalType,
    goalSettings.goalTarget ?? getDefaultGoalTarget(goalType, goalSettings.dailyMinutesTarget),
    goalSettings.dailyMinutesTarget,
  );

  const onboardingSuggestion = useMemo(() => {
    if (!onboardingState.answers) return null;
    return buildPracticeOnboardingSuggestion(onboardingState.answers);
  }, [onboardingState.answers]);

  async function toggleReminder(): Promise<void> {
    setReminderError(null);
    const nextEnabled = !goalSettings.reminderEnabled;

    try {
      if (nextEnabled) {
        await scheduleDailyReminder(goalSettings.reminderTime);
      } else {
        await disableDailyReminder();
      }

      setGoalSettings((current) => ({
        ...current,
        reminderEnabled: nextEnabled,
      }));
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : "Could not update reminders");
    }
  }

  async function saveReminderTime(reminderTime: string): Promise<void> {
    setReminderError(null);

    try {
      parseReminderTime(reminderTime);
      if (goalSettings.reminderEnabled) {
        await scheduleDailyReminder(reminderTime);
      }

      setGoalSettings((current) => ({
        ...current,
        reminderTime,
      }));
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : "Could not save reminder time");
    }
  }

  function setGoalType(nextGoalType: GoalType): void {
    setGoalError(null);
    setGoalSettings((current) => {
      const nextTarget = normalizeGoalTarget(
        nextGoalType,
        current.goalTarget ?? getDefaultGoalTarget(nextGoalType, current.dailyMinutesTarget),
        current.dailyMinutesTarget,
      );
      return {
        ...current,
        goalType: nextGoalType,
        goalTarget: nextTarget,
        dailyMinutesTarget: nextGoalType === "minutes" ? nextTarget : current.dailyMinutesTarget,
      };
    });
  }

  function saveGoalTarget(rawTarget: string): void {
    const numeric = Number(rawTarget.trim());
    if (!Number.isFinite(numeric)) {
      setGoalError("Goal target must be a number.");
      return;
    }

    const [min, max] = getGoalBounds(goalType);
    if (numeric < min || numeric > max) {
      setGoalError(`Goal target must be between ${min} and ${max}.`);
      return;
    }

    const normalized = normalizeGoalTarget(goalType, numeric, goalSettings.dailyMinutesTarget);
    setGoalSettings((current) => ({
      ...current,
      goalType,
      goalTarget: normalized,
      dailyMinutesTarget: goalType === "minutes" ? normalized : current.dailyMinutesTarget,
    }));
    setGoalError(null);
  }

  function saveOnboardingAnswers(answers: PracticeOnboardingAnswers): void {
    const suggestion = buildPracticeOnboardingSuggestion(answers);
    trackOnboardingCompleted({
      answers,
      recommendedMinutes: suggestion.recommendedMinutes,
      recommendationVersion: ONBOARDING_RECOMMENDATION_VERSION,
    });
    setOnboardingState({
      completed: true,
      answers,
      lastSuggestedTemplateName: suggestion.sessionName,
      onboardingCompletedAt: new Date().toISOString(),
      recommendationVersion: ONBOARDING_RECOMMENDATION_VERSION,
    });
    setGoalSettings((current) => ({
      ...current,
      goalType: "minutes",
      goalTarget: suggestion.recommendedMinutes,
      dailyMinutesTarget: suggestion.recommendedMinutes,
    }));
  }

  function applyOnboardingSuggestionToBuilder(): void {
    if (!onboardingSuggestion) return;
    trackStarterSessionReviewOpened({
      sessionName: onboardingSuggestion.sessionName,
      recommendedMinutes: onboardingSuggestion.recommendedMinutes,
      drillCount: onboardingSuggestion.drillCount,
    });
    onApplySuggestedSession({
      sessionName: onboardingSuggestion.sessionName,
      suggestedInputs: selectSuggestedDrills(DRILL_POOL, onboardingSuggestion),
      destinationScreen: "overview",
    });
  }

  function resetOnboardingQuestionnaire(): void {
    setOnboardingState(DEFAULT_PRACTICE_ONBOARDING_STATE);
  }

  return {
    applyOnboardingSuggestionToBuilder,
    goalError,
    goalTarget,
    goalType,
    onboardingSuggestion,
    reminderError,
    resetOnboardingQuestionnaire,
    saveGoalTarget,
    saveOnboardingAnswers,
    saveReminderTime,
    setGoalType,
    toggleReminder,
  };
}
