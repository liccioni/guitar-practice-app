import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  playMetronomeTick,
  primeMetronomeAudio,
  releaseMetronomeAudio,
} from "./src/application/metronomeAudio";
import { disableDailyReminder, parseReminderTime, scheduleDailyReminder } from "./src/application/reminders";
import { appendDrillToTemplate } from "./src/application/sessionBuilder";
import { prepareSessionStart } from "./src/application/startSessionPreparation";
import { createDrillFromInput, updateDrillFromInput } from "./src/domain/exercises/drill";
import type { CreateDrillInput, Drill, DrillRandomizerKind } from "./src/domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings, type GoalType } from "./src/domain/goals/types";
import { calculateGoalTypeStreak } from "./src/domain/goals/streak";
import { computeUnlockedBadgeIds } from "./src/domain/gamification/badges";
import { calculateDashboardMetrics, toLocalDayKey } from "./src/domain/history/metrics";
import type { DrillSnapshot, PracticeHistoryEntry } from "./src/domain/history/types";
import { getBeatIntervalMs, stepBpm } from "./src/domain/metronome/metronome";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
  type SessionTemplate,
} from "./src/domain/sessions/sessionTemplate";
import {
  loadPersistedState,
  savePersistedState,
  type PersistedPracticeState,
} from "./src/persistence/LocalStorageGateway";

type Screen = "home" | "builder" | "active" | "complete";

interface Badge {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

interface BadgeDefinition {
  id: string;
  label: string;
  icon: string;
}

const TOKENS = {
  background: "#121212",
  surface: "#1A1A1A",
  elevated: "#222222",
  divider: "#2A2A2A",
  primaryAccent: "#D97706",
  secondaryAccent: "#E6B980",
  xpHighlight: "#EAB308",
  textPrimary: "#F5F5F5",
  textSecondary: "#B3B3B3",
  disabled: "#6B7280",
};

const COLORS = {
  bg: TOKENS.background,
  card: TOKENS.surface,
  cardSoft: TOKENS.elevated,
  text: TOKENS.textPrimary,
  muted: TOKENS.textSecondary,
  accent: TOKENS.primaryAccent,
  accentAlt: TOKENS.secondaryAccent,
  xp: TOKENS.xpHighlight,
  divider: TOKENS.divider,
  danger: "#B45309",
  disabled: TOKENS.disabled,
};

const DRILL_POOL: CreateDrillInput[] = [
  { name: "Chromatic Warmup", durationMinutes: 4, targetBpm: 90, tags: ["warmup"] },
  { name: "Major Scale Ladder", durationMinutes: 6, targetBpm: 100, tags: ["scales"] },
  { name: "Chord Change Sprint", durationMinutes: 5, targetBpm: 80, tags: ["chords"] },
  { name: "Alternate Picking Burst", durationMinutes: 5, targetBpm: 120, tags: ["technique"] },
  { name: "Pentatonic Run", durationMinutes: 5, targetBpm: 110, tags: ["scales"] },
  { name: "Rhythm Pocket", durationMinutes: 4, targetBpm: 95, tags: ["rhythm"] },
  { name: "Arpeggio Climb", durationMinutes: 6, targetBpm: 105, tags: ["technique"] },
  { name: "Legato Builder", durationMinutes: 5, targetBpm: 100, tags: ["technique"] },
];

const MOTIVATION = [
  "Lock in. Every rep makes you cleaner.",
  "Stay relaxed, stay precise.",
  "Small gains compound fast.",
  "You are one drill away from momentum.",
];

const RANDOMIZER_KIND_OPTIONS: { value: "none" | DrillRandomizerKind; label: string }[] = [
  { value: "none", label: "No Random Cue" },
  { value: "note", label: "Random Note" },
  { value: "triad", label: "Random Triad" },
  { value: "fingers4", label: "Random 4 Fingers" },
];

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "b1", label: "7-Day Streak", icon: "🔥" },
  { id: "b2", label: "Rhythm Keeper", icon: "🎵" },
  { id: "b3", label: "XP Hunter", icon: "⚡" },
  { id: "b4", label: "Session Beast", icon: "🏆" },
];

const DEFAULT_PROFILE = {
  totalXp: 0,
  unlockedBadgeIds: [] as string[],
};

interface WeeklySummary {
  weekMinutes: number;
  weekSessions: number;
  weekDrillsCompleted: number;
  completionRatePercent: number;
  avgSessionMinutes: number;
  weekMinutesDelta: number;
}

interface SessionInsight {
  id: string;
  title: string;
  durationMinutes: number;
  averageBpm: number;
  completed: boolean;
  completedDrills: number;
  totalDrills: number;
}

const GOAL_TARGET_BOUNDS: Record<GoalType, [number, number]> = {
  minutes: [5, 300],
  sessions: [1, 20],
  drills: [1, 60],
};

function getDefaultGoalTarget(goalType: GoalType, dailyMinutesTarget: number): number {
  if (goalType === "minutes") return dailyMinutesTarget;
  if (goalType === "sessions") return 1;
  return 4;
}

function normalizeGoalTarget(goalType: GoalType, target: number, dailyMinutesTarget: number): number {
  const [min, max] = GOAL_TARGET_BOUNDS[goalType];
  const fallback = getDefaultGoalTarget(goalType, dailyMinutesTarget);
  if (!Number.isFinite(target)) return fallback;
  return Math.min(max, Math.max(min, Math.round(target)));
}

function goalUnit(goalType: GoalType): string {
  if (goalType === "minutes") return "m";
  if (goalType === "sessions") return "sessions";
  return "drills";
}

function getEntryAverageBpm(entry: PracticeHistoryEntry): number {
  const values = entry.drillsSnapshot
    .map((drill) => drill.targetBpm)
    .filter((bpm): bpm is number => typeof bpm === "number");
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, bpm) => sum + bpm, 0) / values.length);
}

function isWithinDays(dateIso: string, nowIso: string, days: number): boolean {
  const diff = new Date(nowIso).getTime() - new Date(dateIso).getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isBetweenDaysAgo(dateIso: string, nowIso: string, fromDays: number, toDays: number): boolean {
  const diff = new Date(nowIso).getTime() - new Date(dateIso).getTime();
  return diff > fromDays * 24 * 60 * 60 * 1000 && diff <= toDays * 24 * 60 * 60 * 1000;
}

function buildWeeklySummary(entries: PracticeHistoryEntry[], nowIso: string): WeeklySummary {
  const thisWeekEntries = entries.filter((entry) => isWithinDays(entry.startedAt, nowIso, 7));
  const previousWeekEntries = entries.filter((entry) => isBetweenDaysAgo(entry.startedAt, nowIso, 7, 14));

  const weekMinutes = Math.round(
    thisWeekEntries.reduce((sum, entry) => sum + entry.durationCompletedSeconds, 0) / 60,
  );
  const previousWeekMinutes = Math.round(
    previousWeekEntries.reduce((sum, entry) => sum + entry.durationCompletedSeconds, 0) / 60,
  );
  const weekSessions = thisWeekEntries.filter((entry) => entry.completed).length;
  const weekDrillsCompleted = thisWeekEntries.reduce(
    (sum, entry) => sum + (entry.completed ? entry.completedDrillIds.length : 0),
    0,
  );
  const completionRatePercent =
    thisWeekEntries.length === 0 ? 0 : Math.round((weekSessions / thisWeekEntries.length) * 100);
  const avgSessionMinutes = weekSessions === 0 ? 0 : Math.round(weekMinutes / weekSessions);

  return {
    weekMinutes,
    weekSessions,
    weekDrillsCompleted,
    completionRatePercent,
    avgSessionMinutes,
    weekMinutesDelta: weekMinutes - previousWeekMinutes,
  };
}

function buildRecentSessionInsights(entries: PracticeHistoryEntry[], limit = 4): SessionInsight[] {
  return entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    title: entry.sessionNameSnapshot,
    durationMinutes: Math.round(entry.durationCompletedSeconds / 60),
    averageBpm: getEntryAverageBpm(entry),
    completed: entry.completed,
    completedDrills: entry.completedDrillIds.length,
    totalDrills: entry.drillsSnapshot.length,
  }));
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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

