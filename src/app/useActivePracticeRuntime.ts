import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Vibration } from "react-native";
import type { DrillCueMode } from "../application/drillCueAudio";
import { playDrillTransitionCue } from "../application/drillCueAudio";
import {
  trackDrillCompleted,
  trackSessionStarted,
} from "./analytics";
import {
  advanceRandomCueState,
  buildDrillCompletionTransition,
  createEmptyRandomCueState,
  createRandomCueState,
  type DrillCompletionTransition,
  getRuntimeProgress,
  type RandomCueRuntimeState,
} from "./activePracticeRuntime";
import {
  playMetronomeTick,
  primeMetronomeAudio,
  releaseMetronomeAudio,
} from "../application/metronomeAudio";
import { prepareSessionStart } from "../application/startSessionPreparation";
import type { Screen } from "./usePracticeAppState";
import type { Drill } from "../domain/exercises/types";
import { getBeatIntervalMs, stepBpm } from "../domain/metronome/metronome";
import {
  advanceToNextSegment,
  createRuntimeState,
  getCurrentSegment,
  pauseRuntime,
  resumeRuntime,
  skipCurrentSegment,
  startRuntime,
  tickRuntime,
  type RuntimeState,
} from "../domain/sessions/runtimeState";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";

const MOTIVATION = [
  "Lock in. Every rep makes you cleaner.",
  "Stay relaxed, stay precise.",
  "Small gains compound fast.",
  "You are one drill away from momentum.",
];

interface SessionFinishedPayload {
  activeDrillIds: string[];
  completedDrillIds: string[];
  completedDurationSec: number;
  elapsedSec: number;
  sessionXp: number;
}

const DRILL_TRANSITION_MS = 1400;

interface UseActivePracticeRuntimeInput {
  allDrills: Drill[];
  screen: Screen;
  selectedTemplate: SessionTemplate | null;
  totalXp: number;
  drillCueMode: DrillCueMode;
  onBuilderError: (error: string | null) => void;
  onScreenChange: (screen: Screen) => void;
  onSessionFinished: (payload: SessionFinishedPayload) => void;
  onTotalXpChange: (nextTotalXp: number) => void;
}

export interface ActivePracticeRuntimeValue {
  activeDrill: Drill | null;
  activeDrillIds: string[];
  beatFlash: boolean;
  beatPulseLocked: boolean;
  completedDrillIds: string[];
  completedDurationSec: number;
  completionPulse: Animated.Value;
  currentMicrocopy: string;
  drillCompletionTransition: DrillCompletionTransition | null;
  transitionCountdownSec: number;
  drillProgress: number;
  elapsedSec: number;
  focusModeEnabled: boolean;
  isPaused: boolean;
  leveledUp: boolean;
  metronomeBpm: number;
  metronomeEnabled: boolean;
  randomCueBeatsRemaining: number;
  randomCueLabel: string | null;
  randomCueNextLabel: string | null;
  randomCuePulse: Animated.Value;
  randomCuePulseWindowActive: boolean;
  remainingSec: number;
  sessionProgress: number;
  sessionXp: number;
  disableMetronome(): void;
  resetSession(): void;
  skipDrill(): void;
  startSession(): void;
  stepMetronome(delta: number): void;
  toggleBeatPulseLocked(): void;
  toggleFocusMode(): void;
  toggleMetronome(): void;
  togglePause(): void;
}

