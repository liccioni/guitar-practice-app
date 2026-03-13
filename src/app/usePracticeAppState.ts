import { useEffect, useMemo, useState } from "react";
import { disableDailyReminder, parseReminderTime, scheduleDailyReminder } from "../application/reminders";
import { appendDrillToTemplate } from "../application/sessionBuilder";
import { createDrillFromInput, updateDrillFromInput } from "../domain/exercises/drill";
import type { CreateDrillInput, Drill, DrillRandomizerKind } from "../domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings, type GoalType } from "../domain/goals/types";
import {
  buildPracticeOnboardingSuggestion,
  DEFAULT_PRACTICE_ONBOARDING_STATE,
  ONBOARDING_RECOMMENDATION_VERSION,
  selectSuggestedDrills,
  type PracticeOnboardingAnswers,
  type PracticeOnboardingState,
} from "../domain/profile/onboarding";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
  type SessionTemplate,
} from "../domain/sessions/sessionTemplate";
import {
  loadPersistedState,
  savePersistedState,
  type PersistedPracticeState,
} from "../persistence/LocalStorageGateway";
import {
  buildBadgeState,
  createSeedState,
  DEFAULT_PROFILE,
  DRILL_POOL,
  getDefaultGoalTarget,
  makeId,
  normalizeGoalTarget,
  type Badge,
} from "./practiceAppStateHelpers";
export { buildBadgeState, makeId, type Badge } from "./practiceAppStateHelpers";

export type Screen = "home" | "songs" | "sessions" | "progress" | "profile" | "builder" | "active" | "complete";

function getUnlockedBadgeIds(badges: Badge[]): string[] {
  return badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
}

function pickRandomPoolDrill(): CreateDrillInput {
  return DRILL_POOL[Math.floor(Math.random() * DRILL_POOL.length)];
}

function buildDefaultDrillInput(index: number): CreateDrillInput {
  return {
    name: `New Drill ${index}`,
    durationMinutes: 5,
    targetBpm: 100,
    tags: ["warmup"],
  };
}