function toXp(drill: Drill): number {
  const durationMinutes = Math.max(1, Math.round(drill.durationSeconds / 60));
  const bpmBonus = drill.targetBpm ? Math.round((drill.targetBpm - 40) / 10) : 0;
  return Math.max(25, durationMinutes * 10 + bpmBonus);
}

function toSnapshot(drill: Drill): DrillSnapshot {
  return {
    id: drill.id,
    name: drill.name,
    durationSeconds: drill.durationSeconds,
    targetBpm: drill.targetBpm,
  };
}

function randomCueValues(kind: DrillRandomizerKind): string[] {
  if (kind === "note") return ["A", "B", "C", "D", "E", "F", "G"];
  if (kind === "triad") return ["A Maj", "A Min", "C Maj", "C Min", "D Maj", "E Min", "G Maj"];
  return ["1-2-3-4", "1-3-2-4", "4-3-2-1", "1-4-2-3", "2-4-1-3", "3-1-4-2"];
}

function pickRandomCueValue(kind: DrillRandomizerKind): string {
  const pool = randomCueValues(kind);
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildBadgeState(unlockedBadgeIds: string[]): Badge[] {
  const unlocked = new Set(unlockedBadgeIds);
  return BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    unlocked: unlocked.has(badge.id),
  }));
}

function getUnlockedBadgeIds(badges: Badge[]): string[] {
  return badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
}

