import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PracticePipeline } from "./src/app/practicePipeline";
import {
  disableDailyReminder,
  parseReminderTime,
  scheduleDailyReminder,
} from "./src/app/reminders";
import type { Drill, DrillTag } from "./src/domain/exercises/types";
import { calculateDashboardMetrics } from "./src/domain/history/metrics";
import type { PracticeHistoryEntry } from "./src/domain/history/types";
import { clampBpm, getBeatIntervalMs, stepBpm } from "./src/domain/metronome/metronome";
import { calculateCurrentStreak } from "./src/domain/goals/streak";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings } from "./src/domain/goals/types";
import {
  advanceToNextSegment,
  createRuntimeState,
  getCurrentSegment,
  markCurrentSegmentComplete,
  pauseRuntime,
  resumeRuntime,
  skipCurrentSegment,
  startRuntime,
  tickRuntime,
  type RuntimeState,
} from "./src/domain/sessions/runtimeState";
import type { SessionTemplate } from "./src/domain/sessions/sessionTemplate";
import { InMemoryPracticeRepository } from "./src/persistence/InMemoryPracticeRepository";
import { loadPersistedState, savePersistedState } from "./src/persistence/LocalStorageGateway";

type ScreenKey = "onboarding" | "home" | "builder" | "run" | "history" | "goals";

interface ScreenConfig {
  key: ScreenKey;
  title: string;
}

const SCREENS: ScreenConfig[] = [
  { key: "onboarding", title: "Onboarding" },
  { key: "home", title: "Home" },
  { key: "builder", title: "Session Builder" },
  { key: "run", title: "Run Session" },
  { key: "history", title: "History" },
  { key: "goals", title: "Goals" },
];

const TAGS: DrillTag[] = ["warmup", "technique", "scales", "chords", "rhythm", "songs", "improv"];

interface Snapshot {
  drills: Drill[];
  templates: SessionTemplate[];
  history: PracticeHistoryEntry[];
}

