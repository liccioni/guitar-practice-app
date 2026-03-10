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
  useWindowDimensions,
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
import type { CreateDrillInput, Drill, DrillRandomizerKind, DrillTag } from "./src/domain/exercises/types";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings, type GoalType } from "./src/domain/goals/types";
import { calculateGoalTypeStreak } from "./src/domain/goals/streak";
import { computeUnlockedBadgeIds } from "./src/domain/gamification/badges";
import { calculateDashboardMetrics, toLocalDayKey } from "./src/domain/history/metrics";
import type { DrillSnapshot, PracticeHistoryEntry } from "./src/domain/history/types";
import { getBeatIntervalMs, stepBpm } from "./src/domain/metronome/metronome";
import {
  buildPracticeOnboardingSuggestion,
  DEFAULT_PRACTICE_ONBOARDING_STATE,
  ONBOARDING_RECOMMENDATION_VERSION,
  selectSuggestedDrills,
  type PracticeFocus,
  type PracticeOnboardingAnswers,
  type PracticeOnboardingState,
  type PracticePreference,
  type PracticeOutcome,
  type PracticeDurationMinutes,
  type WeeklyFrequencyDays,
  type GuitarLevel,
} from "./src/domain/profile/onboarding";
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
import { GlowCard } from "./src/ui/primitives/GlowCard";
import { COLORS, RADII, SPACING } from "./src/ui/theme";

type Screen = "home" | "songs" | "sessions" | "progress" | "profile" | "builder" | "active" | "complete";

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

interface SongLibraryItem {
  id: string;
  title: string;
  artist: string;
  level: "beginner" | "intermediate" | "advanced";
  mastered?: boolean;
  isNew?: boolean;
  durationMinutes: number;
  targetBpm: number;
  tags: DrillTag[];
}

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
const DRILL_CARD_COMPACT_MAX_WIDTH = 430;

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "b1", label: "7-Day Streak", icon: "🔥" },
  { id: "b2", label: "Rhythm Keeper", icon: "🎵" },
  { id: "b3", label: "XP Hunter", icon: "⚡" },
  { id: "b4", label: "Session Beast", icon: "🏆" },
];

const SONG_LIBRARY: SongLibraryItem[] = [
  {
    id: "song_wish_you_were_here",
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    level: "beginner",
    mastered: true,
    durationMinutes: 6,
    targetBpm: 76,
    tags: ["chords", "rhythm"],
  },
  {
    id: "song_horse_with_no_name",
    title: "Horse with No Name",
    artist: "America",
    level: "beginner",
    isNew: true,
    durationMinutes: 5,
    targetBpm: 92,
    tags: ["chords", "rhythm"],
  },
  {
    id: "song_sultans_of_swing",
    title: "Sultans of Swing",
    artist: "Dire Straits",
    level: "intermediate",
    durationMinutes: 8,
    targetBpm: 148,
    tags: ["technique", "improv"],
  },
  {
    id: "song_blackbird",
    title: "Blackbird",
    artist: "The Beatles",
    level: "intermediate",
    durationMinutes: 7,
    targetBpm: 126,
    tags: ["technique", "scales"],
  },
];