function createSeedState(nowIso: string): PersistedPracticeState {
  const drills = DRILL_POOL.slice(0, 4).map((input, idx) =>
    createDrillFromInput(`seed_drill_${idx + 1}`, input, nowIso),
  );

  const starterTemplate = createSessionTemplate({
    id: "template_starter",
    name: "Daily Core Session",
    drillIds: drills.map((drill) => drill.id),
    totalDurationSeconds: calculateTotalDurationSeconds(drills),
    nowIso,
  });

  return {
    drills,
    templates: [starterTemplate],
    history: [],
    goalSettings: DEFAULT_GOAL_SETTINGS,
    profile: DEFAULT_PROFILE,
  };
}

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>("home");
  const [allDrills, setAllDrills] = useState<Drill[]>([]);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
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
  const [activeDrillIds, setActiveDrillIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completedDrillIds, setCompletedDrillIds] = useState<string[]>([]);
  const [completedDurationSec, setCompletedDurationSec] = useState(0);

  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [metronomeBpm, setMetronomeBpm] = useState(100);
  const [beatFlash, setBeatFlash] = useState(false);
  const [randomCueLabel, setRandomCueLabel] = useState<string | null>(null);
  const [randomCueBeatsRemaining, setRandomCueBeatsRemaining] = useState(0);

  const [totalXp, setTotalXp] = useState(DEFAULT_PROFILE.totalXp);
  const [sessionXp, setSessionXp] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [currentMicrocopy, setCurrentMicrocopy] = useState(MOTIVATION[0]);

  const [badges, setBadges] = useState<Badge[]>(() => buildBadgeState(DEFAULT_PROFILE.unlockedBadgeIds));

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rewardScale = useRef(new Animated.Value(0.92)).current;
  const rewardGlow = useRef(new Animated.Value(0)).current;
  const completionPulse = useRef(new Animated.Value(0)).current;
  const randomCuePulse = useRef(new Animated.Value(0)).current;
  const handleDrillFinishedRef = useRef<() => void>(() => undefined);
  const randomCueRemainingRef = useRef(0);

  const nowIso = new Date().toISOString();
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

  const activeDrill = useMemo(() => {
    const id = activeDrillIds[activeIndex];
    return allDrills.find((drill) => drill.id === id);
  }, [activeDrillIds, activeIndex, allDrills]);

  const sessionDurationSec = useMemo(() => {
    return activeDrillIds.reduce((sum, id) => {
      const drill = allDrills.find((item) => item.id === id);
      return sum + (drill?.durationSeconds ?? 0);
    }, 0);
  }, [activeDrillIds, allDrills]);

  const elapsedSec = useMemo(() => {
    const doneBefore = activeDrillIds.slice(0, activeIndex).reduce((sum, id) => {
      const drill = allDrills.find((item) => item.id === id);
      return sum + (drill?.durationSeconds ?? 0);
    }, 0);

    if (!activeDrill) return doneBefore;
    return doneBefore + (activeDrill.durationSeconds - remainingSec);
  }, [activeDrill, activeDrillIds, activeIndex, allDrills, remainingSec]);

  const sessionProgress = sessionDurationSec === 0 ? 0 : clampUnit(elapsedSec / sessionDurationSec);
  const drillProgress =
    !activeDrill || activeDrill.durationSeconds === 0
      ? 0
      : clampUnit((activeDrill.durationSeconds - remainingSec) / activeDrill.durationSeconds);

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics({
        entries: history,
        nowIso,
        dailyMinutesTarget: goalSettings.dailyMinutesTarget,
      }),
    [goalSettings.dailyMinutesTarget, history, nowIso],
  );
  const goalType: GoalType = goalSettings.goalType ?? "minutes";
  const goalTarget = normalizeGoalTarget(
    goalType,
    goalSettings.goalTarget ?? getDefaultGoalTarget(goalType, goalSettings.dailyMinutesTarget),
    goalSettings.dailyMinutesTarget,
  );
  const todayKey = useMemo(() => toLocalDayKey(nowIso), [nowIso]);
  const todayCompletedSessions = useMemo(
    () =>
      history.filter(
        (entry) => entry.completed && toLocalDayKey(entry.startedAt) === todayKey,
      ).length,
    [history, todayKey],
  );
  const todayCompletedDrills = useMemo(
    () =>
      history
        .filter((entry) => toLocalDayKey(entry.startedAt) === todayKey)
        .reduce((sum, entry) => sum + entry.completedDrillIds.length, 0),
    [history, todayKey],
  );
  const goalCurrentValue =
    goalType === "minutes"
      ? metrics.todayMinutes
      : goalType === "sessions"
        ? todayCompletedSessions
        : todayCompletedDrills;
  const goalProgressPercent =
    goalTarget <= 0 ? 100 : Math.min(100, Math.round((goalCurrentValue / goalTarget) * 100));
  const dailyGoalProgress = Math.min(1, goalProgressPercent / 100);
  const weeklySummary = useMemo(() => buildWeeklySummary(history, nowIso), [history, nowIso]);
  const recentSessionInsights = useMemo(() => buildRecentSessionInsights(history), [history]);
  const streak = useMemo(
    () => calculateGoalTypeStreak(history, nowIso, goalType, goalTarget),
    [goalTarget, goalType, history, nowIso],
  );

  const levelState = useMemo(() => getLevelState(totalXp), [totalXp]);

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
        setBadges(buildBadgeState(seed.profile.unlockedBadgeIds));
        setActiveTemplateId(seed.templates[0]?.id ?? null);
        setTemplateNameInput(seed.templates[0]?.name ?? "");
        setSelectedDrillId(seed.templates[0]?.drillIds[0] ?? null);
      } finally {
        setIsHydrated(true);
      }
    };

    run();
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
      },
    });
  }, [allDrills, badges, goalSettings, history, isHydrated, templates, totalXp]);

  useEffect(() => {
    fadeAnim.stopAnimation();
    fadeAnim.setValue(0.94);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, screen]);

  useEffect(() => {
    if (screen !== "active" || isPaused || !activeDrill) return;

    const timer = setInterval(() => {
      setRemainingSec((current) => {
        if (current <= 1) {
          clearInterval(timer);
          handleDrillFinishedRef.current();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDrill, isPaused, screen]);

  useEffect(() => {
    if (screen !== "active" || isPaused || !metronomeEnabled) {
      setBeatFlash(false);
      return;
    }

    const intervalMs = getBeatIntervalMs(metronomeBpm);
    const beatTimer = setInterval(() => {
      setBeatFlash((current) => !current);
      void playMetronomeTick();

      const randomizer = activeDrill?.randomizer;
      if (randomizer) {
        const nextRemaining = randomCueRemainingRef.current - 1;
        if (nextRemaining <= 0) {
          const resetBeats = randomizer.everyBars * 4;
          randomCueRemainingRef.current = resetBeats;
          setRandomCueBeatsRemaining(resetBeats);
          setRandomCueLabel(pickRandomCueValue(randomizer.kind));
          randomCuePulse.setValue(0);
          Animated.sequence([
            Animated.timing(randomCuePulse, {
              toValue: 1,
              duration: 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(randomCuePulse, {
              toValue: 0,
              duration: 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          randomCueRemainingRef.current = nextRemaining;
          setRandomCueBeatsRemaining(nextRemaining);
        }
      }

      try {
        Vibration.vibrate(10);
      } catch {
        // Ignore vibration capability failures (e.g. simulator), keep visual beat running.
      }
    }, intervalMs);

    return () => clearInterval(beatTimer);
  }, [activeDrill, isPaused, metronomeBpm, metronomeEnabled, randomCuePulse, screen]);

  useEffect(() => {
    if (screen !== "active" || !metronomeEnabled) return;
    void primeMetronomeAudio();
  }, [metronomeEnabled, screen]);

  useEffect(() => {
    return () => {
      void releaseMetronomeAudio();
    };
  }, []);

  useEffect(() => {
    if (screen !== "complete") return;

    rewardScale.setValue(0.9);
    rewardGlow.setValue(0);
    Animated.parallel([
      Animated.timing(rewardScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rewardGlow, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rewardGlow, rewardScale, screen]);

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

  function triggerCompletionPulse(): void {
    completionPulse.setValue(0);
    Animated.sequence([
      Animated.timing(completionPulse, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(completionPulse, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }

  useEffect(() => {
    const randomizer = screen === "active" ? activeDrill?.randomizer : undefined;
    if (!randomizer) {
      randomCueRemainingRef.current = 0;
      setRandomCueLabel(null);
      setRandomCueBeatsRemaining(0);
      randomCuePulse.setValue(0);
      return;
    }

    const initialBeats = randomizer.everyBars * 4;
    randomCueRemainingRef.current = initialBeats;
    setRandomCueLabel(pickRandomCueValue(randomizer.kind));
    setRandomCueBeatsRemaining(initialBeats);
    randomCuePulse.setValue(0);
  }, [activeDrill, randomCuePulse, screen]);

  function finishSession(
    finalCompletedDrillIds: string[],
    finalCompletedDurationSec: number,
    finalSessionXp: number,
  ): void {
    if (!selectedTemplate) {
      setScreen("complete");
      return;
    }

    const drillsSnapshot = activeDrillIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill))
      .map(toSnapshot);

    const entry: PracticeHistoryEntry = {
      id: makeId("history"),
      sessionTemplateId: selectedTemplate.id,
      sessionNameSnapshot: selectedTemplate.name,
      drillsSnapshot,
      completedDrillIds: finalCompletedDrillIds,
      startedAt: new Date(Date.now() - elapsedSec * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationCompletedSeconds: finalCompletedDurationSec,
      completed: finalCompletedDrillIds.length === activeDrillIds.length,
    };

    const nextHistory = [entry, ...history];
    const nextStreak = calculateGoalTypeStreak(
      nextHistory,
      new Date().toISOString(),
      goalType,
      goalTarget,
    );
    const nextMetrics = calculateDashboardMetrics({
      entries: nextHistory,
      nowIso: new Date().toISOString(),
      dailyMinutesTarget: goalSettings.dailyMinutesTarget,
    });
    const nextSessionsCompleted = nextHistory.filter((item) => item.completed).length;
    const nextUnlockedBadgeIds = computeUnlockedBadgeIds({
      currentUnlockedBadgeIds: badges.filter((badge) => badge.unlocked).map((badge) => badge.id),
      sessionXp: finalSessionXp,
      completedDrillCount: finalCompletedDrillIds.length,
      streakDays: nextStreak,
      sessionsCompleted: nextSessionsCompleted,
      averageBpm: nextMetrics.averageBpm,
    });

    setHistory(nextHistory);
    setBadges(buildBadgeState(nextUnlockedBadgeIds));

    setScreen("complete");
  }

  function handleDrillFinished(): void {
    if (!activeDrill) return;

    triggerCompletionPulse();

    const gainedXp = toXp(activeDrill);
    const nextSessionXp = sessionXp + gainedXp;
    const nextTotalXp = totalXp + gainedXp;
    const oldLevel = getLevelState(totalXp).level;
    const newLevel = getLevelState(nextTotalXp).level;

    const isAlreadyCompleted = completedDrillIds.includes(activeDrill.id);
    const nextCompletedDrillIds = isAlreadyCompleted
      ? completedDrillIds
      : [...completedDrillIds, activeDrill.id];
    const nextCompletedDurationSec =
      completedDurationSec + (isAlreadyCompleted ? 0 : activeDrill.durationSeconds);

    setCompletedDrillIds(nextCompletedDrillIds);
    setCompletedDurationSec(nextCompletedDurationSec);
    setSessionXp(nextSessionXp);
    setTotalXp(nextTotalXp);
    setLeveledUp(newLevel > oldLevel);

    if (activeIndex < activeDrillIds.length - 1) {
      const nextIndex = activeIndex + 1;
      const nextDrill = allDrills.find((item) => item.id === activeDrillIds[nextIndex]);

      setActiveIndex(nextIndex);
      setRemainingSec(nextDrill?.durationSeconds ?? 0);
      setCurrentMicrocopy(MOTIVATION[nextIndex % MOTIVATION.length]);
      return;
    }

    finishSession(nextCompletedDrillIds, nextCompletedDurationSec, nextSessionXp);
  }

  handleDrillFinishedRef.current = handleDrillFinished;

  function startPracticeFlow(): void {
    setScreen("builder");
  }

  function startSession(): void {
    const prepared = prepareSessionStart({
      selectedTemplate: selectedTemplate ?? null,
      allDrills,
      currentMetronomeBpm: metronomeBpm,
    });

    if (!prepared.ok) {
      setBuilderError(prepared.error);
      return;
    }

    setBuilderError(null);
    const { resolvedDrills } = prepared;
    setActiveDrillIds(resolvedDrills.map((drill) => drill.id));
    setActiveIndex(0);
    setRemainingSec(Math.max(1, resolvedDrills[0].durationSeconds));
    setIsPaused(false);
    setCompletedDrillIds([]);
    setCompletedDurationSec(0);
    setSessionXp(0);
    setLeveledUp(false);
    setCurrentMicrocopy(MOTIVATION[0]);
    setMetronomeBpm(prepared.nextMetronomeBpm);
    setMetronomeEnabled(true);
    setScreen("active");
  }

  function skipDrill(): void {
    if (activeIndex >= activeDrillIds.length - 1) {
      finishSession(completedDrillIds, completedDurationSec, sessionXp);
      return;
    }

    const nextIndex = activeIndex + 1;
    const nextDrill = allDrills.find((item) => item.id === activeDrillIds[nextIndex]);
    setActiveIndex(nextIndex);
    setRemainingSec(nextDrill?.durationSeconds ?? 0);
    setCurrentMicrocopy(MOTIVATION[nextIndex % MOTIVATION.length]);
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
      const createdDrills: Drill[] = [
        createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now),
      ];

      // Ensure new template satisfies 5-minute minimum and never hard-crashes the app.
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
      const copyName = `${selectedTemplate.name} Copy`;

      const duplicated = createSessionTemplate({
        id: makeId("template"),
        name: copyName,
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
      const drillIds = selectedTemplate.drillIds;
      const selectedDrills = drillIds
        .map((id) => allDrills.find((drill) => drill.id === id))
        .filter((drill): drill is Drill => Boolean(drill));

      const validated = createSessionTemplate({
        id: selectedTemplate.id,
        name: templateNameInput,
        drillIds,
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

  function saveSelectedDrillEdits(): void {
    if (!selectedBuilderDrill || !selectedTemplate) return;

    try {
      const durationMinutes = Number(drillDurationInput);
      const nextBpm =
        drillBpmInput.trim().length === 0 ? undefined : Number(drillBpmInput.trim());
      const parsedEveryBars = Number(drillRandomEveryBarsInput.trim());
      const randomizer =
        drillRandomizerKindInput === "none"
          ? undefined
          : {
              kind: drillRandomizerKindInput,
              everyBars: parsedEveryBars,
            };

      const updated = updateDrillFromInput(
        selectedBuilderDrill,
        {
          name: drillNameInput,
          durationMinutes,
          targetBpm: nextBpm,
          randomizer,
        },
        new Date().toISOString(),
      );

      setAllDrills((current) =>
        current.map((drill) => (drill.id === selectedBuilderDrill.id ? updated : drill)),
      );

      setTemplates((current) =>
        current.map((template) => {
          if (template.id !== selectedTemplate.id) return template;
          const nextDrills = template.drillIds
            .map((id) => (id === updated.id ? updated : allDrills.find((drill) => drill.id === id)))
            .filter((drill): drill is Drill => Boolean(drill));

          return {
            ...template,
            totalDurationSeconds: calculateTotalDurationSeconds(nextDrills),
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not update drill");
    }
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

    const [min, max] = GOAL_TARGET_BOUNDS[goalType];
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
    setMetronomeEnabled(false);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <StatusBar style="light" />
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
          {screen === "home" ? (
            <HomeDashboard
              levelState={levelState}
              streak={streak}
              goalProgress={dailyGoalProgress}
              goalType={goalType}
              goalCurrentValue={goalCurrentValue}
              goalTarget={goalTarget}
              goalUnitLabel={goalUnit(goalType)}
              weeklySummary={weeklySummary}
              sessionInsights={recentSessionInsights}
              badges={badges}
              storageError={storageError}
              goalError={goalError}
              reminderEnabled={goalSettings.reminderEnabled}
              reminderTime={goalSettings.reminderTime}
              reminderError={reminderError}
              onGoalTypeChange={setGoalType}
              onSaveGoalTarget={saveGoalTarget}
              onToggleReminder={toggleReminder}
              onSaveReminderTime={saveReminderTime}
              onStartPractice={startPracticeFlow}
            />
          ) : null}

          {screen === "builder" ? (
            <SessionBuilder
              templates={templates}
              selectedTemplateId={selectedTemplate?.id ?? null}
              templateNameInput={templateNameInput}
              builderError={builderError}
              drills={builderDrills}
              onBack={resetToHome}
              onSelectTemplate={setActiveTemplateId}
              onTemplateNameInput={setTemplateNameInput}
              onCreateTemplate={createTemplate}
              onDuplicateTemplate={duplicateTemplate}
              onSaveTemplate={saveTemplate}
              onDeleteTemplate={deleteTemplate}
              selectedDrillId={selectedBuilderDrill?.id ?? null}
              drillNameInput={drillNameInput}
              drillDurationInput={drillDurationInput}
              drillBpmInput={drillBpmInput}
              drillRandomizerKindInput={drillRandomizerKindInput}
              drillRandomEveryBarsInput={drillRandomEveryBarsInput}
              onSelectDrill={setSelectedDrillId}
              onDrillNameInput={setDrillNameInput}
              onDrillDurationInput={setDrillDurationInput}
              onDrillBpmInput={setDrillBpmInput}
              onDrillRandomizerKindInput={setDrillRandomizerKindInput}
              onDrillRandomEveryBarsInput={setDrillRandomEveryBarsInput}
              onSaveDrill={saveSelectedDrillEdits}
              onRemoveDrill={removeDrillFromTemplate}
              onReorderDrills={reorderDrillsInTemplate}
              onAddDrill={addDrillToTemplate}
              onStartSession={startSession}
            />
          ) : null}

          {screen === "active" && activeDrill ? (
            <ActivePractice
              drill={activeDrill}
              drillProgress={drillProgress}
              sessionProgress={sessionProgress}
              remainingSec={remainingSec}
              isPaused={isPaused}
              microcopy={currentMicrocopy}
              completionPulse={completionPulse}
              metronomeEnabled={metronomeEnabled}
              metronomeBpm={metronomeBpm}
              beatFlash={beatFlash}
              randomCueLabel={randomCueLabel}
              randomCueBeatsRemaining={randomCueBeatsRemaining}
              randomCuePulse={randomCuePulse}
              onMetronomeToggle={() => setMetronomeEnabled((current) => !current)}
              onMetronomeStep={(delta) => setMetronomeBpm((current) => stepBpm(current, delta))}
              onPauseToggle={() => setIsPaused((current) => !current)}
              onSkip={skipDrill}
            />
          ) : null}

          {screen === "active" && !activeDrill ? (
            <View style={styles.screenBody}>
              <GlowCard>
                <Text style={styles.cardLabel}>Session Error</Text>
                <Text style={styles.completeSubtext}>
                  Could not load the selected drill. Return to Builder and start again.
                </Text>
                <TouchableOpacity style={styles.smallActionButton} onPress={() => setScreen("builder")}>
                  <Text style={styles.smallActionText}>Back to Builder</Text>
                </TouchableOpacity>
              </GlowCard>
            </View>
          ) : null}

          {screen === "complete" ? (
            <SessionComplete
              sessionXp={sessionXp}
              leveledUp={leveledUp}
              level={levelState.level}
              streak={streak}
              badges={badges.filter((badge) => badge.unlocked)}
              rewardGlow={rewardGlow}
              rewardScale={rewardScale}
              onContinue={resetToHome}
            />
          ) : null}
          </Animated.View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function HomeDashboard(props: {
  levelState: LevelState;
  streak: number;
  goalProgress: number;
  goalType: GoalType;
  goalCurrentValue: number;
  goalTarget: number;
  goalUnitLabel: string;
  weeklySummary: WeeklySummary;
  sessionInsights: SessionInsight[];
  badges: Badge[];
  storageError: string | null;
  goalError: string | null;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderError: string | null;
  onGoalTypeChange: (goalType: GoalType) => void;
  onSaveGoalTarget: (target: string) => void;
  onToggleReminder: () => void;
  onSaveReminderTime: (time: string) => void;
  onStartPractice: () => void;
}) {
  const {
    levelState,
    streak,
    goalProgress,
    goalType,
    goalCurrentValue,
    goalTarget,
    goalUnitLabel,
    weeklySummary,
    sessionInsights,
    badges,
    storageError,
    goalError,
    reminderEnabled,
    reminderTime,
    reminderError,
    onGoalTypeChange,
    onSaveGoalTarget,
    onToggleReminder,
    onSaveReminderTime,
    onStartPractice,
  } = props;

  const [timeInput, setTimeInput] = useState(reminderTime);
  const [goalTargetInput, setGoalTargetInput] = useState(String(goalTarget));

  useEffect(() => {
    setTimeInput(reminderTime);
  }, [reminderTime]);

  useEffect(() => {
    setGoalTargetInput(String(goalTarget));
  }, [goalTarget]);

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
      testID="home-scroll"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>Level {levelState.level} Goal Streak</Text>
        <Text style={styles.levelChip}>
          {levelState.currentLevelXp}/{levelState.nextLevelXp} XP
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryCta, styles.homePrimaryCta]}
        onPress={onStartPractice}
        accessibilityRole="button"
        testID="home-start-practice"
      >
        <Text style={styles.primaryCtaText}>Start Practice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.smallActionButton}
        onPress={onStartPractice}
        accessibilityRole="button"
        testID="home-quick-start-practice"
      >
        <Text style={styles.smallActionText}>Quick Start</Text>
      </TouchableOpacity>

      <GlowCard>
        <Text style={styles.cardLabel}>XP Progress</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(6, (levelState.currentLevelXp / levelState.nextLevelXp) * 100)}%`,
              },
            ]}
          />
        </View>
      </GlowCard>

      <View style={styles.rowTwoCol}>
        <GlowCard style={styles.flexCard}>
          <Text style={styles.cardLabel}>🔥 Goal Streak</Text>
          <Text style={styles.bigValue}>{streak} days</Text>
        </GlowCard>

        <GlowCard style={styles.flexCard}>
          <Text style={styles.cardLabel}>Today Goal</Text>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ProgressRing size={84} strokeWidth={8} progress={goalProgress} color={COLORS.accentAlt} />
            <Text style={styles.ringText}>
              {goalCurrentValue}/{goalTarget} {goalUnitLabel}
            </Text>
          </View>
        </GlowCard>
      </View>

      <GlowCard>
        <Text style={styles.cardLabel}>Goal Settings</Text>
        <View style={styles.inlineRow}>
          <TouchableOpacity
            style={[styles.smallActionButton, goalType === "minutes" ? styles.goalTypeActive : null]}
            onPress={() => onGoalTypeChange("minutes")}
          >
            <Text style={styles.smallActionText}>Minutes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionButton, goalType === "sessions" ? styles.goalTypeActive : null]}
            onPress={() => onGoalTypeChange("sessions")}
          >
            <Text style={styles.smallActionText}>Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionButton, goalType === "drills" ? styles.goalTypeActive : null]}
            onPress={() => onGoalTypeChange("drills")}
          >
            <Text style={styles.smallActionText}>Drills</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inlineRow}>
          <TextInput
            value={goalTargetInput}
            onChangeText={setGoalTargetInput}
            keyboardType="number-pad"
            placeholder="Target"
            placeholderTextColor={COLORS.muted}
            style={styles.timeInput}
          />
          <TouchableOpacity style={styles.smallActionButton} onPress={() => onSaveGoalTarget(goalTargetInput)}>
            <Text style={styles.smallActionText}>Save Goal</Text>
          </TouchableOpacity>
        </View>

        {goalError ? <Text style={styles.errorText}>{goalError}</Text> : null}
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Weekly Summary</Text>
        <Text style={styles.helperText}>
          {weeklySummary.weekMinutes} min this week ({weeklySummary.weekMinutesDelta >= 0 ? "+" : ""}
          {weeklySummary.weekMinutesDelta} vs last week)
        </Text>
        <Text style={styles.helperText}>
          {weeklySummary.weekSessions} sessions • {weeklySummary.weekDrillsCompleted} drills completed
        </Text>
        <Text style={styles.helperText}>
          {weeklySummary.completionRatePercent}% completion • Avg {weeklySummary.avgSessionMinutes} min/session
        </Text>
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Recent Sessions</Text>
        {sessionInsights.length === 0 ? (
          <Text style={styles.helperText}>No sessions yet. Start one to unlock trends.</Text>
        ) : (
          sessionInsights.map((insight) => (
            <View key={insight.id} style={styles.recentSessionRow}>
              <Text style={styles.badgeLabel}>{insight.title}</Text>
              <Text style={styles.helperText}>
                {insight.durationMinutes}m • {insight.averageBpm} BPM • {insight.completedDrills}/{insight.totalDrills}{" "}
                drills • {insight.completed ? "Complete" : "Partial"}
              </Text>
            </View>
          ))
        )}
      </GlowCard>

      <GlowCard>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.cardLabel}>Daily Reminder</Text>
          <TouchableOpacity style={styles.pillButton} onPress={onToggleReminder}>
            <Text style={styles.pillButtonText}>{reminderEnabled ? "On" : "Off"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inlineRow}>
          <TextInput
            value={timeInput}
            onChangeText={setTimeInput}
            placeholder="18:00"
            placeholderTextColor={COLORS.muted}
            style={styles.timeInput}
          />
          <TouchableOpacity style={styles.smallActionButton} onPress={() => onSaveReminderTime(timeInput)}>
            <Text style={styles.smallActionText}>Save</Text>
          </TouchableOpacity>
        </View>

        {reminderError ? <Text style={styles.errorText}>{reminderError}</Text> : null}
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel} testID="home-achievements-title">Achievements</Text>
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View key={badge.id} style={[styles.badge, !badge.unlocked ? styles.badgeLocked : null]}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      </GlowCard>

      {storageError ? <Text style={styles.errorText}>{storageError}</Text> : null}

    </ScrollView>
  );
}

export function SessionBuilder(props: {
  templates: SessionTemplate[];
  selectedTemplateId: string | null;
  templateNameInput: string;
  builderError: string | null;
  drills: Drill[];
  onBack: () => void;
  onSelectTemplate: (id: string) => void;
  onTemplateNameInput: (value: string) => void;
  onCreateTemplate: () => void;
  onDuplicateTemplate: () => void;
  onSaveTemplate: () => void;
  onDeleteTemplate: () => void;
  selectedDrillId: string | null;
  drillNameInput: string;
  drillDurationInput: string;
  drillBpmInput: string;
  drillRandomizerKindInput: "none" | DrillRandomizerKind;
  drillRandomEveryBarsInput: string;
  onSelectDrill: (id: string) => void;
  onDrillNameInput: (value: string) => void;
  onDrillDurationInput: (value: string) => void;
  onDrillBpmInput: (value: string) => void;
  onDrillRandomizerKindInput: (value: "none" | DrillRandomizerKind) => void;
  onDrillRandomEveryBarsInput: (value: string) => void;
  onSaveDrill: () => void;
  onRemoveDrill: (id: string) => void;
  onReorderDrills: (ids: string[]) => void;
  onAddDrill: () => void;
  onStartSession: () => void;
}) {
  const {
    templates,
    selectedTemplateId,
    templateNameInput,
    builderError,
    drills,
    onBack,
    onSelectTemplate,
    onTemplateNameInput,
    onCreateTemplate,
    onDuplicateTemplate,
    onSaveTemplate,
    onDeleteTemplate,
    selectedDrillId,
    drillNameInput,
    drillDurationInput,
    drillBpmInput,
    drillRandomizerKindInput,
    drillRandomEveryBarsInput,
    onSelectDrill,
    onDrillNameInput,
    onDrillDurationInput,
    onDrillBpmInput,
    onDrillRandomizerKindInput,
    onDrillRandomEveryBarsInput,
    onSaveDrill,
    onRemoveDrill,
    onReorderDrills,
    onAddDrill,
    onStartSession,
  } = props;

  const totalXp = drills.reduce((sum, drill) => sum + toXp(drill), 0);
  const androidStartHandledRef = useRef(false);
  const templateNameTrimmed = templateNameInput.trim();
  const isTemplateNameValid = templateNameTrimmed.length >= 3;
  const isDrillEditorEnabled = Boolean(selectedDrillId);
  const drillNameTrimmed = drillNameInput.trim();
  const isDrillNameValid = drillNameTrimmed.length > 0;
  const parsedDuration = Number(drillDurationInput.trim());
  const isDurationValid = Number.isFinite(parsedDuration) && parsedDuration >= 1 && parsedDuration <= 30;
  const bpmRaw = drillBpmInput.trim();
  const parsedBpm = bpmRaw.length === 0 ? null : Number(bpmRaw);
  const isBpmValid =
    parsedBpm === null || (Number.isFinite(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 240);
  const parsedRandomEveryBars = Number(drillRandomEveryBarsInput.trim());
  const isRandomEveryBarsValid =
    drillRandomizerKindInput === "none" ||
    (Number.isFinite(parsedRandomEveryBars) && parsedRandomEveryBars >= 1 && parsedRandomEveryBars <= 16);
  const canSaveDrill =
    isDrillEditorEnabled && isDrillNameValid && isDurationValid && isBpmValid && isRandomEveryBarsValid;
  const noDrillSelected = drills.length > 0 && !selectedDrillId;

  function handleSaveTemplatePress(): void {
    if (!isTemplateNameValid) return;
    onSaveTemplate();
  }

  function handleSaveDrillPress(): void {
    if (!canSaveDrill) return;
    onSaveDrill();
  }

  function nudgeDuration(delta: number): void {
    const base = Number.isFinite(parsedDuration) ? parsedDuration : 5;
    const next = Math.max(1, Math.min(30, Math.round(base + delta)));
    onDrillDurationInput(String(next));
  }

  function nudgeBpm(delta: number): void {
    const base = Number.isFinite(parsedBpm ?? Number.NaN) ? (parsedBpm as number) : 100;
    const next = Math.max(40, Math.min(240, Math.round(base + delta)));
    onDrillBpmInput(String(next));
  }

  function nudgeRandomBars(delta: number): void {
    const base = Number.isFinite(parsedRandomEveryBars) ? parsedRandomEveryBars : 2;
    const next = Math.max(1, Math.min(16, Math.round(base + delta)));
    onDrillRandomEveryBarsInput(String(next));
  }

  function handleStartSessionPressIn(): void {
    if (Platform.OS !== "android") return;
    if (androidStartHandledRef.current) return;
    androidStartHandledRef.current = true;
    onStartSession();
  }

  function handleStartSessionPress(): void {
    if (Platform.OS === "android" && androidStartHandledRef.current) return;
    onStartSession();
  }

  function handleStartSessionPressOut(): void {
    if (Platform.OS === "android") {
      androidStartHandledRef.current = false;
    }
  }

  function moveDrill(drillId: string, direction: -1 | 1): void {
    const currentIndex = drills.findIndex((drill) => drill.id === drillId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= drills.length) return;

    const nextDrills = [...drills];
    const [moved] = nextDrills.splice(currentIndex, 1);
    nextDrills.splice(nextIndex, 0, moved);
    onReorderDrills(nextDrills.map((drill) => drill.id));
  }

  return (
    <View style={[styles.screenBody, styles.builderScreenBody]} testID="builder-screen">
      <View
        style={[
          styles.builderHeader,
          Platform.OS === "android" ? styles.builderHeaderAndroidLayer : null,
        ]}
      >
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.topActionButton}>
            <Text style={styles.topActionText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Session Builder</Text>
          <Text style={styles.levelChip}>{totalXp} XP</Text>
        </View>

        <GlowCard>
          <View style={styles.inlineRow}>
            <TouchableOpacity
              style={styles.smallActionButton}
              onPress={onCreateTemplate}
              testID="builder-template-new"
            >
              <Text style={styles.smallActionText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallActionButton} onPress={onDuplicateTemplate}>
              <Text style={styles.smallActionText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallActionButton, !isTemplateNameValid ? styles.actionButtonDisabled : null]}
              onPress={handleSaveTemplatePress}
              disabled={!isTemplateNameValid}
              testID="builder-template-save-button"
            >
              <Text style={styles.smallActionText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallDangerButton} onPress={onDeleteTemplate}>
              <Text style={styles.smallActionText}>Delete</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.templatePillsRow}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templatePill,
                  template.id === selectedTemplateId ? styles.templatePillActive : null,
                ]}
                onPress={() => onSelectTemplate(template.id)}
              >
                <Text style={styles.templatePillText}>{template.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={templateNameInput}
            onChangeText={onTemplateNameInput}
            placeholder="Session name"
            placeholderTextColor={COLORS.muted}
            style={styles.templateInput}
            testID="builder-template-name-input"
          />
          {templateNameInput.length > 0 && !isTemplateNameValid ? (
            <Text style={styles.helperText} testID="builder-template-name-validation">
              Session name must be at least 3 characters.
            </Text>
          ) : null}

          {builderError ? (
            <Text style={styles.errorText} testID="builder-error-text">
              {builderError}
            </Text>
          ) : null}
        </GlowCard>

        <Text style={styles.helperText}>Tap a drill card to edit. Use ↑ ↓ to reorder.</Text>
        <Text style={styles.helperText} testID="builder-drill-count">
          {drills.length} drills
        </Text>
        <View
          testID="builder-stats"
          accessibilityLabel={`${drills.length} drills ${totalXp} xp`}
          style={styles.builderStatsProbe}
        />
      </View>

      <FlatList
        testID="builder-drill-list"
        data={drills}
        style={[
          styles.builderList,
          Platform.OS === "android" ? styles.builderListAndroidLayer : null,
        ]}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.builderListContent}
        ListHeaderComponent={
          <View style={styles.builderListActions}>
            <TouchableOpacity
              style={[styles.primaryCta, styles.builderPrimaryCta]}
              onPress={handleStartSessionPress}
              onPressIn={handleStartSessionPressIn}
              onPressOut={handleStartSessionPressOut}
              testID="builder-start-session"
            >
              <Text style={styles.primaryCtaText}>Start This Session</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryCta} onPress={onAddDrill} testID="builder-add-drill">
              <Text style={styles.secondaryCtaText}>Add Drill</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallDangerButton}
              onPress={() => {
                if (drills.length > 0) onRemoveDrill(drills[0].id);
              }}
              testID="builder-remove-first-control"
              disabled={drills.length === 0}
            >
              <Text style={styles.smallActionText}>Remove First Drill</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          <View style={styles.builderFooter}>
            <GlowCard>
              <Text style={styles.cardLabel}>Edit Drill</Text>
              {noDrillSelected ? (
                <Text style={styles.helperText}>Select a drill card to edit its values.</Text>
              ) : null}
              <TextInput
                value={drillNameInput}
                onChangeText={onDrillNameInput}
                placeholder="Drill name"
                placeholderTextColor={COLORS.muted}
                style={styles.templateInput}
                editable={isDrillEditorEnabled}
                testID="builder-drill-name-input"
              />
              <View style={styles.inlineRow}>
                <TextInput
                  value={drillDurationInput}
                  onChangeText={onDrillDurationInput}
                  keyboardType="number-pad"
                  placeholder="Minutes (1-30)"
                  placeholderTextColor={COLORS.muted}
                  style={styles.timeInput}
                  editable={isDrillEditorEnabled}
                  testID="builder-drill-duration-input"
                />
                <TextInput
                  value={drillBpmInput}
                  onChangeText={onDrillBpmInput}
                  keyboardType="number-pad"
                  placeholder="BPM (40-240)"
                  placeholderTextColor={COLORS.muted}
                  style={styles.timeInput}
                  editable={isDrillEditorEnabled}
                  testID="builder-drill-bpm-input"
                />
              </View>
              {isDrillEditorEnabled ? (
                <View style={styles.inlineRow}>
                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => nudgeDuration(-1)}
                    testID="builder-drill-duration-decrement"
                  >
                    <Text style={styles.pillButtonText}>-1 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => nudgeDuration(1)}
                    testID="builder-drill-duration-increment"
                  >
                    <Text style={styles.pillButtonText}>+1 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => nudgeBpm(-5)}
                    testID="builder-drill-bpm-decrement"
                  >
                    <Text style={styles.pillButtonText}>-5 BPM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => nudgeBpm(5)}
                    testID="builder-drill-bpm-increment"
                  >
                    <Text style={styles.pillButtonText}>+5 BPM</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={styles.helperText}>Optional random cue</Text>
              <View style={styles.templatePillsRow}>
                {RANDOMIZER_KIND_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.templatePill,
                      drillRandomizerKindInput === option.value ? styles.templatePillActive : null,
                    ]}
                    onPress={() => onDrillRandomizerKindInput(option.value)}
                    disabled={!isDrillEditorEnabled}
                    testID={`builder-randomizer-${option.value}`}
                  >
                    <Text style={styles.templatePillText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {drillRandomizerKindInput !== "none" ? (
                <>
                  <View style={styles.inlineRow}>
                    <TextInput
                      value={drillRandomEveryBarsInput}
                      onChangeText={onDrillRandomEveryBarsInput}
                      keyboardType="number-pad"
                      placeholder="Every N bars (1-16)"
                      placeholderTextColor={COLORS.muted}
                      style={styles.timeInput}
                      editable={isDrillEditorEnabled}
                      testID="builder-random-bars-input"
                    />
                    <TouchableOpacity
                      style={styles.pillButton}
                      onPress={() => nudgeRandomBars(-1)}
                      testID="builder-random-bars-decrement"
                    >
                      <Text style={styles.pillButtonText}>-1 bar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pillButton}
                      onPress={() => nudgeRandomBars(1)}
                      testID="builder-random-bars-increment"
                    >
                      <Text style={styles.pillButtonText}>+1 bar</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    During active practice, cue pulses every {drillRandomEveryBarsInput || "?"} bars.
                  </Text>
                </>
              ) : null}
              {isDrillEditorEnabled && !isDrillNameValid ? (
                <Text style={styles.helperText} testID="builder-drill-validation-name">
                  Drill name cannot be empty.
                </Text>
              ) : null}
              {isDrillEditorEnabled && !isDurationValid ? (
                <Text style={styles.helperText} testID="builder-drill-validation-duration">
                  Duration must be a number from 1 to 30 minutes.
                </Text>
              ) : null}
              {isDrillEditorEnabled && !isBpmValid ? (
                <Text style={styles.helperText} testID="builder-drill-validation-bpm">
                  BPM must be blank or between 40 and 240.
                </Text>
              ) : null}
              {isDrillEditorEnabled && !isRandomEveryBarsValid ? (
                <Text style={styles.helperText} testID="builder-drill-validation-random-bars">
                  Random cue bars must be a number from 1 to 16.
                </Text>
              ) : null}
              <TouchableOpacity
                style={[styles.smallActionButton, !canSaveDrill ? styles.actionButtonDisabled : null]}
                onPress={handleSaveDrillPress}
                disabled={!canSaveDrill}
                testID="builder-save-drill-button"
              >
                <Text style={styles.smallActionText}>Save Drill</Text>
              </TouchableOpacity>
            </GlowCard>
          </View>
        }
        ListEmptyComponent={
          <GlowCard>
            <Text style={styles.cardLabel} testID="builder-empty-title">No Drills Yet</Text>
            <Text style={styles.completeSubtext}>
              Add a drill with the + button, then start your session.
            </Text>
            <TouchableOpacity style={styles.smallActionButton} onPress={onAddDrill}>
              <Text style={styles.smallActionText}>Add Starter Drill</Text>
            </TouchableOpacity>
          </GlowCard>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSelectDrill(item.id)}
            testID={`builder-drill-card-${item.id}`}
            style={[
              styles.drillCard,
              selectedDrillId === item.id ? styles.drillCardSelected : null,
            ]}
          >
            {index === 0 ? (
              <>
                <View testID="builder-drill-card-first" style={styles.builderProbe} />
                <View
                  testID="builder-drill-first-id-probe"
                  accessibilityLabel={item.id}
                  style={styles.builderProbe}
                />
              </>
            ) : null}
            <View style={styles.drillLeft}>
              <Text style={styles.drillOrder}>#{index + 1}</Text>
              <View style={styles.drillTextBlock}>
                <Text
                  style={styles.drillName}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  testID={`builder-drill-title-${item.id}`}
                >
                  {item.name}
                </Text>
                <Text style={styles.drillMeta}>
                  {Math.round(item.durationSeconds / 60)} min • {item.targetBpm ?? 100} BPM
                </Text>
              </View>
            </View>

            <View style={styles.builderCardActions}>
              <Text
                style={styles.drillXp}
                testID={`builder-drill-xp-${item.id}`}
              >
                +{toXp(item)} XP
              </Text>
              <TouchableOpacity
                style={[styles.moveChip, index === 0 ? styles.actionButtonDisabled : null]}
                onPress={() => moveDrill(item.id, -1)}
                disabled={index === 0}
                testID={`builder-move-up-${item.id}`}
              >
                <Text style={styles.smallActionText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveChip, index === drills.length - 1 ? styles.actionButtonDisabled : null]}
                onPress={() => moveDrill(item.id, 1)}
                disabled={index === drills.length - 1}
                testID={index === 0 ? "builder-move-first-down" : `builder-move-down-${item.id}`}
              >
                <Text style={styles.smallActionText}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeChip}
                onPress={() => onRemoveDrill(item.id)}
                testID={`builder-remove-${item.id}`}
              >
                <Text style={styles.removeChipText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {drills.length === 0 ? (
        <GlowCard style={styles.builderEmptyCard}>
          <Text style={styles.cardLabel} testID="builder-empty-title-fallback">No Drills Yet</Text>
          <Text style={styles.completeSubtext}>Tap + to add your first drill to this template.</Text>
        </GlowCard>
      ) : null}

      <TouchableOpacity
        style={styles.fab}
        onPress={onAddDrill}
        accessibilityRole="button"
        testID="builder-fab-add-drill"
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function ActivePractice(props: {
  drill: Drill;
  drillProgress: number;
  sessionProgress: number;
  remainingSec: number;
  isPaused: boolean;
  microcopy: string;
  completionPulse: Animated.Value;
  metronomeEnabled: boolean;
  metronomeBpm: number;
  beatFlash: boolean;
  randomCueLabel: string | null;
  randomCueBeatsRemaining: number;
  randomCuePulse: Animated.Value;
  onMetronomeToggle: () => void;
  onMetronomeStep: (delta: number) => void;
  onPauseToggle: () => void;
  onSkip: () => void;
}) {
  const {
    drill,
    drillProgress,
    sessionProgress,
    remainingSec,
    isPaused,
    microcopy,
    completionPulse,
    metronomeEnabled,
    metronomeBpm,
    beatFlash,
    randomCueLabel,
    randomCueBeatsRemaining,
    randomCuePulse,
    onMetronomeToggle,
    onMetronomeStep,
    onPauseToggle,
    onSkip,
  } = props;

  const pulseScale = completionPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });
  const cueScale = randomCuePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={styles.screenBody} testID="active-screen">
      <Text style={styles.cardLabel}>Session Progress</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, sessionProgress * 100)}%` }]} />
      </View>

      <Animated.View style={[styles.activeCard, styles.activeCardHighlight, { transform: [{ scale: pulseScale }] }]}>
        <ProgressRing size={240} strokeWidth={14} progress={drillProgress} color={COLORS.accent} />
        <View style={styles.timerOverlay}>
          <Text style={styles.timerValue}>{formatClock(remainingSec)}</Text>
          <Text style={styles.timerLabel}>{drill.name}</Text>
          <Text style={styles.xpInline}>Reward +{toXp(drill)} XP</Text>
        </View>
      </Animated.View>

      <GlowCard>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.cardLabel}>Metronome</Text>
          <TouchableOpacity style={styles.pillButton} onPress={onMetronomeToggle}>
            <Text style={styles.pillButtonText}>{metronomeEnabled ? "On" : "Off"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inlineRowSpace}>
          <TouchableOpacity style={styles.smallActionButton} onPress={() => onMetronomeStep(-5)}>
            <Text style={styles.smallActionText}>-5</Text>
          </TouchableOpacity>
          <Text style={styles.metronomeBpmLabel}>{metronomeBpm} BPM</Text>
          <TouchableOpacity style={styles.smallActionButton} onPress={() => onMetronomeStep(5)}>
            <Text style={styles.smallActionText}>+5</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inlineRow}>
          <View style={[styles.beatDot, beatFlash && metronomeEnabled ? styles.beatDotActive : null]} />
          <Text style={styles.helperText}>Beat indicator {metronomeEnabled ? "running" : "stopped"}</Text>
        </View>
        {randomCueLabel ? (
          <Animated.View style={[styles.randomCueCard, { transform: [{ scale: cueScale }] }]}>
            <Text style={styles.randomCueLabel}>Random Cue: {randomCueLabel}</Text>
            <Text style={styles.helperText}>Next trigger in {Math.max(0, randomCueBeatsRemaining)} beats</Text>
          </Animated.View>
        ) : null}
      </GlowCard>

      <Text style={styles.microcopy}>{microcopy}</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={onPauseToggle} testID="active-pause-toggle">
          <Text style={styles.controlButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.controlButtonSecondary]}
          onPress={onSkip}
          testID="active-skip-button"
        >
          <Text style={styles.controlButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SessionComplete(props: {
  sessionXp: number;
  leveledUp: boolean;
  level: number;
  streak: number;
  badges: Badge[];
  rewardGlow: Animated.Value;
  rewardScale: Animated.Value;
  onContinue: () => void;
}) {
  const { sessionXp, leveledUp, level, streak, badges, rewardGlow, rewardScale, onContinue } = props;

  const glowOpacity = rewardGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={styles.screenBody} testID="complete-screen">
      <Animated.View style={[styles.rewardGlow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.completeCard, styles.activeCardHighlight, { transform: [{ scale: rewardScale }] }]}>
        <Text style={styles.completeTitle}>Session Complete</Text>
        <Text style={styles.completeXp}>+{sessionXp} XP</Text>
        <Text style={styles.completeSubtext}>Great work. You moved your playing forward today.</Text>

        {leveledUp ? <Text style={styles.levelUp}>Level Up! You are now Level {level}.</Text> : null}
        <Text style={styles.streakLine}>🔥 Streak confirmed: {streak} days</Text>

        <View style={styles.badgeRow}>
          {badges.slice(0, 4).map((badge) => (
            <View key={badge.id} style={styles.badge}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.primaryCta} onPress={onContinue} testID="complete-continue-button">
        <Text style={styles.primaryCtaText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProgressRing(props: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
}) {
  const { size, strokeWidth, progress, color } = props;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: progress,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [animated, progress]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const dashOffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.divider}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        rotation="-90"
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}

function GlowCard(props: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.glowCard, props.style]}>{props.children}</View>;
}

interface LevelState {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

function getLevelState(totalXp: number): LevelState {
  const base = 250;
  let level = 1;
  let consumed = 0;

  while (consumed + base + (level - 1) * 60 <= totalXp) {
    consumed += base + (level - 1) * 60;
    level += 1;
  }

  const nextLevelXp = base + (level - 1) * 60;
  const currentLevelXp = totalXp - consumed;

  return { level, currentLevelXp, nextLevelXp };
}

function formatClock(totalSeconds: number): string {
  const safeTotalSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const min = Math.floor(safeTotalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (safeTotalSeconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  levelChip: {
    color: COLORS.xp,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(234,179,8,0.16)",
    borderRadius: 999,
    overflow: "hidden",
  },
  glowCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  progressTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.divider,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  rowTwoCol: {
    flexDirection: "row",
    gap: 12,
  },
  flexCard: {
    flex: 1,
  },
  bigValue: {
    color: COLORS.accent,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  ringText: {
    color: COLORS.text,
    marginTop: 10,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    minWidth: 96,
  },
  badgeLocked: {
    opacity: 0.45,
    borderColor: COLORS.divider,
  },
  badgeIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  badgeLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  primaryCta: {
    marginTop: "auto",
    backgroundColor: COLORS.accent,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  builderPrimaryCta: {
    marginTop: 0,
  },
  homePrimaryCta: {
    marginTop: 0,
  },
  primaryCtaText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  secondaryCta: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCtaText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  topActionButton: {
    minHeight: 44,
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  topActionText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  builderStatsProbe: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  builderProbe: {
    width: 1,
    height: 1,
    position: "absolute",
    top: 0,
    left: 0,
  },
  builderList: {
    flex: 1,
  },
  builderListAndroidLayer: {
    zIndex: 1,
  },
  builderListContent: {
    gap: 12,
    paddingBottom: 108,
  },
  builderListActions: {
    gap: 12,
    paddingBottom: 2,
  },
  builderHeader: {
    gap: 18,
    paddingBottom: 6,
    marginBottom: 12,
  },
  builderScreenBody: {
    gap: 0,
  },
  builderHeaderAndroidLayer: {
    zIndex: 12,
    elevation: 12,
  },
  builderFooter: {
    paddingTop: 6,
  },
  builderEmptyCard: {
    marginTop: 4,
  },
  drillCard: {
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  drillCardSelected: {
    borderColor: COLORS.accent,
  },
  drillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  drillTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  drillOrder: {
    color: COLORS.muted,
    fontWeight: "800",
    width: 28,
  },
  drillName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  drillMeta: {
    color: COLORS.muted,
    marginTop: 2,
    fontSize: 12,
  },
  builderCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
    flexShrink: 0,
  },
  drillXp: {
    color: COLORS.xp,
    fontWeight: "800",
    fontSize: 13,
    minWidth: 58,
    textAlign: "right",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 96,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 30,
  },
  fabText: {
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  activeCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  activeCardHighlight: {
    shadowColor: COLORS.accent,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  timerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timerValue: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: 1,
  },
  timerLabel: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: 220,
  },
  xpInline: {
    color: COLORS.xp,
    fontWeight: "700",
  },
  microcopy: {
    color: COLORS.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 18,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonSecondary: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  controlButtonText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 15,
  },
  rewardGlow: {
    position: "absolute",
    top: 86,
    alignSelf: "center",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.accent,
  },
  completeCard: {
    marginTop: 20,
    borderRadius: 18,
    padding: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 8,
  },
  completeTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
  },
  completeXp: {
    color: COLORS.xp,
    fontSize: 40,
    fontWeight: "900",
  },
  completeSubtext: {
    color: COLORS.muted,
    lineHeight: 20,
  },
  levelUp: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 6,
  },
  streakLine: {
    color: COLORS.accent,
    fontWeight: "700",
    marginTop: 4,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineRowSpace: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pillButton: {
    minHeight: 36,
    minWidth: 64,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pillButtonText: {
    color: COLORS.text,
    fontWeight: "800",
  },
  templatePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templatePill: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  templatePillActive: {
    borderColor: COLORS.text,
    backgroundColor: COLORS.cardSoft,
  },
  templatePillText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
  },
  templateInput: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    color: COLORS.text,
    paddingHorizontal: 12,
  },
  timeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    color: COLORS.text,
    paddingHorizontal: 12,
  },
  smallActionButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  goalTypeActive: {
    borderColor: COLORS.accentAlt,
    backgroundColor: COLORS.cardSoft,
  },
  smallDangerButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  smallActionText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
  },
  removeChip: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  moveChip: {
    minHeight: 30,
    minWidth: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  removeChipText: {
    color: COLORS.disabled,
    fontWeight: "700",
    fontSize: 11,
  },
  recentSessionRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
  },
  errorText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  metronomeBpmLabel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  beatDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  beatDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  randomCueCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  randomCueLabel: {
    color: COLORS.accentAlt,
    fontSize: 14,
    fontWeight: "800",
  },
});