export function usePracticeAppState() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>("home");
  const [allDrills, setAllDrills] = useState<Drill[]>([]);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [history, setHistory] = useState<PersistedPracticeState["history"]>([]);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>(DEFAULT_GOAL_SETTINGS);

  const [templateNameInput, setTemplateNameInput] = useState("");
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [drillNameInput, setDrillNameInput] = useState("");
  const [drillDurationInput, setDrillDurationInput] = useState("");
  const [drillBpmInput, setDrillBpmInput] = useState("");
  const [drillRandomizerKindInput, setDrillRandomizerKindInput] = useState<"none" | DrillRandomizerKind>("none");
  const [drillRandomEveryBarsInput, setDrillRandomEveryBarsInput] = useState("2");

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [totalXp, setTotalXp] = useState(DEFAULT_PROFILE.totalXp);
  const [onboardingState, setOnboardingState] = useState<PracticeOnboardingState>(
    DEFAULT_PROFILE.onboarding,
  );
  const [badges, setBadges] = useState<Badge[]>(() => buildBadgeState(DEFAULT_PROFILE.unlockedBadgeIds));

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId) ?? templates[0],
    [activeTemplateId, templates],
  );

  const builderDrills = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.drillIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill));
  }, [allDrills, selectedTemplate]);

  const selectedBuilderDrill = useMemo(
    () => builderDrills.find((drill) => drill.id === selectedDrillId) ?? builderDrills[0],
    [builderDrills, selectedDrillId],
  );

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
        setBadges(buildBadgeState(seed.profile.unlockedBadgeIds));
        setActiveTemplateId(seed.templates[0]?.id ?? null);
        setTemplateNameInput(seed.templates[0]?.name ?? "");
        setSelectedDrillId(seed.templates[0]?.drillIds[0] ?? null);
      } catch {
        setStorageError("Failed to load local data. Using a fresh local session.");
        const seed = createSeedState(new Date().toISOString());
        setAllDrills(seed.drills);
        setTemplates(seed.templates);
        setHistory(seed.history);
        setGoalSettings(seed.goalSettings);
        setTotalXp(seed.profile.totalXp);
        setOnboardingState(seed.profile.onboarding ?? DEFAULT_PROFILE.onboarding);
        setBadges(buildBadgeState(seed.profile.unlockedBadgeIds));
        setActiveTemplateId(seed.templates[0]?.id ?? null);
        setTemplateNameInput(seed.templates[0]?.name ?? "");
        setSelectedDrillId(seed.templates[0]?.drillIds[0] ?? null);
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
      },
    });
  }, [allDrills, badges, goalSettings, history, isHydrated, onboardingState, templates, totalXp]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateNameInput(selectedTemplate.name);
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const exists = selectedTemplate.drillIds.includes(selectedDrillId ?? "");
    if (!exists) {
      setSelectedDrillId(selectedTemplate.drillIds[0] ?? null);
    }
  }, [selectedDrillId, selectedTemplate]);

  useEffect(() => {
    if (!selectedBuilderDrill) {
      setDrillNameInput("");
      setDrillDurationInput("");
      setDrillBpmInput("");
      setDrillRandomizerKindInput("none");
      setDrillRandomEveryBarsInput("2");
      return;
    }
    setDrillNameInput(selectedBuilderDrill.name);
    setDrillDurationInput(String(Math.max(1, Math.round(selectedBuilderDrill.durationSeconds / 60))));
    setDrillBpmInput(selectedBuilderDrill.targetBpm ? String(selectedBuilderDrill.targetBpm) : "");
    setDrillRandomizerKindInput(selectedBuilderDrill.randomizer?.kind ?? "none");
    setDrillRandomEveryBarsInput(String(selectedBuilderDrill.randomizer?.everyBars ?? 2));
  }, [selectedBuilderDrill]);

  function addSongToBuilder(song: {
    title: string;
    artist: string;
    durationMinutes: number;
    targetBpm: number;
    tags: CreateDrillInput["tags"];
  }): void {
    try {
      const nowIso = new Date().toISOString();
      const created = createDrillFromInput(
        makeId("drill"),
        {
          name: `${song.title} (${song.artist})`,
          durationMinutes: song.durationMinutes,
          targetBpm: song.targetBpm,
          tags: song.tags,
        },
        nowIso,
      );
      const result = appendDrillToTemplate({
        templates,
        activeTemplateId: activeTemplateId ?? null,
        drill: created,
        nowIso,
      });

      setAllDrills((current) => [...current, created]);
      setTemplates(result.templates);
      setActiveTemplateId(result.targetTemplateId);
      setSelectedDrillId(created.id);
      setBuilderError(null);
      setScreen("builder");
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not add song drill");
      setScreen("builder");
    }
  }

  function addDrillToTemplate(): void {
    try {
      const nowIso = new Date().toISOString();
      const nextIndex = builderDrills.length + 1;
      const created = createDrillFromInput(makeId("drill"), buildDefaultDrillInput(nextIndex), nowIso);
      const result = appendDrillToTemplate({
        templates,
        activeTemplateId: activeTemplateId ?? null,
        drill: created,
        nowIso,
      });

      setAllDrills((current) => [...current, created]);
      setTemplates(result.templates);
      setActiveTemplateId(result.targetTemplateId);
      setSelectedDrillId(created.id);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not add drill");
    }
  }

  function reorderDrillsInTemplate(nextDrillIds: string[]): void {
    if (!selectedTemplate) return;

    const normalizedIds = nextDrillIds.filter((id) => selectedTemplate.drillIds.includes(id));
    const reorderedDrills = normalizedIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill));

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              drillIds: normalizedIds,
              totalDurationSeconds: calculateTotalDurationSeconds(reorderedDrills),
              updatedAt: new Date().toISOString(),
            }
          : template,
      ),
    );
    setBuilderError(null);
  }

  function removeDrillFromTemplate(drillId: string): void {
    if (!selectedTemplate) return;

    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;
        const nextDrillIds = template.drillIds.filter((id) => id !== drillId);
        const nextDrills = nextDrillIds
          .map((id) => allDrills.find((drill) => drill.id === id))
          .filter((drill): drill is Drill => Boolean(drill));

        return {
          ...template,
          drillIds: nextDrillIds,
          totalDurationSeconds: calculateTotalDurationSeconds(nextDrills),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    if (selectedDrillId === drillId) {
      const nextId = selectedTemplate.drillIds.find((id) => id !== drillId) ?? null;
      setSelectedDrillId(nextId);
    }
  }

  function createTemplate(): void {
    try {
      const now = new Date().toISOString();
      const createdDrills: Drill[] = [createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now)];

      while (calculateTotalDurationSeconds(createdDrills) < 5 * 60) {
        createdDrills.push(createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now));
      }

      const template = createSessionTemplate({
        id: makeId("template"),
        name: `Session ${templates.length + 1}`,
        drillIds: createdDrills.map((drill) => drill.id),
        totalDurationSeconds: calculateTotalDurationSeconds(createdDrills),
        nowIso: now,
      });

      setAllDrills((current) => [...current, ...createdDrills]);
      setTemplates((current) => [...current, template]);
      setActiveTemplateId(template.id);
      setTemplateNameInput(template.name);
      setSelectedDrillId(createdDrills[0]?.id ?? null);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not create template");
    }
  }

  function duplicateTemplate(): void {
    if (!selectedTemplate) return;
    try {
      const now = new Date().toISOString();
      const duplicated = createSessionTemplate({
        id: makeId("template"),
        name: `${selectedTemplate.name} Copy`,
        drillIds: [...selectedTemplate.drillIds],
        totalDurationSeconds: selectedTemplate.totalDurationSeconds,
        isPreset: false,
        nowIso: now,
      });

      setTemplates((current) => [...current, duplicated]);
      setActiveTemplateId(duplicated.id);
      setTemplateNameInput(duplicated.name);
      setSelectedDrillId(duplicated.drillIds[0] ?? null);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not duplicate template");
    }
  }

  function saveTemplate(): void {
    if (!selectedTemplate) return;

    try {
      const now = new Date().toISOString();
      const selectedDrills = selectedTemplate.drillIds
        .map((id) => allDrills.find((drill) => drill.id === id))
        .filter((drill): drill is Drill => Boolean(drill));

      const validated = createSessionTemplate({
        id: selectedTemplate.id,
        name: templateNameInput,
        drillIds: selectedTemplate.drillIds,
        totalDurationSeconds: calculateTotalDurationSeconds(selectedDrills),
        isPreset: selectedTemplate.isPreset,
        nowIso: now,
      });

      setTemplates((current) =>
        current.map((template) =>
          template.id === selectedTemplate.id
            ? {
                ...validated,
                createdAt: template.createdAt,
                updatedAt: now,
              }
            : template,
        ),
      );

      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save template");
    }
  }

  function deleteTemplate(): void {
    if (!selectedTemplate) return;

    const remaining = templates.filter((template) => template.id !== selectedTemplate.id);
    setTemplates(remaining);
    setActiveTemplateId(remaining[0]?.id ?? null);
    setTemplateNameInput(remaining[0]?.name ?? "");
    setSelectedDrillId(remaining[0]?.drillIds[0] ?? null);
    setBuilderError(null);
  }

  function maybeAutoSaveDrillEdits(input: {
    name: string;
    duration: string;
    bpm: string;
    randomKind: "none" | DrillRandomizerKind;
    randomBars: string;
  }): void {
    if (!selectedBuilderDrill || !selectedTemplate) return;

    const durationMinutes = Number(input.duration.trim());
    const bpmRaw = input.bpm.trim();
    const randomBarsRaw = input.randomBars.trim();
    const parsedBpm = bpmRaw.length === 0 ? null : Number(bpmRaw);
    const parsedEveryBars = Number(randomBarsRaw);

    const hasValidName = input.name.trim().length > 0;
    const hasValidDuration = Number.isFinite(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 30;
    const hasValidBpm = parsedBpm === null || (Number.isFinite(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 240);
    const hasValidRandomBars =
      input.randomKind === "none" ||
      (Number.isFinite(parsedEveryBars) && parsedEveryBars >= 1 && parsedEveryBars <= 16);
    if (!hasValidName || !hasValidDuration || !hasValidBpm || !hasValidRandomBars) return;

    const randomizer =
      input.randomKind === "none"
        ? undefined
        : {
            kind: input.randomKind,
            everyBars: parsedEveryBars,
          };
    const nextBpm = parsedBpm === null ? undefined : parsedBpm;

    if (
      selectedBuilderDrill.name === input.name &&
      Math.round(selectedBuilderDrill.durationSeconds / 60) === durationMinutes &&
      selectedBuilderDrill.targetBpm === nextBpm &&
      selectedBuilderDrill.randomizer?.kind === randomizer?.kind &&
      selectedBuilderDrill.randomizer?.everyBars === randomizer?.everyBars
    ) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const updated = updateDrillFromInput(
        selectedBuilderDrill,
        {
          name: input.name,
          durationMinutes,
          targetBpm: nextBpm,
          randomizer,
        },
        nowIso,
      );

      setAllDrills((current) => current.map((drill) => (drill.id === selectedBuilderDrill.id ? updated : drill)));
      setTemplates((current) =>
        current.map((template) => {
          if (template.id !== selectedTemplate.id) return template;
          const nextDrills = template.drillIds
            .map((id) => (id === updated.id ? updated : allDrills.find((drill) => drill.id === id)))
            .filter((drill): drill is Drill => Boolean(drill));

          return {
            ...template,
            totalDurationSeconds: calculateTotalDurationSeconds(nextDrills),
            updatedAt: nowIso,
          };
        }),
      );
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not update drill");
    }
  }

  function handleDrillNameInput(value: string): void {
    setDrillNameInput(value);
    maybeAutoSaveDrillEdits({
      name: value,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillDurationInput(value: string): void {
    setDrillDurationInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: value,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillBpmInput(value: string): void {
    setDrillBpmInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: value,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillRandomizerKindInput(value: "none" | DrillRandomizerKind): void {
    setDrillRandomizerKindInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: value,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillRandomEveryBarsInput(value: string): void {
    setDrillRandomEveryBarsInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: value,
    });
  }

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

    const [min, max] =
      goalType === "minutes" ? [5, 300] : goalType === "sessions" ? [1, 20] : [1, 60];
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

  function resetToHome(): void {
    setScreen("home");
  }

  function navigateFromTab(next: "home" | "songs" | "sessions" | "progress" | "profile"): void {
    setScreen(next);
  }

  function startPracticeFlow(): void {
    setScreen("builder");
  }

  function saveOnboardingAnswers(answers: PracticeOnboardingAnswers): void {
    const suggestion = buildPracticeOnboardingSuggestion(answers);
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
    const now = new Date().toISOString();
    const suggestedInputs = selectSuggestedDrills(DRILL_POOL, onboardingSuggestion);
    const createdDrills = suggestedInputs.map((input) =>
      createDrillFromInput(makeId("drill"), input, now),
    );

    while (calculateTotalDurationSeconds(createdDrills) < 5 * 60) {
      createdDrills.push(createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now));
    }

    const template = createSessionTemplate({
      id: makeId("template"),
      name: onboardingSuggestion.sessionName,
      drillIds: createdDrills.map((drill) => drill.id),
      totalDurationSeconds: calculateTotalDurationSeconds(createdDrills),
      nowIso: now,
    });

    setAllDrills((current) => [...current, ...createdDrills]);
    setTemplates((current) => [...current, template]);
    setActiveTemplateId(template.id);
    setTemplateNameInput(template.name);
    setSelectedDrillId(createdDrills[0]?.id ?? null);
    setBuilderError(null);
    setScreen("builder");
  }

  function resetOnboardingQuestionnaire(): void {
    setOnboardingState(DEFAULT_PRACTICE_ONBOARDING_STATE);
  }

  return {
    activeTemplateId,
    addDrillToTemplate,
    addSongToBuilder,
    allDrills,
    applyOnboardingSuggestionToBuilder,
    badges,
    builderDrills,
    builderError,
    createTemplate,
    deleteTemplate,
    drillBpmInput,
    drillDurationInput,
    drillNameInput,
    drillRandomEveryBarsInput,
    drillRandomizerKindInput,
    duplicateTemplate,
    goalError,
    goalSettings,
    goalTarget,
    goalType,
    handleDrillBpmInput,
    handleDrillDurationInput,
    handleDrillNameInput,
    handleDrillRandomEveryBarsInput,
    handleDrillRandomizerKindInput,
    history,
    navigateFromTab,
    onboardingState,
    onboardingSuggestion,
    reminderError,
    removeDrillFromTemplate,
    reorderDrillsInTemplate,
    resetOnboardingQuestionnaire,
    resetToHome,
    saveGoalTarget,
    saveOnboardingAnswers,
    saveReminderTime,
    saveTemplate,
    screen,
    selectedBuilderDrill,
    selectedDrillId,
    selectedTemplate,
    setActiveTemplateId,
    setBadges,
    setBuilderError,
    setGoalType,
    setHistory,
    setScreen,
    setSelectedDrillId,
    setTemplateNameInput,
    setTotalXp,
    startPracticeFlow,
    storageError,
    templates,
    templateNameInput,
    toggleReminder,
    totalXp,
  };
}