const DEFAULT_PROFILE = {
  totalXp: 0,
  unlockedBadgeIds: [] as string[],
  onboarding: DEFAULT_PRACTICE_ONBOARDING_STATE,
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
  const [focusModeEnabled, setFocusModeEnabled] = useState(true);
  const [beatPulseLocked, setBeatPulseLocked] = useState(true);
  const [randomCueLabel, setRandomCueLabel] = useState<string | null>(null);
  const [randomCueNextLabel, setRandomCueNextLabel] = useState<string | null>(null);
  const [randomCueBeatsRemaining, setRandomCueBeatsRemaining] = useState(0);
  const [randomCuePulseWindowActive, setRandomCuePulseWindowActive] = useState(false);

  const [totalXp, setTotalXp] = useState(DEFAULT_PROFILE.totalXp);
  const [onboardingState, setOnboardingState] = useState<PracticeOnboardingState>(
    DEFAULT_PROFILE.onboarding,
  );
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
        onboarding: onboardingState,
      },
    });
  }, [allDrills, badges, goalSettings, history, isHydrated, onboardingState, templates, totalXp]);

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
          const nextCue = pickRandomCueValue(randomizer.kind);
          setRandomCueLabel(randomCueNextLabel ?? nextCue);
          setRandomCueNextLabel(nextCue);
          randomCueRemainingRef.current = resetBeats;
          setRandomCueBeatsRemaining(resetBeats);
          setRandomCuePulseWindowActive(false);
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
          const enteringPulseWindow = nextRemaining === 1;
          setRandomCuePulseWindowActive(enteringPulseWindow);
          if (enteringPulseWindow) {
            randomCuePulse.setValue(0);
            Animated.sequence([
              Animated.timing(randomCuePulse, {
                toValue: 1,
                duration: 220,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(randomCuePulse, {
                toValue: 0,
                duration: 260,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      }

      try {
        Vibration.vibrate(10);
      } catch {
        // Ignore vibration capability failures (e.g. simulator), keep visual beat running.
      }
    }, intervalMs);

    return () => clearInterval(beatTimer);
  }, [activeDrill, isPaused, metronomeBpm, metronomeEnabled, randomCueNextLabel, randomCuePulse, screen]);

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
      setRandomCueNextLabel(null);
      setRandomCueBeatsRemaining(0);
      setRandomCuePulseWindowActive(false);
      randomCuePulse.setValue(0);
      return;
    }

    const initialBeats = randomizer.everyBars * 4;
    const currentCue = pickRandomCueValue(randomizer.kind);
    const nextCue = pickRandomCueValue(randomizer.kind);
    randomCueRemainingRef.current = initialBeats;
    setRandomCueLabel(currentCue);
    setRandomCueNextLabel(nextCue);
    setRandomCueBeatsRemaining(initialBeats);
    setRandomCuePulseWindowActive(false);
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

  function addSongToBuilder(song: SongLibraryItem): void {
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

  function startSongNow(song: SongLibraryItem): void {
    addSongToBuilder(song);
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

  function maybeAutoSaveDrillEdits(input: {
    name: string;
    duration: string;
    bpm: string;
    randomKind: "none" | DrillRandomizerKind;
    randomBars: string;
  }): void {
    if (!selectedBuilderDrill || !selectedTemplate) return;

    const name = input.name;
    const durationRaw = input.duration.trim();
    const bpmRaw = input.bpm.trim();
    const randomBarsRaw = input.randomBars.trim();
    const durationMinutes = Number(durationRaw);
    const parsedBpm = bpmRaw.length === 0 ? null : Number(bpmRaw);
    const parsedEveryBars = Number(randomBarsRaw);

    const hasValidName = name.trim().length > 0;
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
      selectedBuilderDrill.name === name &&
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
          name,
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

  function navigateFromTab(next: "home" | "songs" | "sessions" | "progress" | "profile"): void {
    setScreen(next);
  }

  const onboardingSuggestion = useMemo(() => {
    if (!onboardingState.answers) return null;
    return buildPracticeOnboardingSuggestion(onboardingState.answers);
  }, [onboardingState.answers]);

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
              onboardingState={onboardingState}
              onboardingSuggestion={onboardingSuggestion}
              onGoalTypeChange={setGoalType}
              onSaveGoalTarget={saveGoalTarget}
              onToggleReminder={toggleReminder}
              onSaveReminderTime={saveReminderTime}
              onSaveOnboardingAnswers={saveOnboardingAnswers}
              onApplyOnboardingSuggestion={applyOnboardingSuggestionToBuilder}
              onResetOnboarding={resetOnboardingQuestionnaire}
              onStartPractice={startPracticeFlow}
              onOpenSessions={() => setScreen("sessions")}
            />
          ) : null}

          {screen === "sessions" ? (
            <SessionsLibrary
              templates={templates}
              drills={allDrills}
              activeTemplateId={selectedTemplate?.id ?? null}
              onOpenBuilder={(templateId) => {
                setActiveTemplateId(templateId);
                setScreen("builder");
              }}
            />
          ) : null}

          {screen === "songs" ? (
            <SongsLibrary
              songs={SONG_LIBRARY}
              onAddToBuilder={addSongToBuilder}
              onStartNow={startSongNow}
            />
          ) : null}

          {screen === "progress" ? (
            <ProgressStats
              weeklySummary={weeklySummary}
              sessionInsights={recentSessionInsights}
              averageBpm={metrics.averageBpm}
              streak={streak}
            />
          ) : null}

          {screen === "profile" ? (
            <ProfileAchievements
              levelState={levelState}
              totalXp={totalXp}
              badges={badges}
              onboardingState={onboardingState}
              onResetOnboarding={resetOnboardingQuestionnaire}
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
              onDrillNameInput={handleDrillNameInput}
              onDrillDurationInput={handleDrillDurationInput}
              onDrillBpmInput={handleDrillBpmInput}
              onDrillRandomizerKindInput={handleDrillRandomizerKindInput}
              onDrillRandomEveryBarsInput={handleDrillRandomEveryBarsInput}
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
              randomCueNextLabel={randomCueNextLabel}
              randomCueBeatsRemaining={randomCueBeatsRemaining}
              randomCuePulseWindowActive={randomCuePulseWindowActive}
              randomCuePulse={randomCuePulse}
              focusModeEnabled={focusModeEnabled}
              beatPulseLocked={beatPulseLocked}
              onMetronomeToggle={() => setMetronomeEnabled((current) => !current)}
              onMetronomeStep={(delta) => setMetronomeBpm((current) => stepBpm(current, delta))}
              onToggleFocusMode={() => setFocusModeEnabled((current) => !current)}
              onToggleBeatPulseLocked={() => setBeatPulseLocked((current) => !current)}
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
          {screen !== "active" && screen !== "complete" ? (
            <AppTabBar screen={screen} onNavigate={navigateFromTab} />
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function HomeDashboard(props: {
  levelState: LevelState;
  streak: number;
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
  onboardingState: PracticeOnboardingState;
  onboardingSuggestion: ReturnType<typeof buildPracticeOnboardingSuggestion> | null;
  onGoalTypeChange: (goalType: GoalType) => void;
  onSaveGoalTarget: (target: string) => void;
  onToggleReminder: () => void;
  onSaveReminderTime: (time: string) => void;
  onSaveOnboardingAnswers: (answers: PracticeOnboardingAnswers) => void;
  onApplyOnboardingSuggestion: () => void;
  onResetOnboarding: () => void;
  onStartPractice: () => void;
  onOpenSessions: () => void;
}) {
  const {
    levelState,
    streak,
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
    onboardingState,
    onboardingSuggestion,
    onGoalTypeChange,
    onSaveGoalTarget,
    onToggleReminder,
    onSaveReminderTime,
    onSaveOnboardingAnswers,
    onApplyOnboardingSuggestion,
    onResetOnboarding,
    onStartPractice,
    onOpenSessions,
  } = props;

  const [timeInput, setTimeInput] = useState(reminderTime);
  const [goalTargetInput, setGoalTargetInput] = useState(String(goalTarget));
  const [levelInput, setLevelInput] = useState<GuitarLevel>(onboardingState.answers?.level ?? "beginner");
  const [durationInput, setDurationInput] = useState<PracticeDurationMinutes>(
    onboardingState.answers?.durationMinutes ?? 30,
  );
  const [focusInput, setFocusInput] = useState<PracticeFocus>(onboardingState.answers?.focus ?? "technique");
  const [outcomeInput, setOutcomeInput] = useState<PracticeOutcome>(
    onboardingState.answers?.outcome ?? "consistency",
  );
  const [weeklyFrequencyInput, setWeeklyFrequencyInput] = useState<WeeklyFrequencyDays>(
    onboardingState.answers?.weeklyFrequencyDays ?? 5,
  );
  const [practicePreferenceInput, setPracticePreferenceInput] = useState<PracticePreference>(
    onboardingState.answers?.practicePreference ?? "balanced",
  );

  useEffect(() => {
    setTimeInput(reminderTime);
  }, [reminderTime]);

  useEffect(() => {
    setGoalTargetInput(String(goalTarget));
  }, [goalTarget]);

  useEffect(() => {
    if (!onboardingState.answers) return;
    setLevelInput(onboardingState.answers.level);
    setDurationInput(onboardingState.answers.durationMinutes);
    setFocusInput(onboardingState.answers.focus);
    setOutcomeInput(onboardingState.answers.outcome);
    setWeeklyFrequencyInput(onboardingState.answers.weeklyFrequencyDays);
    setPracticePreferenceInput(onboardingState.answers.practicePreference);
  }, [onboardingState.answers]);

  function submitOnboardingAnswers(): void {
    onSaveOnboardingAnswers({
      level: levelInput,
      durationMinutes: durationInput,
      focus: focusInput,
      outcome: outcomeInput,
      weeklyFrequencyDays: weeklyFrequencyInput,
      practicePreference: practicePreferenceInput,
    });
  }

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
      testID="home-scroll"
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandEyebrow}>FRETLINE</Text>
          <Text style={styles.title}>Ready to play?</Text>
          <Text style={styles.headerSubline}>Welcome back to Fretline</Text>
        </View>
        <Text style={styles.levelChip}>Level {levelState.level}</Text>
      </View>

      <GlowCard style={styles.homeHeroPanel}>
        <Text style={styles.cardLabel}>Today&apos;s Session</Text>
        <Text style={styles.heroHeadline}>Keep your streak alive</Text>
        <Text style={styles.heroSubline}>
          {goalCurrentValue}/{goalTarget} {goalUnitLabel} • {streak} day streak
        </Text>
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
        <Text style={styles.helperText}>
          {levelState.currentLevelXp}/{levelState.nextLevelXp} XP to next level
        </Text>
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
          onPress={onOpenSessions}
          accessibilityRole="button"
          testID="home-quick-start-practice"
        >
          <Text style={styles.smallActionText}>Customize Session</Text>
        </TouchableOpacity>
      </GlowCard>

      <View style={styles.homeStatStrip}>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Streak</Text>
          <Text style={styles.statChipValue}>{streak} days</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Goal</Text>
          <Text style={styles.statChipValue}>
            {goalCurrentValue}/{goalTarget} {goalUnitLabel}
          </Text>
        </View>
      </View>

      <GlowCard>
        <Text style={styles.cardLabel}>Starter Questionnaire</Text>
        {!onboardingState.completed ? (
          <>
            <Text style={styles.helperText}>Answer 6 quick questions and get a focused starting routine.</Text>
            <Text style={styles.helperText}>Level</Text>
            <View style={styles.templatePillsRow}>
              {(["beginner", "intermediate", "expert"] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.templatePill, levelInput === level ? styles.templatePillActive : null]}
                  onPress={() => setLevelInput(level)}
                  testID={`onboarding-level-${level}`}
                >
                  <Text style={styles.templatePillText}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>Practice Time</Text>
            <View style={styles.templatePillsRow}>
              {([20, 30, 60] as const).map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.templatePill, durationInput === minutes ? styles.templatePillActive : null]}
                  onPress={() => setDurationInput(minutes)}
                  testID={`onboarding-duration-${minutes}`}
                >
                  <Text style={styles.templatePillText}>{minutes} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>Focus</Text>
            <View style={styles.templatePillsRow}>
              {(["technique", "rhythm", "fretboard", "improv"] as const).map((focus) => (
                <TouchableOpacity
                  key={focus}
                  style={[styles.templatePill, focusInput === focus ? styles.templatePillActive : null]}
                  onPress={() => setFocusInput(focus)}
                  testID={`onboarding-focus-${focus}`}
                >
                  <Text style={styles.templatePillText}>{focus}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>Primary Goal</Text>
            <View style={styles.templatePillsRow}>
              {(["consistency", "speed", "song-prep"] as const).map((outcome) => (
                <TouchableOpacity
                  key={outcome}
                  style={[styles.templatePill, outcomeInput === outcome ? styles.templatePillActive : null]}
                  onPress={() => setOutcomeInput(outcome)}
                  testID={`onboarding-outcome-${outcome}`}
                >
                  <Text style={styles.templatePillText}>{outcome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>Weekly Frequency</Text>
            <View style={styles.templatePillsRow}>
              {([3, 5, 7] as const).map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.templatePill, weeklyFrequencyInput === days ? styles.templatePillActive : null]}
                  onPress={() => setWeeklyFrequencyInput(days)}
                  testID={`onboarding-frequency-${days}`}
                >
                  <Text style={styles.templatePillText}>{days} days</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>Practice Style</Text>
            <View style={styles.templatePillsRow}>
              {(["structured", "balanced", "exploratory"] as const).map((preference) => (
                <TouchableOpacity
                  key={preference}
                  style={[
                    styles.templatePill,
                    practicePreferenceInput === preference ? styles.templatePillActive : null,
                  ]}
                  onPress={() => setPracticePreferenceInput(preference)}
                  testID={`onboarding-preference-${preference}`}
                >
                  <Text style={styles.templatePillText}>{preference}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.smallActionButton}
              onPress={submitOnboardingAnswers}
              testID="onboarding-generate"
            >
              <Text style={styles.smallActionText}>Generate Practice Plan</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.helperText}>
              {onboardingSuggestion?.summary ?? "Starter profile saved."}
            </Text>
            <Text style={styles.helperText}>
              Suggested session: {onboardingSuggestion?.sessionName ?? onboardingState.lastSuggestedTemplateName}
            </Text>
            <View style={styles.inlineRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={onApplyOnboardingSuggestion}
                testID="onboarding-apply-suggestion"
              >
                <Text style={styles.smallActionText}>Build This Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={onResetOnboarding}
                testID="onboarding-retake"
              >
                <Text style={styles.smallActionText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Practice Controls</Text>
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
            <Text style={styles.smallActionText}>Save</Text>
          </TouchableOpacity>
        </View>
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

        {goalError ? <Text style={styles.errorText}>{goalError}</Text> : null}
        {reminderError ? <Text style={styles.errorText}>{reminderError}</Text> : null}
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Progress Snapshot</Text>
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
        <View style={styles.cardSectionDivider} />
        <Text style={styles.cardLabel}>Recent Sessions</Text>
        {sessionInsights.length === 0 ? (
          <Text style={styles.helperText}>No sessions yet. Start one to unlock progress tracking.</Text>
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
    onRemoveDrill,
    onReorderDrills,
    onAddDrill,
    onStartSession,
  } = props;

  const totalXp = drills.reduce((sum, drill) => sum + toXp(drill), 0);
  const { width } = useWindowDimensions();
  const androidStartHandledRef = useRef(false);
  const templateNameTrimmed = templateNameInput.trim();
  const isTemplateNameValid = templateNameTrimmed.length >= 3;
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
  const useCompactDrillCard = width <= DRILL_CARD_COMPACT_MAX_WIDTH;
  const drillTitleLineLimit = useCompactDrillCard ? 3 : 2;

  function handleSaveTemplatePress(): void {
    if (!isTemplateNameValid) return;
    onSaveTemplate();
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
          <Text style={styles.title}>Build Your Chain</Text>
          <Text style={styles.levelChip}>{totalXp} XP</Text>
        </View>
        <Text style={styles.headerSubline}>Assemble your routine, then hit play.</Text>

        <GlowCard style={styles.builderHeroCard}>
          <Text style={styles.heroSubline}>Shape your drill flow, then hit play.</Text>
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

        <Text style={styles.helperText}>Tap a drill card to edit it in place. Changes autosave.</Text>
        <Text style={styles.helperText} testID="builder-drill-count">
          {drills.length} drills
        </Text>
        <View
          testID="builder-stats"
          accessibilityLabel={`${drills.length} drills ${totalXp} xp lineLimit:${drillTitleLineLimit}`}
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
            <View style={styles.drillCardTopRow}>
              <View style={styles.drillLeft}>
                <Text style={styles.drillOrder}>#{index + 1}</Text>
                <View style={styles.drillTextBlock}>
                  <Text
                    style={styles.drillName}
                    numberOfLines={drillTitleLineLimit}
                    ellipsizeMode="tail"
                    testID={`builder-drill-title-${item.id}`}
                  >
                    {item.name}
                  </Text>
                  {index === 0 ? (
                    <Text
                      testID="builder-drill-title-lines-first"
                      style={styles.drillLineLimitProbe}
                    >
                      {String(drillTitleLineLimit)}
                    </Text>
                  ) : null}
                  <Text style={styles.drillMeta}>
                    {Math.round(item.durationSeconds / 60)} min • {item.targetBpm ?? 100} BPM
                  </Text>
                  {useCompactDrillCard ? (
                    <Text style={[styles.drillXp, styles.drillXpCompact]} testID={`builder-drill-xp-${item.id}`}>
                      +{toXp(item)} XP
                    </Text>
                  ) : null}
                  {item.randomizer ? (
                    <Text style={styles.drillRandomMeta}>
                      Cue: {item.randomizer.kind} every {item.randomizer.everyBars} bars
                    </Text>
                  ) : null}
                </View>
              </View>
              {!useCompactDrillCard ? (
                <Text style={styles.drillXp} testID={`builder-drill-xp-${item.id}`}>
                  +{toXp(item)} XP
                </Text>
              ) : null}
            </View>

            <View style={styles.builderCardActions}>
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
            {selectedDrillId === item.id ? (
              <View style={styles.drillInlineEditor}>
                <TextInput
                  value={drillNameInput}
                  onChangeText={onDrillNameInput}
                  placeholder="Drill name"
                  placeholderTextColor={COLORS.muted}
                  style={styles.templateInput}
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
                    testID="builder-drill-duration-input"
                  />
                  <TextInput
                    value={drillBpmInput}
                    onChangeText={onDrillBpmInput}
                    keyboardType="number-pad"
                    placeholder="BPM (40-240)"
                    placeholderTextColor={COLORS.muted}
                    style={styles.timeInput}
                    testID="builder-drill-bpm-input"
                  />
                </View>
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
                {!isDrillNameValid ? (
                  <Text style={styles.helperText} testID="builder-drill-validation-name">
                    Drill name cannot be empty.
                  </Text>
                ) : null}
                {!isDurationValid ? (
                  <Text style={styles.helperText} testID="builder-drill-validation-duration">
                    Duration must be a number from 1 to 30 minutes.
                  </Text>
                ) : null}
                {!isBpmValid ? (
                  <Text style={styles.helperText} testID="builder-drill-validation-bpm">
                    BPM must be blank or between 40 and 240.
                  </Text>
                ) : null}
                {!isRandomEveryBarsValid ? (
                  <Text style={styles.helperText} testID="builder-drill-validation-random-bars">
                    Random cue bars must be a number from 1 to 16.
                  </Text>
                ) : null}
                <Text style={styles.helperText}>Autosaves as you type.</Text>
              </View>
            ) : null}
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

function SessionsLibrary(props: {
  templates: SessionTemplate[];
  drills: Drill[];
  activeTemplateId: string | null;
  onOpenBuilder: (templateId: string) => void;
}) {
  const { templates, drills, activeTemplateId, onOpenBuilder } = props;
  const featuredTemplate = templates.find((template) => template.id === activeTemplateId) ?? templates[0] ?? null;
  const featuredDrillNames = featuredTemplate
    ? featuredTemplate.drillIds
        .map((id) => drills.find((drill) => drill.id === id)?.name)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3)
    : [];

  return (
    <View style={styles.screenBody}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Sessions</Text>
      </View>
      <Text style={styles.helperText}>Pick a preset chain, then tweak it in the builder.</Text>

      {featuredTemplate ? (
        <GlowCard style={[styles.homeHeroPanel, styles.sessionsHeroCard]}>
          <Text style={styles.cardLabel}>Featured Preset</Text>
          <Text style={styles.heroHeadline}>{featuredTemplate.name}</Text>
          <Text style={styles.heroSubline}>
            {featuredTemplate.drillIds.length} drills • {Math.max(0, Math.round(featuredTemplate.totalDurationSeconds / 60))} min
          </Text>
          {featuredDrillNames.length > 0 ? (
            <View style={styles.sessionsPresetChipRow}>
              {featuredDrillNames.map((name) => (
                <View key={name} style={styles.sessionsPresetChip}>
                  <Text style={styles.sessionsPresetChipText} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity style={styles.primaryCta} onPress={() => onOpenBuilder(featuredTemplate.id)}>
            <Text style={styles.primaryCtaText}>Edit Featured Preset</Text>
          </TouchableOpacity>
        </GlowCard>
      ) : null}

      <ScrollView contentContainerStyle={styles.sessionsList} showsVerticalScrollIndicator={false}>
        {templates.map((template) => {
          const items = template.drillIds
            .map((id) => drills.find((drill) => drill.id === id))
            .filter((drill): drill is Drill => Boolean(drill));
          const totalXp = items.reduce((sum, drill) => sum + toXp(drill), 0);
          const totalMinutes = Math.max(0, Math.round(template.totalDurationSeconds / 60));

          return (
            <GlowCard key={template.id} style={styles.sessionPresetCard}>
              <View style={styles.inlineRowSpace}>
                <Text style={styles.sessionPresetTitle}>{template.name}</Text>
                <Text style={styles.levelChip}>+{totalXp} XP</Text>
              </View>
              <Text style={styles.helperText}>
                {items.length} drills • {totalMinutes} min
              </Text>
              <Text style={styles.sessionsPresetPreview} numberOfLines={1}>
                {items.slice(0, 3).map((item) => item.name).join(" • ") || "No drills yet"}
              </Text>
              <TouchableOpacity style={styles.primaryCta} onPress={() => onOpenBuilder(template.id)}>
                <Text style={styles.primaryCtaText}>Open Builder</Text>
              </TouchableOpacity>
            </GlowCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProgressStats(props: {
  weeklySummary: WeeklySummary;
  sessionInsights: SessionInsight[];
  averageBpm: number;
  streak: number;
}) {
  const { weeklySummary, sessionInsights, averageBpm, streak } = props;
  const base = Math.max(1, weeklySummary.weekMinutes);
  const skillBars = [
    { label: "Technique", value: Math.min(100, Math.round((weeklySummary.weekDrillsCompleted * 12) / base * 10)) },
    { label: "Timing", value: Math.min(100, Math.round(averageBpm)) },
    { label: "Speed", value: Math.min(100, Math.round((averageBpm / 160) * 100)) },
    { label: "Fretboard", value: Math.min(100, Math.round((weeklySummary.weekSessions / 7) * 100)) },
    { label: "Consistency", value: Math.min(100, Math.round((streak / 14) * 100)) },
  ];
  const milestones = [
    {
      id: "level_unlock",
      title: `Level ${Math.max(2, Math.round((averageBpm + weeklySummary.weekSessions) / 12))} Unlocks`,
      detail: "New blues soloing module",
      progress: Math.max(10, Math.min(98, Math.round((weeklySummary.weekMinutes / 180) * 100))),
    },
    {
      id: "streak_unlock",
      title: "30 Day Streak",
      detail: "Exclusive profile badge",
      progress: Math.max(0, Math.min(100, Math.round((streak / 30) * 100))),
    },
    {
      id: "speed_unlock",
      title: "Speed Demon",
      detail: "Hit 140 BPM on scales",
      progress: Math.max(0, Math.min(100, Math.round((averageBpm / 140) * 100))),
    },
  ];

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeScrollContent}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Progress & Stats</Text>
      </View>
      <GlowCard style={styles.homeHeroPanel}>
        <Text style={styles.cardLabel}>This Week</Text>
        <Text style={styles.heroHeadline}>{weeklySummary.weekMinutes} min played</Text>
        <Text style={styles.heroSubline}>
          {weeklySummary.weekSessions} sessions • {weeklySummary.weekDrillsCompleted} drills
        </Text>
      </GlowCard>
      <GlowCard>
        <Text style={styles.cardLabel}>Skills Mastered</Text>
        {skillBars.map((skill) => (
          <View key={skill.label} style={styles.skillRow}>
            <View style={styles.inlineRowSpace}>
              <Text style={styles.badgeLabel}>{skill.label}</Text>
              <Text style={styles.helperText}>Level {Math.max(1, Math.round(skill.value / 10))}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(4, skill.value)}%` }]} />
            </View>
          </View>
        ))}
      </GlowCard>
      <GlowCard>
        <Text style={styles.cardLabel}>Upcoming Milestones</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneRow}>
          {milestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneCard}>
              <Text style={styles.badgeLabel}>{milestone.title}</Text>
              <Text style={styles.helperText}>{milestone.detail}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(4, milestone.progress)}%` }]} />
              </View>
              <Text style={styles.helperText}>{milestone.progress}% complete</Text>
            </View>
          ))}
        </ScrollView>
      </GlowCard>
      <GlowCard>
        <Text style={styles.cardLabel}>Recent Form</Text>
        {sessionInsights.length === 0 ? (
          <Text style={styles.helperText}>Complete one session to see improvement trends.</Text>
        ) : (
          sessionInsights.map((insight) => (
            <View key={insight.id} style={styles.recentSessionRow}>
              <Text style={styles.badgeLabel}>{insight.title}</Text>
              <Text style={styles.helperText}>
                {insight.durationMinutes}m • {insight.averageBpm} BPM • {insight.completedDrills}/{insight.totalDrills}
              </Text>
            </View>
          ))
        )}
      </GlowCard>
    </ScrollView>
  );
}

function SongsLibrary(props: {
  songs: SongLibraryItem[];
  onAddToBuilder: (song: SongLibraryItem) => void;
  onStartNow: (song: SongLibraryItem) => void;
}) {
  const { songs, onAddToBuilder, onStartNow } = props;
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | SongLibraryItem["level"]>("all");

  const visibleSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return songs.filter((song) => {
      const levelMatches = levelFilter === "all" || song.level === levelFilter;
      const textMatches =
        normalized.length === 0 ||
        song.title.toLowerCase().includes(normalized) ||
        song.artist.toLowerCase().includes(normalized);
      return levelMatches && textMatches;
    });
  }, [levelFilter, query, songs]);

  const featuredSong = songs[0] ?? null;

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Songs</Text>
      </View>
      <Text style={styles.headerSubline}>Discover tracks and add them directly to your routine.</Text>

      <GlowCard>
        <Text style={styles.cardLabel}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, or tabs"
          placeholderTextColor={COLORS.muted}
          style={styles.templateInput}
          testID="songs-search-input"
        />
        <View style={styles.templatePillsRow}>
          {(["all", "beginner", "intermediate", "advanced"] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.templatePill, levelFilter === level ? styles.templatePillActive : null]}
              onPress={() => setLevelFilter(level)}
              testID={`songs-filter-${level}`}
            >
              <Text style={styles.templatePillText}>{level === "all" ? "All Levels" : level}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlowCard>

      {featuredSong ? (
        <GlowCard style={styles.homeHeroPanel}>
          <Text style={styles.cardLabel}>Featured Challenge</Text>
          <Text style={styles.heroHeadline}>{featuredSong.title}</Text>
          <Text style={styles.heroSubline}>
            {featuredSong.artist} • {featuredSong.level}
          </Text>
          <View style={styles.inlineRow}>
            <TouchableOpacity
              style={styles.smallActionButton}
              onPress={() => onAddToBuilder(featuredSong)}
              testID="songs-featured-add"
            >
              <Text style={styles.smallActionText}>Add to Chain</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => onStartNow(featuredSong)}
              testID="songs-featured-start"
            >
              <Text style={styles.primaryCtaText}>Start Now</Text>
            </TouchableOpacity>
          </View>
        </GlowCard>
      ) : null}

      <GlowCard>
        <Text style={styles.cardLabel}>Library</Text>
        {visibleSongs.length === 0 ? (
          <Text style={styles.helperText}>No songs matched this filter.</Text>
        ) : (
          visibleSongs.map((song) => (
            <View key={song.id} style={styles.songRow}>
              <View style={styles.songMeta}>
                <View style={styles.inlineRow}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  {song.mastered ? <Text style={styles.songTagMastered}>Mastered</Text> : null}
                  {song.isNew ? <Text style={styles.songTagNew}>New</Text> : null}
                </View>
                <Text style={styles.helperText}>
                  {song.artist} • {song.level} • {song.durationMinutes} min • {song.targetBpm} BPM
                </Text>
              </View>
              <View style={styles.songActions}>
                <TouchableOpacity
                  style={styles.smallActionButton}
                  onPress={() => onAddToBuilder(song)}
                  testID={`songs-add-${song.id}`}
                >
                  <Text style={styles.smallActionText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallActionButton}
                  onPress={() => onStartNow(song)}
                  testID={`songs-start-${song.id}`}
                >
                  <Text style={styles.smallActionText}>Play</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </GlowCard>
    </ScrollView>
  );
}

function ProfileAchievements(props: {
  levelState: LevelState;
  totalXp: number;
  badges: Badge[];
  onboardingState: PracticeOnboardingState;
  onResetOnboarding: () => void;
}) {
  const { levelState, totalXp, badges, onboardingState, onResetOnboarding } = props;
  const unlocked = badges.filter((badge) => badge.unlocked).length;
  const xpProgressPercent = Math.max(
    6,
    Math.round((levelState.currentLevelXp / Math.max(1, levelState.nextLevelXp)) * 100),
  );

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeScrollContent}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <GlowCard style={styles.homeHeroPanel}>
        <Text style={styles.cardLabel}>Player Identity</Text>
        <Text style={styles.heroHeadline}>Level {levelState.level} Guitarist</Text>
        <Text style={styles.heroSubline}>{totalXp} total XP • {unlocked} badges unlocked</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${xpProgressPercent}%` }]} />
        </View>
        <Text style={styles.helperText}>
          {levelState.currentLevelXp}/{levelState.nextLevelXp} XP toward Level {levelState.level + 1}
        </Text>
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Achievements</Text>
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View key={badge.id} style={[styles.badge, !badge.unlocked ? styles.badgeLocked : null]}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Onboarding Plan</Text>
        <Text style={styles.helperText}>
          {onboardingState.completed ? "Questionnaire completed." : "Questionnaire not completed yet."}
        </Text>
        <TouchableOpacity style={styles.smallActionButton} onPress={onResetOnboarding}>
          <Text style={styles.smallActionText}>Reset Questionnaire</Text>
        </TouchableOpacity>
      </GlowCard>
    </ScrollView>
  );
}

function AppTabBar(props: {
  screen: Screen;
  onNavigate: (screen: "home" | "songs" | "sessions" | "progress" | "profile") => void;
}) {
  const { screen, onNavigate } = props;
  const tabs: { id: "home" | "songs" | "sessions" | "progress" | "profile"; label: string }[] = [
    { id: "home", label: "Practice" },
    { id: "songs", label: "Songs" },
    { id: "sessions", label: "Sessions" },
    { id: "progress", label: "Progress" },
    { id: "profile", label: "Profile" },
  ];
  const selectedTab = screen === "builder" ? "sessions" : screen;

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, selectedTab === tab.id ? styles.tabItemActive : null]}
          onPress={() => onNavigate(tab.id)}
        >
          <Text style={[styles.tabLabel, selectedTab === tab.id ? styles.tabLabelActive : null]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
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
  randomCueNextLabel: string | null;
  randomCueBeatsRemaining: number;
  randomCuePulseWindowActive: boolean;
  randomCuePulse: Animated.Value;
  focusModeEnabled: boolean;
  beatPulseLocked: boolean;
  onMetronomeToggle: () => void;
  onMetronomeStep: (delta: number) => void;
  onToggleFocusMode: () => void;
  onToggleBeatPulseLocked: () => void;
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
    randomCueNextLabel,
    randomCueBeatsRemaining,
    randomCuePulseWindowActive,
    randomCuePulse,
    focusModeEnabled,
    beatPulseLocked,
    onMetronomeToggle,
    onMetronomeStep,
    onToggleFocusMode,
    onToggleBeatPulseLocked,
    onPauseToggle,
    onSkip,
  } = props;

  const pulseScale = completionPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const cueScale = randomCuePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <View style={styles.screenBody} testID="active-screen">
      <View style={styles.activeTopRow}>
        <Text style={styles.cardLabel}>Practice Mode</Text>
        <TouchableOpacity style={styles.pillButton} onPress={onToggleFocusMode} testID="active-focus-toggle">
          <Text style={styles.pillButtonText}>{focusModeEnabled ? "Focus On" : "Focus Off"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, sessionProgress * 100)}%` }]} />
      </View>

      <Animated.View style={[styles.activeCard, styles.activeCardHighlight, { transform: [{ scale: pulseScale }] }]}>
        <ProgressRing size={272} strokeWidth={16} progress={drillProgress} color={COLORS.accent} />
        <View style={styles.timerOverlay}>
          <Text style={styles.timerValue}>{formatClock(remainingSec)}</Text>
          <Text style={styles.timerNowLabel}>Now Playing</Text>
          <Text style={styles.timerLabel}>{drill.name}</Text>
          <Text style={styles.xpInline}>Reward +{toXp(drill)} XP</Text>
        </View>
      </Animated.View>

      <GlowCard>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.cardLabel}>Metronome Rig</Text>
          <TouchableOpacity style={styles.pillButton} onPress={onMetronomeToggle}>
            <Text style={styles.pillButtonText}>{metronomeEnabled ? "On" : "Off"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metronomeStrip}>
          <TouchableOpacity style={[styles.smallActionButton, styles.metronomeStepButton]} onPress={() => onMetronomeStep(-5)}>
            <Text style={styles.smallActionText}>-5</Text>
          </TouchableOpacity>
          <View style={styles.bpmPill}>
            <Text style={styles.metronomeBpmLabel}>{metronomeBpm} BPM</Text>
          </View>
          <TouchableOpacity style={[styles.smallActionButton, styles.metronomeStepButton]} onPress={() => onMetronomeStep(5)}>
            <Text style={styles.smallActionText}>+5</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.inlineRow} onPress={onToggleBeatPulseLocked} testID="active-beat-pulse-toggle">
          <View style={[styles.beatDot, beatFlash && metronomeEnabled && beatPulseLocked ? styles.beatDotActive : null]} />
          <Text style={styles.helperText}>
            Beat pulse {beatPulseLocked && metronomeEnabled ? "locked" : "free"}
          </Text>
        </TouchableOpacity>
        {randomCueLabel ? (
          <Animated.View style={[styles.randomCueCard, { transform: [{ scale: cueScale }] }]}>
            <Text style={styles.randomCueLabel}>Now: {randomCueLabel}</Text>
            {randomCueNextLabel ? (
              <Text style={styles.helperText}>Upcoming: {randomCueNextLabel}</Text>
            ) : null}
            {randomCuePulseWindowActive ? <Text style={styles.helperText}>Cue incoming...</Text> : null}
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
  const [shared, setShared] = useState(false);

  const glowOpacity = rewardGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={styles.screenBody} testID="complete-screen">
      <Animated.View style={[styles.rewardGlow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.completeCard, styles.activeCardHighlight, { transform: [{ scale: rewardScale }] }]}>
        <Text style={styles.cardLabel}>Session Complete</Text>
        <Text style={styles.completeTitle}>Session Crushed</Text>
        <Text style={styles.completeXp}>+{sessionXp} XP</Text>
        <Text style={styles.completeSubtext}>Clean reps stacked. Your playing moved forward today.</Text>

        <View style={styles.completeStatsRow}>
          <View style={styles.completeStatChip}>
            <Text style={styles.completeStatLabel}>Current Level</Text>
            <Text style={styles.completeStatValue}>Lv {level}</Text>
          </View>
          <View style={styles.completeStatChip}>
            <Text style={styles.completeStatLabel}>Streak</Text>
            <Text style={styles.completeStatValue}>{streak} days</Text>
          </View>
        </View>

        {leveledUp ? <Text style={styles.levelUp}>Level Up! Welcome to Level {level}.</Text> : null}
        <Text style={styles.streakLine}>Streak protected and momentum locked in.</Text>

        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.slice(0, 4).map((badge) => (
              <View key={badge.id} style={styles.badge}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>Keep stacking sessions to unlock your first badge.</Text>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.primaryCta} onPress={onContinue} testID="complete-continue-button">
        <Text style={styles.primaryCtaText}>Back to Practice Hub</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryCta}
        onPress={() => setShared(true)}
        testID="complete-share-button"
      >
        <Text style={styles.secondaryCtaText}>{shared ? "Shared to clipboard-ready summary" : "Share Achievements"}</Text>
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
    paddingHorizontal: SPACING.pageX,
    paddingTop: 16,
    paddingBottom: 100,
    gap: SPACING.sectionGap,
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingHorizontal: SPACING.pageX,
    paddingTop: 16,
    paddingBottom: 120,
    gap: SPACING.sectionGap,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  headerSubline: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  brandEyebrow: {
    color: COLORS.accentAlt,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  levelChip: {
    color: COLORS.xp,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(234,179,8,0.16)",
    borderRadius: RADII.pill,
    overflow: "hidden",
  },
  homeHeroPanel: {
    borderColor: "rgba(230,126,0,0.52)",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  builderHeroCard: {
    borderColor: "rgba(217,119,6,0.45)",
  },
  heroHeadline: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  heroSubline: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 21,
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
    height: 13,
    borderRadius: RADII.pill,
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
  homeStatStrip: {
    flexDirection: "row",
    gap: 12,
  },
  statChip: {
    flex: 1,
    borderRadius: RADII.chip,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  statChipLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statChipValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
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
    backgroundColor: COLORS.accent,
    minHeight: 58,
    borderRadius: RADII.card,
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
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  secondaryCta: {
    minHeight: 48,
    borderRadius: RADII.chip,
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
    borderRadius: RADII.chip,
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
    fontSize: 14,
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
    gap: 12,
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
    minHeight: 102,
    borderRadius: RADII.card,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 12,
  },
  drillCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  drillCardSelected: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
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
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    flexShrink: 1,
  },
  drillMeta: {
    color: COLORS.muted,
    marginTop: 2,
    fontSize: 13,
  },
  drillRandomMeta: {
    color: COLORS.accentAlt,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  drillLineLimitProbe: {
    fontSize: 1,
    lineHeight: 1,
    height: 1,
    marginTop: 0,
    color: "transparent",
  },
  builderCardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
  },
  drillInlineEditor: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
    gap: 8,
  },
  drillXp: {
    color: COLORS.xp,
    fontWeight: "800",
    fontSize: 18,
    minWidth: 70,
    textAlign: "right",
    marginTop: 2,
  },
  drillXpCompact: {
    minWidth: 0,
    textAlign: "left",
    marginTop: 4,
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
    paddingVertical: 12,
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
    gap: 4,
  },
  timerValue: {
    color: COLORS.text,
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  timerNowLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
  activeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeModeHint: {
    color: COLORS.accentAlt,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
    top: 72,
    alignSelf: "center",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accent,
  },
  completeCard: {
    marginTop: 8,
    borderRadius: RADII.card,
    padding: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.42)",
    gap: 10,
  },
  completeTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
  },
  completeXp: {
    color: COLORS.xp,
    fontSize: 56,
    fontWeight: "900",
  },
  completeSubtext: {
    color: COLORS.muted,
    lineHeight: 20,
  },
  completeStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  completeStatChip: {
    flex: 1,
    borderRadius: RADII.chip,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  completeStatLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  completeStatValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
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
    marginTop: 2,
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
    borderRadius: RADII.pill,
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
    borderRadius: RADII.pill,
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
    borderRadius: RADII.chip,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    color: COLORS.text,
    paddingHorizontal: 12,
  },
  timeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADII.chip,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    color: COLORS.text,
    paddingHorizontal: 12,
  },
  smallActionButton: {
    minHeight: 38,
    borderRadius: RADII.chip,
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
    borderRadius: RADII.chip,
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
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: COLORS.cardSoft,
  },
  moveChip: {
    minHeight: 30,
    minWidth: 30,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardSoft,
  },
  removeChipText: {
    color: COLORS.muted,
    fontWeight: "700",
    fontSize: 11,
  },
  recentSessionRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
  },
  cardSectionDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 4,
  },
  sessionsList: {
    gap: 12,
    paddingBottom: 24,
  },
  songRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  songMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    maxWidth: "78%",
  },
  songActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  songTagMastered: {
    color: "#22c55e",
    borderColor: "rgba(34,197,94,0.35)",
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  songTagNew: {
    color: COLORS.text,
    backgroundColor: COLORS.accent,
    borderRadius: RADII.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  milestoneRow: {
    gap: 10,
    paddingRight: 6,
  },
  milestoneCard: {
    width: 220,
    borderRadius: RADII.chip,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    padding: 12,
    gap: 8,
  },
  sessionsHeroCard: {
    gap: 10,
  },
  sessionsPresetChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sessionsPresetChip: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  sessionsPresetChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  sessionPresetCard: {
    gap: 10,
  },
  sessionPresetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    paddingRight: 8,
  },
  sessionsPresetPreview: {
    color: COLORS.muted,
    fontSize: 13,
  },
  skillRow: {
    gap: 6,
    marginBottom: 8,
  },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    minHeight: 64,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: RADII.card,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tabItem: {
    flex: 1,
    minHeight: 46,
    borderRadius: RADII.chip,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabItemActive: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.45)",
  },
  tabLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: COLORS.text,
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
  metronomeStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metronomeStepButton: {
    minWidth: 56,
  },
  bpmPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.cardSoft,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: RADII.chip,
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