export function useActivePracticeRuntime({
  allDrills,
  screen,
  selectedTemplate,
  totalXp,
  onBuilderError,
  onScreenChange,
  onSessionFinished,
  onTotalXpChange,
  drillCueMode,
}: UseActivePracticeRuntimeInput): ActivePracticeRuntimeValue {
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [metronomeBpm, setMetronomeBpm] = useState(100);
  const [beatFlash, setBeatFlash] = useState(false);
  const [focusModeEnabled, setFocusModeEnabled] = useState(true);
  const [beatPulseLocked, setBeatPulseLocked] = useState(true);
  const [randomCueState, setRandomCueState] = useState<RandomCueRuntimeState>(createEmptyRandomCueState);
  const [sessionXp, setSessionXp] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [currentMicrocopy, setCurrentMicrocopy] = useState(MOTIVATION[0]);
  const [drillCompletionTransition, setDrillCompletionTransition] = useState<DrillCompletionTransition | null>(null);
  const [transitionCountdownSec, setTransitionCountdownSec] = useState(0);

  const completionPulse = useRef(new Animated.Value(0)).current;
  const randomCuePulse = useRef(new Animated.Value(0)).current;
  const sessionXpRef = useRef(0);
  const totalXpRef = useRef(totalXp);
  const completedIdsRef = useRef<string[]>([]);
  const finishedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    totalXpRef.current = totalXp;
  }, [totalXp]);

  const progress = useMemo(() => getRuntimeProgress(runtimeState), [runtimeState]);
  const activeDrill = useMemo(() => {
    const currentDrillId = runtimeState ? getCurrentSegment(runtimeState)?.drillId : null;
    if (!currentDrillId) return null;
    return allDrills.find((drill) => drill.id === currentDrillId) ?? null;
  }, [allDrills, runtimeState]);

  useEffect(() => {
    if (screen !== "active" || !runtimeState || runtimeState.status !== "running") return;

    const timer = setInterval(() => {
      setRuntimeState((current) => (current ? tickRuntime(current) : current));
    }, 1000);

    return () => clearInterval(timer);
  }, [runtimeState, screen]);

  useEffect(() => {
    if (screen !== "active" || !runtimeState || runtimeState.status !== "running" || !metronomeEnabled) {
      setBeatFlash(false);
      return;
    }

    const intervalMs = getBeatIntervalMs(metronomeBpm);
    const beatTimer = setInterval(() => {
      setBeatFlash((current) => !current);
      void playMetronomeTick();

      const randomizer = activeDrill?.randomizer;
      if (randomizer) {
        setRandomCueState((current) => {
          const next = advanceRandomCueState(current, randomizer);
          if (next.shouldPulse) {
            triggerRandomCuePulse(randomCuePulse);
          }
          return next.nextState;
        });
      }

      try {
        Vibration.vibrate(10);
      } catch {
        // Keep the beat indicator working in environments without vibration support.
      }
    }, intervalMs);

    return () => clearInterval(beatTimer);
  }, [activeDrill, metronomeBpm, metronomeEnabled, randomCuePulse, runtimeState, screen]);

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
    if (screen !== "active" || !activeDrill?.randomizer) {
      setRandomCueState(createEmptyRandomCueState());
      randomCuePulse.setValue(0);
      return;
    }

    setRandomCueState(createRandomCueState(activeDrill.randomizer));
    randomCuePulse.setValue(0);
  }, [activeDrill, randomCuePulse, screen]);

  useEffect(() => {
    if (!runtimeState) {
      completedIdsRef.current = [];
      return;
    }

    const previousCompletedIds = completedIdsRef.current;
    const newlyCompletedIds = runtimeState.completedDrillIds.filter(
      (drillId) => !previousCompletedIds.includes(drillId),
    );

    if (newlyCompletedIds.length > 0) {
      triggerCompletionPulse(completionPulse);

      let nextSessionXp = sessionXpRef.current;
      let nextTotalXp = totalXpRef.current;
      let didLevelUp = false;

      for (const drillId of newlyCompletedIds) {
        const drill = allDrills.find((item) => item.id === drillId);
        if (!drill) continue;

        const gainedXp = toXp(drill);
        nextSessionXp += gainedXp;

        const previousLevel = getLevel(nextTotalXp);
        nextTotalXp += gainedXp;
        const nextLevel = getLevel(nextTotalXp);
        didLevelUp = didLevelUp || nextLevel > previousLevel;

        if (selectedTemplate) {
          trackDrillCompleted({
            template: selectedTemplate,
            drill,
            drillIndex: Math.max(1, selectedTemplate.drillIds.indexOf(drillId) + 1),
            totalDrills: selectedTemplate.drillIds.length,
            gainedXp,
          });
        }
      }

      sessionXpRef.current = nextSessionXp;
      totalXpRef.current = nextTotalXp;

      setSessionXp(nextSessionXp);
      setLeveledUp((current) => current || didLevelUp);
      onTotalXpChange(nextTotalXp);
    }

    completedIdsRef.current = runtimeState.completedDrillIds;
  }, [allDrills, completionPulse, onTotalXpChange, runtimeState, selectedTemplate]);

  useEffect(() => {
    if (!runtimeState) return;

    if (runtimeState.status === "segmentComplete") {
      const transition = buildDrillCompletionTransition(runtimeState);
      setDrillCompletionTransition(transition);
      setTransitionCountdownSec(transition?.preparationCountdownSec ?? 0);
      if (transition && !transition.isSessionFinisher) {
        void playDrillTransitionCue(drillCueMode, transition.nextDrillName);
      }

      const countdownTimer = setInterval(() => {
        setTransitionCountdownSec((current) => (current <= 1 ? 0 : current - 1));
      }, 1000);

      const timer = setTimeout(() => {
        const nextState = advanceToNextSegment(runtimeState);
        if (nextState.currentIndex !== runtimeState.currentIndex) {
          setCurrentMicrocopy(MOTIVATION[nextState.currentIndex % MOTIVATION.length]);
        }
        setDrillCompletionTransition(null);
        setTransitionCountdownSec(0);
        setRuntimeState(nextState);
      }, DRILL_TRANSITION_MS);

      return () => {
        clearInterval(countdownTimer);
        clearTimeout(timer);
      };
    }

    if (drillCompletionTransition) {
      setDrillCompletionTransition(null);
      setTransitionCountdownSec(0);
    }

    if (runtimeState.status !== "finished") {
      return;
    }

    const finishedKey = [
      runtimeState.startedAt,
      runtimeState.currentIndex,
      runtimeState.completedDrillIds.join(","),
      runtimeState.durationCompletedSeconds,
      sessionXpRef.current,
    ].join("|");
    if (finishedKeyRef.current === finishedKey) return;
    finishedKeyRef.current = finishedKey;

    onSessionFinished({
      activeDrillIds: progress.activeDrillIds,
      completedDrillIds: runtimeState.completedDrillIds,
      completedDurationSec: runtimeState.durationCompletedSeconds,
      elapsedSec: progress.elapsedSec,
      sessionXp: sessionXpRef.current,
    });
  }, [drillCompletionTransition, drillCueMode, onSessionFinished, progress.activeDrillIds, progress.elapsedSec, runtimeState]);

  function startSession(): void {
    const prepared = prepareSessionStart({
      selectedTemplate,
      allDrills,
      currentMetronomeBpm: metronomeBpm,
    });

    if (!prepared.ok || !selectedTemplate) {
      onBuilderError(prepared.ok ? "No session template available. Create a template first." : prepared.error);
      return;
    }

    const nextRuntimeState = startRuntime(
      createRuntimeState({
        template: selectedTemplate,
        drills: prepared.resolvedDrills,
        nowIso: new Date().toISOString(),
      }),
    );

    onBuilderError(null);
    completedIdsRef.current = [];
    finishedKeyRef.current = null;
    sessionXpRef.current = 0;
    setRuntimeState(nextRuntimeState);
    setSessionXp(0);
    setLeveledUp(false);
    setCurrentMicrocopy(MOTIVATION[0]);
    setDrillCompletionTransition(null);
    setTransitionCountdownSec(0);
    setMetronomeBpm(prepared.nextMetronomeBpm);
    setMetronomeEnabled(true);
    trackSessionStarted({
      source: screen === "overview" ? "overview" : screen === "builder" ? "builder" : "unknown",
      template: selectedTemplate,
      drillCount: prepared.resolvedDrills.length,
    });
    onScreenChange("active");
  }

  function togglePause(): void {
    setRuntimeState((current) => {
      if (!current) return current;
      return current.status === "paused" ? resumeRuntime(current) : pauseRuntime(current);
    });
  }

  function skipDrill(): void {
    setRuntimeState((current) => (current ? skipCurrentSegment(current) : current));
  }

  function resetSession(): void {
    setRuntimeState(null);
    completedIdsRef.current = [];
    finishedKeyRef.current = null;
    sessionXpRef.current = 0;
    setSessionXp(0);
    setLeveledUp(false);
    setBeatFlash(false);
    setRandomCueState(createEmptyRandomCueState());
    setCurrentMicrocopy(MOTIVATION[0]);
    setDrillCompletionTransition(null);
    setTransitionCountdownSec(0);
    randomCuePulse.setValue(0);
  }

  function disableMetronome(): void {
    setMetronomeEnabled(false);
  }

  return {
    activeDrill,
    activeDrillIds: progress.activeDrillIds,
    beatFlash,
    beatPulseLocked,
    completedDrillIds: progress.completedDrillIds,
    completedDurationSec: progress.completedDurationSec,
    completionPulse,
    currentMicrocopy,
    drillCompletionTransition,
    transitionCountdownSec,
    drillProgress: progress.drillProgress,
    elapsedSec: progress.elapsedSec,
    focusModeEnabled,
    isPaused: runtimeState?.status === "paused",
    leveledUp,
    metronomeBpm,
    metronomeEnabled,
    randomCueBeatsRemaining: randomCueState.beatsRemaining,
    randomCueLabel: randomCueState.label,
    randomCueNextLabel: randomCueState.nextLabel,
    randomCuePulse,
    randomCuePulseWindowActive: randomCueState.pulseWindowActive,
    remainingSec: progress.remainingSec,
    sessionProgress: progress.sessionProgress,
    sessionXp,
    disableMetronome,
    resetSession,
    skipDrill,
    startSession,
    stepMetronome(delta: number): void {
      setMetronomeBpm((current) => stepBpm(current, delta));
    },
    toggleBeatPulseLocked(): void {
      setBeatPulseLocked((current) => !current);
    },
    toggleFocusMode(): void {
      setFocusModeEnabled((current) => !current);
    },
    toggleMetronome(): void {
      setMetronomeEnabled((current) => !current);
    },
    togglePause,
  };
}

function toXp(drill: Drill): number {
  const durationMinutes = Math.max(1, Math.round(drill.durationSeconds / 60));
  const bpmBonus = drill.targetBpm ? Math.round((drill.targetBpm - 40) / 10) : 0;
  return Math.max(25, durationMinutes * 10 + bpmBonus);
}

function getLevel(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / 100) + 1;
}

function triggerCompletionPulse(completionPulse: Animated.Value): void {
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

function triggerRandomCuePulse(randomCuePulse: Animated.Value): void {
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