export default function App() {
  const bootStartRef = useRef(Date.now());
  const repositoryRef = useRef(new InMemoryPracticeRepository());
  const pipelineRef = useRef(new PracticePipeline(repositoryRef.current));

  const [activeScreen, setActiveScreen] = useState<ScreenKey>("builder");
  const [snapshot, setSnapshot] = useState<Snapshot>({ drills: [], templates: [], history: [] });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drillName, setDrillName] = useState("");
  const [drillMinutes, setDrillMinutes] = useState("5");
  const [drillBpm, setDrillBpm] = useState("100");
  const [selectedTags, setSelectedTags] = useState<DrillTag[]>([]);

  const [templateName, setTemplateName] = useState("Daily Session");
  const [selectedDrillIds, setSelectedDrillIds] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedRunTemplateId, setSelectedRunTemplateId] = useState<string>("");
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [runtimeBpm, setRuntimeBpm] = useState<number>(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [beatCount, setBeatCount] = useState(0);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>(DEFAULT_GOAL_SETTINGS);
  const [goalMinutesInput, setGoalMinutesInput] = useState(
    String(DEFAULT_GOAL_SETTINGS.dailyMinutesTarget),
  );
  const [reminderTimeInput, setReminderTimeInput] = useState(DEFAULT_GOAL_SETTINGS.reminderTime);
  const [startupMs, setStartupMs] = useState<number | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showAdvancedRunControls, setShowAdvancedRunControls] = useState(false);
  const runtimeHistorySavedRef = useRef(false);

  const dashboardMetrics = useMemo(
    () =>
      calculateDashboardMetrics({
        entries: snapshot.history,
        nowIso: new Date().toISOString(),
        dailyMinutesTarget: goalSettings.dailyMinutesTarget,
      }),
    [goalSettings.dailyMinutesTarget, snapshot.history],
  );

  const currentStreak = useMemo(
    () => calculateCurrentStreak(snapshot.history, new Date().toISOString()),
    [snapshot.history],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      const persisted = await loadPersistedState();
      repositoryRef.current.importState(persisted);
      setGoalSettings(persisted.goalSettings);
      setGoalMinutesInput(String(persisted.goalSettings.dailyMinutesTarget));
      setReminderTimeInput(persisted.goalSettings.reminderTime);
      if (!isMounted) return;
      refreshSnapshot();
      setStartupMs(Date.now() - bootStartRef.current);
      setIsReady(true);
    }

    bootstrap().catch(() => {
      if (!isMounted) return;
      setError("Failed to load local data");
      setStartupMs(Date.now() - bootStartRef.current);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (snapshot.templates.length === 0) {
      setSelectedRunTemplateId("");
      return;
    }
    if (!snapshot.templates.some((template) => template.id === selectedRunTemplateId)) {
      setSelectedRunTemplateId(snapshot.templates[0].id);
    }
  }, [selectedRunTemplateId, snapshot.templates]);

  useEffect(() => {
    if (runtimeState?.status !== "running") return;

    const intervalId = setInterval(() => {
      setRuntimeState((current) => (current ? tickRuntime(current, 1) : current));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [runtimeState?.status]);

  useEffect(() => {
    if (!runtimeState || runtimeState.status === "finished") {
      setMetronomeEnabled(false);
    }
  }, [runtimeState, runtimeState?.status]);

  useEffect(() => {
    if (!runtimeState) return;
    const currentSegment = getCurrentSegment(runtimeState);
    if (currentSegment?.targetBpm !== undefined) {
      setRuntimeBpm(clampBpm(currentSegment.targetBpm));
    }
  }, [runtimeState, runtimeState?.templateId, runtimeState?.currentIndex]);

  useEffect(() => {
    if (!runtimeState || runtimeState.status !== "running" || !metronomeEnabled) return;

    const intervalMs = getBeatIntervalMs(runtimeBpm);
    const intervalId = setInterval(() => {
      setBeatCount((current) => current + 1);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [
    metronomeEnabled,
    runtimeBpm,
    runtimeState,
    runtimeState?.status,
    runtimeState?.templateId,
    runtimeState?.currentIndex,
  ]);

  useEffect(() => {
    async function persistFinishedRuntime(): Promise<void> {
      if (!runtimeState || runtimeState.status !== "finished" || runtimeHistorySavedRef.current)
        return;

      const entry: PracticeHistoryEntry = {
        id: `history_${Date.now()}`,
        sessionTemplateId: runtimeState.templateId,
        sessionNameSnapshot: runtimeState.templateName,
        drillsSnapshot: runtimeState.segments.map((segment) => ({
          id: segment.drillId,
          name: segment.name,
          durationSeconds: segment.durationSeconds,
          targetBpm: segment.targetBpm,
        })),
        completedDrillIds: runtimeState.completedDrillIds,
        startedAt: runtimeState.startedAt,
        endedAt: new Date().toISOString(),
        durationCompletedSeconds: runtimeState.durationCompletedSeconds,
        completed: runtimeState.completedDrillIds.length === runtimeState.segments.length,
      };

      repositoryRef.current.saveHistory(entry);
      refreshSnapshot();
      await savePersistedState({
        ...repositoryRef.current.exportState(),
        goalSettings,
      });
      runtimeHistorySavedRef.current = true;
    }

    void persistFinishedRuntime();
  }, [goalSettings, runtimeState]);

  function refreshSnapshot(): void {
    setSnapshot(repositoryRef.current.exportState());
  }

  const persistCurrentState = useCallback(
    async (nextGoalSettings: GoalSettings = goalSettings): Promise<void> => {
      try {
        await savePersistedState({
          ...repositoryRef.current.exportState(),
          goalSettings: nextGoalSettings,
        });
        setError(null);
      } catch {
        setError("Failed to save local data");
      }
    },
    [goalSettings],
  );

  function toggleTag(tag: DrillTag): void {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function toggleDrillSelection(id: string): void {
    setSelectedDrillIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function createDrill(): Promise<void> {
    try {
      repositoryRef.current.createDrill({
        name: drillName,
        durationMinutes: Number(drillMinutes),
        targetBpm: drillBpm ? Number(drillBpm) : undefined,
        tags: selectedTags,
      });
      setDrillName("");
      setDrillMinutes("5");
      setDrillBpm("100");
      setSelectedTags([]);
      refreshSnapshot();
      await persistCurrentState();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create drill");
    }
  }

  async function deleteDrill(id: string): Promise<void> {
    repositoryRef.current.deleteDrill(id);
    setSelectedDrillIds((current) => current.filter((item) => item !== id));
    refreshSnapshot();
    await persistCurrentState();
  }

  async function createTemplate(): Promise<void> {
    try {
      const selectedDrills = snapshot.drills.filter((drill) => selectedDrillIds.includes(drill.id));
      if (editingTemplateId) {
        pipelineRef.current.updateSessionTemplateFromDrills({
          id: editingTemplateId,
          name: templateName,
          drills: selectedDrills,
        });
      } else {
        pipelineRef.current.createSessionTemplateFromDrills({
          id: `template_${Date.now()}`,
          name: templateName,
          drills: selectedDrills,
        });
      }
      setTemplateName("Daily Session");
      setSelectedDrillIds([]);
      setEditingTemplateId(null);
      refreshSnapshot();
      await persistCurrentState();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template");
    }
  }

  async function deleteTemplate(id: string): Promise<void> {
    repositoryRef.current.deleteSessionTemplate(id);
    if (editingTemplateId === id) {
      setEditingTemplateId(null);
      setTemplateName("Daily Session");
      setSelectedDrillIds([]);
    }
    refreshSnapshot();
    await persistCurrentState();
  }

  async function duplicateTemplate(template: SessionTemplate): Promise<void> {
    const drills = snapshot.drills.filter((drill) => template.drillIds.includes(drill.id));
    pipelineRef.current.createSessionTemplateFromDrills({
      id: `template_${Date.now()}`,
      name: `${template.name} Copy`,
      drills,
      isPreset: false,
    });
    refreshSnapshot();
    await persistCurrentState();
  }

  function startSelectedRuntime(): void {
    const template = snapshot.templates.find((item) => item.id === selectedRunTemplateId);
    if (!template) {
      setError("Select a template first");
      return;
    }

    const drills = snapshot.drills.filter((drill) => template.drillIds.includes(drill.id));
    try {
      const createdState = createRuntimeState({
        template,
        drills,
        nowIso: new Date().toISOString(),
      });
      const startedState = startRuntime(createdState);
      const currentSegment = getCurrentSegment(startedState);

      runtimeHistorySavedRef.current = false;
      setRuntimeBpm(clampBpm(currentSegment?.targetBpm ?? 100));
      setMetronomeEnabled(false);
      setBeatCount(0);
      setShowAdvancedRunControls(false);
      setRuntimeState(startedState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start runtime");
    }
  }

  function clearRuntime(): void {
    setRuntimeState(null);
    runtimeHistorySavedRef.current = false;
    setMetronomeEnabled(false);
    setBeatCount(0);
    setShowAdvancedRunControls(false);
  }

  function adjustRuntimeBpm(delta: number): void {
    setRuntimeBpm((current) => stepBpm(current, delta));
  }

  function toggleMetronome(): void {
    if (!runtimeState) {
      setError("Start a session before enabling the metronome");
      return;
    }

    setMetronomeEnabled((current) => !current);
  }

  async function saveGoalMinutes(): Promise<void> {
    const parsed = Number(goalMinutesInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Daily goal must be a positive number");
      return;
    }

    const next: GoalSettings = {
      ...goalSettings,
      dailyMinutesTarget: Math.round(parsed),
    };

    setGoalSettings(next);
    await persistCurrentState(next);
  }

  async function toggleReminder(): Promise<void> {
    try {
      parseReminderTime(reminderTimeInput);
      const nextEnabled = !goalSettings.reminderEnabled;
      const next: GoalSettings = {
        ...goalSettings,
        reminderEnabled: nextEnabled,
        reminderTime: reminderTimeInput,
      };

      if (nextEnabled) {
        await scheduleDailyReminder(reminderTimeInput);
      } else {
        await disableDailyReminder();
      }

      setGoalSettings(next);
      await persistCurrentState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update reminder");
    }
  }

  function beginEditTemplate(template: SessionTemplate): void {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setSelectedDrillIds(template.drillIds);
    setActiveScreen("builder");
  }

  if (!isReady) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading local data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.badge}>Phase 3</Text>
        <Text style={styles.title}>Guitar Practice</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeScreen === "onboarding" ? (
          <Text style={styles.subtitle}>
            Onboarding will collect skill level and daily minutes goal.
          </Text>
        ) : null}

        {activeScreen === "home" ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Today</Text>
              <Text style={styles.heroValue}>
                {dashboardMetrics.todayMinutes} / {goalSettings.dailyMinutesTarget} min
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(2, dashboardMetrics.goalProgressPercent)}%` },
                  ]}
                />
              </View>
              <Text style={styles.line}>
                Streak {currentStreak} day(s) • Goal {dashboardMetrics.goalProgressPercent}%
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{snapshot.drills.length}</Text>
                  <Text style={styles.listSub}>Drills</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{snapshot.templates.length}</Text>
                  <Text style={styles.listSub}>Templates</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{dashboardMetrics.weeklyMinutes}</Text>
                  <Text style={styles.listSub}>Weekly Min</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{dashboardMetrics.sessionsCompleted}</Text>
                  <Text style={styles.listSub}>Completed</Text>
                </View>
              </View>
              <Text style={styles.listSub}>
                Startup to interactive: {startupMs !== null ? `${startupMs}ms` : "-"}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setActiveScreen("run")}
                  accessibilityRole="button"
                  accessibilityLabel="Go to run session"
                >
                  <Text style={styles.primaryButtonText}>Run Session</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveScreen("builder")}
                  accessibilityRole="button"
                  accessibilityLabel="Go to session builder"
                >
                  <Text style={styles.secondaryButtonText}>Build Template</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {activeScreen === "builder" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 1: Add Drill</Text>
              <TextInput
                style={styles.input}
                value={drillName}
                onChangeText={setDrillName}
                placeholder="Drill name"
                accessibilityLabel="Drill name"
              />
              <TextInput
                style={styles.input}
                value={drillMinutes}
                onChangeText={setDrillMinutes}
                keyboardType="number-pad"
                placeholder="Duration minutes"
                accessibilityLabel="Drill duration in minutes"
              />
              <TextInput
                style={styles.input}
                value={drillBpm}
                onChangeText={setDrillBpm}
                keyboardType="number-pad"
                placeholder="Target BPM"
                accessibilityLabel="Drill target BPM"
              />

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowTagPicker((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel="Toggle drill tags panel"
              >
                <Text style={styles.secondaryButtonText}>
                  {showTagPicker ? "Hide Tags" : "Add Tags"}
                </Text>
              </TouchableOpacity>

              {showTagPicker ? (
                <View style={styles.rowWrap}>
                  {TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.pill, selectedTags.includes(tag) ? styles.pillActive : null]}
                      onPress={() => toggleTag(tag)}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle tag ${tag}`}
                    >
                      <Text style={styles.pillText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void createDrill()}
                accessibilityRole="button"
                accessibilityLabel="Add drill"
              >
                <Text style={styles.primaryButtonText}>Add Drill</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2: Select Drills</Text>
              {snapshot.drills.length === 0 ? (
                <Text style={styles.line}>No drills yet. Add your first drill above.</Text>
              ) : (
                snapshot.drills.map((drill) => (
                  <View key={drill.id} style={styles.listItem}>
                    <TouchableOpacity
                      onPress={() => toggleDrillSelection(drill.id)}
                      style={styles.listTextWrap}
                      accessibilityRole="button"
                      accessibilityLabel={`Select drill ${drill.name}`}
                    >
                      <Text style={styles.listTitle}>
                        {selectedDrillIds.includes(drill.id) ? "[x]" : "[ ]"} {drill.name}
                      </Text>
                      <Text style={styles.listSub}>
                        {Math.round(drill.durationSeconds / 60)}m @ {drill.targetBpm ?? "-"} BPM
                      </Text>
                      <Text style={styles.listSub}>tags: {drill.tags.join(", ") || "none"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void deleteDrill(drill.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete drill ${drill.name}`}
                    >
                      <Text style={styles.delete}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 3: Save Template</Text>
              {editingTemplateId ? (
                <Text style={styles.line}>Editing template: {editingTemplateId}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Template name"
                accessibilityLabel="Template name"
              />
              <Text style={styles.line}>Selected drills: {selectedDrillIds.length}</Text>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  selectedDrillIds.length === 0 ? styles.primaryButtonDisabled : null,
                ]}
                onPress={() => {
                  if (selectedDrillIds.length === 0) {
                    setError("Select at least one drill before saving a template");
                    return;
                  }
                  void createTemplate();
                }}
                accessibilityRole="button"
                accessibilityLabel={editingTemplateId ? "Update template" : "Save template"}
              >
                <Text style={styles.primaryButtonText}>
                  {editingTemplateId ? "Update Template" : "Save Template"}
                </Text>
              </TouchableOpacity>
              {editingTemplateId ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setEditingTemplateId(null);
                    setTemplateName("Daily Session");
                    setSelectedDrillIds([]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel template edit"
                >
                  <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : null}

        {activeScreen === "run" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Run Session</Text>
              {runtimeState ? null : <Text style={styles.line}>Select template:</Text>}
              {!runtimeState ? (
                <>
                  <View style={styles.rowWrap}>
                    {snapshot.templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.pill,
                          selectedRunTemplateId === template.id ? styles.pillActive : null,
                        ]}
                        onPress={() => setSelectedRunTemplateId(template.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select run template ${template.name}`}
                      >
                        <Text style={styles.pillText}>{template.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={startSelectedRuntime}
                    accessibilityRole="button"
                    accessibilityLabel="Start session runtime"
                  >
                    <Text style={styles.primaryButtonText}>Start Session</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.runtimeHero}>
                    <Text style={styles.runtimeSegmentName}>
                      {getCurrentSegment(runtimeState)?.name ?? "No segment"}
                    </Text>
                    <Text style={styles.runtimePrimaryTime}>
                      {formatSeconds(getCurrentSegment(runtimeState)?.remainingSeconds ?? 0)}
                    </Text>
                    <Text style={styles.runtimeSubTime}>
                      Session left {formatSeconds(runtimeState.totalRemainingSeconds)} • Status{" "}
                      {runtimeState.status}
                    </Text>
                  </View>

                  <View style={styles.rowWrap}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() =>
                        setRuntimeState((current) =>
                          current?.status === "running"
                            ? pauseRuntime(current)
                            : current
                              ? resumeRuntime(current)
                              : current,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={
                        runtimeState.status === "running" ? "Pause session" : "Resume session"
                      }
                    >
                      <Text style={styles.primaryButtonText}>
                        {runtimeState.status === "running" ? "Pause" : "Resume"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() =>
                        setRuntimeState((current) =>
                          current ? markCurrentSegmentComplete(current) : current,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Mark segment complete"
                    >
                      <Text style={styles.secondaryButtonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() =>
                        setRuntimeState((current) =>
                          current ? skipCurrentSegment(current) : current,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Skip current segment"
                    >
                      <Text style={styles.secondaryButtonText}>Skip</Text>
                    </TouchableOpacity>
                    {runtimeState.status === "segmentComplete" ? (
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() =>
                          setRuntimeState((current) =>
                            current ? advanceToNextSegment(current) : current,
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Advance to next segment"
                      >
                        <Text style={styles.secondaryButtonText}>Next</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.textButton}
                    onPress={() => setShowAdvancedRunControls((current) => !current)}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle advanced run controls"
                  >
                    <Text style={styles.link}>
                      {showAdvancedRunControls
                        ? "Hide Advanced Controls"
                        : "Show Advanced Controls"}
                    </Text>
                  </TouchableOpacity>

                  {showAdvancedRunControls ? (
                    <View style={styles.cardMuted}>
                      <Text style={styles.line}>Runtime BPM: {runtimeBpm}</Text>
                      <View style={styles.rowWrap}>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => adjustRuntimeBpm(-5)}
                          accessibilityRole="button"
                          accessibilityLabel="Decrease runtime BPM"
                        >
                          <Text style={styles.secondaryButtonText}>BPM -5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => adjustRuntimeBpm(5)}
                          accessibilityRole="button"
                          accessibilityLabel="Increase runtime BPM"
                        >
                          <Text style={styles.secondaryButtonText}>BPM +5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={toggleMetronome}
                          accessibilityRole="button"
                          accessibilityLabel={
                            metronomeEnabled ? "Disable metronome" : "Enable metronome"
                          }
                        >
                          <Text style={styles.secondaryButtonText}>
                            {metronomeEnabled ? "Metronome Off" : "Metronome On"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={clearRuntime}
                          accessibilityRole="button"
                          accessibilityLabel="Clear runtime session"
                        >
                          <Text style={styles.secondaryButtonText}>Clear Session</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.metronomeRow}>
                        <View
                          style={[
                            styles.metronomeDot,
                            metronomeEnabled &&
                            runtimeState.status === "running" &&
                            beatCount % 2 === 1
                              ? styles.metronomeDotActive
                              : null,
                          ]}
                        />
                        <Text style={styles.line}>
                          Beat: {metronomeEnabled ? ((beatCount % 4) + 1).toString() : "-"}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}

        {activeScreen === "history" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>History Summary</Text>
              <Text style={styles.line}>Today: {dashboardMetrics.todayMinutes}m</Text>
              <Text style={styles.line}>Weekly: {dashboardMetrics.weeklyMinutes}m</Text>
              <Text style={styles.line}>Total: {dashboardMetrics.totalMinutes}m</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sessions</Text>
              {snapshot.history.length === 0 ? (
                <Text style={styles.line}>No sessions yet. Run a template to create history.</Text>
              ) : (
                snapshot.history.map((entry) => (
                  <View key={entry.id} style={styles.listItemVertical}>
                    <Text style={styles.listTitle}>{entry.sessionNameSnapshot}</Text>
                    <Text style={styles.listSub}>
                      {Math.round(entry.durationCompletedSeconds / 60)}m -{" "}
                      {entry.completed ? "completed" : "incomplete"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}

        {activeScreen === "goals" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goals</Text>
            <Text style={styles.line}>Current streak: {currentStreak} day(s)</Text>
            <TextInput
              style={styles.input}
              value={goalMinutesInput}
              onChangeText={setGoalMinutesInput}
              keyboardType="number-pad"
              placeholder="Daily minutes target"
              accessibilityLabel="Daily minutes target"
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void saveGoalMinutes()}
              accessibilityRole="button"
              accessibilityLabel="Save daily goal"
            >
              <Text style={styles.primaryButtonText}>Save Daily Goal</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={reminderTimeInput}
              onChangeText={setReminderTimeInput}
              placeholder="Reminder time (HH:MM)"
              accessibilityLabel="Reminder time in HH colon MM format"
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void toggleReminder()}
              accessibilityRole="button"
              accessibilityLabel={
                goalSettings.reminderEnabled ? "Disable reminder" : "Enable reminder"
              }
            >
              <Text style={styles.secondaryButtonText}>
                {goalSettings.reminderEnabled ? "Disable Reminder" : "Enable Reminder"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.listSub}>
              Reminder:{" "}
              {goalSettings.reminderEnabled ? `on at ${goalSettings.reminderTime}` : "off"}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Templates</Text>
          {snapshot.templates.map((template) => (
            <View key={template.id} style={styles.listItem}>
              <View style={styles.listTextWrap}>
                <Text style={styles.listTitle}>{template.name}</Text>
                <Text style={styles.listSub}>
                  {Math.round(template.totalDurationSeconds / 60)}m - {template.drillIds.length}{" "}
                  drills
                </Text>
              </View>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  onPress={() => beginEditTemplate(template)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit template ${template.name}`}
                >
                  <Text style={styles.link}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void duplicateTemplate(template)}
                  accessibilityRole="button"
                  accessibilityLabel={`Duplicate template ${template.name}`}
                >
                  <Text style={styles.link}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void deleteTemplate(template.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete template ${template.name}`}
                >
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.tabBar}>
        {SCREENS.map((screen) => {
          const isActive = screen.key === activeScreen;
          return (
            <TouchableOpacity
              key={screen.key}
              style={[styles.tab, isActive ? styles.tabActive : null]}
              onPress={() => setActiveScreen(screen.key)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${screen.title} screen`}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {screen.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f7f8" },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 10 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#1f7a8c",
    color: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "600",
    fontSize: 12,
  },
  title: { fontSize: 30, fontWeight: "700", color: "#102a43" },
  subtitle: { fontSize: 16, color: "#334e68", lineHeight: 22 },
  error: { color: "#b42318", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d9e2ec",
  },
  cardMuted: {
    backgroundColor: "#f0f4f8",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d9e2ec",
  },
  heroCard: {
    backgroundColor: "#102a43",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  heroLabel: { color: "#9fb3c8", fontSize: 12, textTransform: "uppercase", fontWeight: "700" },
  heroValue: { color: "#ffffff", fontSize: 28, fontWeight: "700" },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#102a43" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: {
    minWidth: "47%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f0f4f8",
    gap: 2,
  },
  statValue: { color: "#102a43", fontSize: 22, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#bcccdc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bcccdc",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: "#d9e2ec" },
  pillText: { color: "#334e68", fontSize: 12 },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: "#1f7a8c",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: "#7b8794",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  secondaryButton: {
    borderRadius: 8,
    backgroundColor: "#d9e2ec",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: "#102a43", fontWeight: "700", textAlign: "center" },
  line: { color: "#334e68", fontSize: 14 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#d9e2ec",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1f7a8c",
  },
  listItem: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  listItemVertical: { gap: 2, paddingVertical: 4 },
  listTextWrap: { flex: 1, gap: 2 },
  listTitle: { color: "#102a43", fontWeight: "600" },
  listSub: { color: "#627d98", fontSize: 12 },
  delete: { color: "#b42318", fontWeight: "600" },
  link: { color: "#1f7a8c", fontWeight: "600" },
  metronomeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textButton: { paddingVertical: 4, alignSelf: "flex-start" },
  runtimeHero: {
    borderRadius: 12,
    backgroundColor: "#f0f4f8",
    padding: 12,
    gap: 4,
  },
  runtimeSegmentName: { color: "#102a43", fontSize: 18, fontWeight: "700" },
  runtimePrimaryTime: { color: "#102a43", fontSize: 42, fontWeight: "700" },
  runtimeSubTime: { color: "#486581", fontSize: 13 },
  metronomeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#bcccdc",
  },
  metronomeDotActive: {
    backgroundColor: "#1f7a8c",
  },
  tabBar: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#bcccdc",
    backgroundColor: "#fff",
  },
  tab: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 2,
  },
  tabActive: { backgroundColor: "#d9e2ec" },
  tabLabel: { fontSize: 14, color: "#486581" },
  tabLabelActive: { color: "#102a43", fontWeight: "700" },
});
