import { useEffect, useState } from "react";
import type { Drill } from "../domain/exercises/types";
import type { DrillCueMode } from "../application/drillCueAudio";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings } from "../domain/goals/types";
import {
  getFeatureGate,
  hasFeatureAccess,
  type EntitlementFeatureId,
  type EntitlementState,
} from "../domain/monetization/entitlements";
import {
  type PracticeOnboardingState,
} from "../domain/profile/onboarding";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";
import {
  loadPersistedState,
  savePersistedState,
  type PersistedPracticeState,
} from "../persistence/LocalStorageGateway";
import {
  buildBadgeState,
  createSeedState,
  DEFAULT_PROFILE,
  type Badge,
} from "./practiceAppStateHelpers";
import { useBuilderState } from "./useBuilderState";
import { useProfileSettingsState } from "./useProfileSettingsState";
export { buildBadgeState, makeId, type Badge } from "./practiceAppStateHelpers";

export type Screen =
  | "home"
  | "songs"
  | "sessions"
  | "progress"
  | "profile"
  | "pricing"
  | "builder"
  | "overview"
  | "active"
  | "complete";

function getUnlockedBadgeIds(badges: Badge[]): string[] {
  return badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
}

export function usePracticeAppState() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>("home");
  const [allDrills, setAllDrills] = useState<Drill[]>([]);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [history, setHistory] = useState<PersistedPracticeState["history"]>([]);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>(DEFAULT_GOAL_SETTINGS);

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [totalXp, setTotalXp] = useState(DEFAULT_PROFILE.totalXp);
  const [onboardingState, setOnboardingState] = useState<PracticeOnboardingState>(
    DEFAULT_PROFILE.onboarding,
  );
  const [entitlements, setEntitlements] = useState<EntitlementState>(DEFAULT_PROFILE.entitlements);
  const [drillCueMode, setDrillCueMode] = useState<DrillCueMode>(DEFAULT_PROFILE.drillCueMode);
  const [badges, setBadges] = useState<Badge[]>(() => buildBadgeState(DEFAULT_PROFILE.unlockedBadgeIds));

  useEffect(() => {
    const run = async () => {
      try {
        const persisted = await loadPersistedState();
        const hasData =
          persisted.drills.length > 0 || persisted.templates.length > 0 || persisted.history.length > 0;
        let seed = hasData ? persisted : createSeedState(new Date().toISOString());

        const needsRecovery =
          seed.drills.length === 0 ||
          seed.templates.length === 0 ||
          seed.templates.every((template) => template.drillIds.length === 0);
        if (needsRecovery) {
          seed = createSeedState(new Date().toISOString());
          setStorageError("Local data was invalid and has been reset to a safe starter session.");
        }

        setAllDrills(seed.drills);
        setTemplates(seed.templates);
        setHistory(seed.history);
        setGoalSettings(seed.goalSettings);
        setTotalXp(seed.profile.totalXp);
        setOnboardingState(seed.profile.onboarding ?? DEFAULT_PROFILE.onboarding);
        setEntitlements(seed.profile.entitlements ?? DEFAULT_PROFILE.entitlements);
        setDrillCueMode(seed.profile.drillCueMode ?? DEFAULT_PROFILE.drillCueMode);
        setBadges(buildBadgeState(seed.profile.unlockedBadgeIds));
        setActiveTemplateId(seed.templates[0]?.id ?? null);
      } catch {
        setStorageError("Failed to load local data. Using a fresh local session.");
        const seed = createSeedState(new Date().toISOString());
        setAllDrills(seed.drills);
        setTemplates(seed.templates);
        setHistory(seed.history);
        setGoalSettings(seed.goalSettings);
        setTotalXp(seed.profile.totalXp);
        setOnboardingState(seed.profile.onboarding ?? DEFAULT_PROFILE.onboarding);
        setEntitlements(seed.profile.entitlements ?? DEFAULT_PROFILE.entitlements);
        setDrillCueMode(seed.profile.drillCueMode ?? DEFAULT_PROFILE.drillCueMode);
        setBadges(buildBadgeState(seed.profile.unlockedBadgeIds));
        setActiveTemplateId(seed.templates[0]?.id ?? null);
      } finally {
        setIsHydrated(true);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    savePersistedState({
      drills: allDrills,
      templates,
      history,
      goalSettings,
      profile: {
        totalXp,
        unlockedBadgeIds: getUnlockedBadgeIds(badges),
        onboarding: onboardingState,
        entitlements,
        drillCueMode,
      },
    });
  }, [allDrills, badges, drillCueMode, entitlements, goalSettings, history, isHydrated, onboardingState, templates, totalXp]);

  function resetToHome(): void {
    setScreen("home");
  }

  function navigateFromTab(next: "home" | "songs" | "sessions" | "progress" | "profile"): void {
    setScreen(next);
  }

  function startPracticeFlow(): void {
    setScreen("builder");
  }

  function canAccessFeature(featureId: EntitlementFeatureId): boolean {
    return hasFeatureAccess(entitlements, featureId);
  }

  function getFeatureAvailability(featureId: EntitlementFeatureId) {
    return getFeatureGate(entitlements, featureId);
  }

  const builderState = useBuilderState({
    activeTemplateId,
    allDrills,
    setAllDrills,
    setActiveTemplateId,
    setScreen,
    templates,
    setTemplates,
  });

  const profileSettingsState = useProfileSettingsState({
    goalSettings,
    setGoalSettings,
    onboardingState,
    setOnboardingState,
    onApplySuggestedSession: builderState.applySuggestedSession,
  });

  return {
    activeTemplateId,
    addDrillToTemplate: builderState.addDrillToTemplate,
    addSongToBuilder: builderState.addSongToBuilder,
    allDrills,
    applyOnboardingSuggestionToBuilder: profileSettingsState.applyOnboardingSuggestionToBuilder,
    badges,
    builderDrills: builderState.builderDrills,
    builderError: builderState.builderError,
    canAccessFeature,
    createTemplate: builderState.createTemplate,
    deleteTemplate: builderState.deleteTemplate,
    drillCueMode,
    drillBpmInput: builderState.drillBpmInput,
    drillDurationInput: builderState.drillDurationInput,
    drillNameInput: builderState.drillNameInput,
    drillRandomEveryBarsInput: builderState.drillRandomEveryBarsInput,
    drillRandomizerKindInput: builderState.drillRandomizerKindInput,
    duplicateTemplate: builderState.duplicateTemplate,
    entitlements,
    getFeatureAvailability,
    goalError: profileSettingsState.goalError,
    goalSettings,
    goalTarget: profileSettingsState.goalTarget,
    goalType: profileSettingsState.goalType,
    handleDrillBpmInput: builderState.handleDrillBpmInput,
    handleDrillDurationInput: builderState.handleDrillDurationInput,
    handleDrillNameInput: builderState.handleDrillNameInput,
    handleDrillRandomEveryBarsInput: builderState.handleDrillRandomEveryBarsInput,
    handleDrillRandomizerKindInput: builderState.handleDrillRandomizerKindInput,
    history,
    navigateFromTab,
    onboardingState,
    onboardingSuggestion: profileSettingsState.onboardingSuggestion,
    reminderError: profileSettingsState.reminderError,
    removeDrillFromTemplate: builderState.removeDrillFromTemplate,
    reorderDrillsInTemplate: builderState.reorderDrillsInTemplate,
    resetOnboardingQuestionnaire: profileSettingsState.resetOnboardingQuestionnaire,
    resetToHome,
    saveGoalTarget: profileSettingsState.saveGoalTarget,
    saveOnboardingAnswers: profileSettingsState.saveOnboardingAnswers,
    saveReminderTime: profileSettingsState.saveReminderTime,
    saveTemplate: builderState.saveTemplate,
    screen,
    selectedBuilderDrill: builderState.selectedBuilderDrill,
    selectedDrillId: builderState.selectedDrillId,
    selectedTemplate: builderState.selectedTemplate,
    setActiveTemplateId,
    setBadges,
    setBuilderError: builderState.setBuilderError,
    setDrillCueMode,
    setEntitlements,
    setGoalType: profileSettingsState.setGoalType,
    setHistory,
    setScreen,
    setSelectedDrillId: builderState.setSelectedDrillId,
    setTemplateNameInput: builderState.setTemplateNameInput,
    setTotalXp,
    startPracticeFlow,
    storageError,
    templates,
    templateNameInput: builderState.templateNameInput,
    toggleReminder: profileSettingsState.toggleReminder,
    totalXp,
  };
}
