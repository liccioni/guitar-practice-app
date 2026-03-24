import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useActivePracticeRuntime } from "./src/app/useActivePracticeRuntime";
import { buildComebackPrompt } from "./src/app/comebackPrompts";
import { restoreLocalPurchases } from "./src/app/planManagement";
import { buildPaywallEntryPoint } from "./src/app/paywallEntryPoints";
import { createLocalPlanSelection } from "./src/app/pricingPlans";
import { buildSessionOverviewSummary } from "./src/app/sessionOverview";
import { trackSessionCompleted } from "./src/app/analytics";
import { buildBadgeState, makeId, type Screen, usePracticeAppState } from "./src/app/usePracticeAppState";
import type { EntitlementPlanId } from "./src/domain/monetization/entitlements";
import type { Drill } from "./src/domain/exercises/types";
import { calculateGoalTypeStreak } from "./src/domain/goals/streak";
import { computeUnlockedBadgeIds } from "./src/domain/gamification/badges";
import { calculateDashboardMetrics, toLocalDayKey } from "./src/domain/history/metrics";
import type { DrillSnapshot, PracticeHistoryEntry } from "./src/domain/history/types";
import { GlowCard } from "./src/ui/primitives/GlowCard";
import {
  ActivePractice,
  AppTabBar,
  buildRecentSessionInsights,
  buildWeeklySummary,
  getLevelState,
  goalUnit,
  HomeDashboard,
  ProfileAchievements,
  PricingScreen,
  ProgressStats,
  SessionOverview,
  SessionBuilder,
  SessionComplete,
  SessionsLibrary,
  SONG_LIBRARY,
  SongsLibrary,
  styles,
} from "./src/ui/screens";

function toSnapshot(drill: Drill): DrillSnapshot {
  return {
    id: drill.id,
    name: drill.name,
    durationSeconds: drill.durationSeconds,
    targetBpm: drill.targetBpm,
  };
}

export default function App() {
  const {
    addDrillToTemplate,
    addSongToBuilder,
    allDrills,
    applyOnboardingSuggestionToBuilder,
    badges,
    builderDrills,
    builderError,
    canAccessFeature,
    createTemplate,
    deleteTemplate,
    drillBpmInput,
    drillDurationInput,
    drillNameInput,
    drillRandomEveryBarsInput,
    drillRandomizerKindInput,
    duplicateTemplate,
    entitlements,
    getFeatureAvailability,
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
    saveGoalTarget,
    saveOnboardingAnswers,
    saveReminderTime,
    saveTemplate,
    screen,
    selectedBuilderDrill,
    selectedTemplate,
    setActiveTemplateId,
    setBadges,
    setBuilderError,
    setEntitlements,
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
  } = usePracticeAppState();

  type PricingReturnScreen = Exclude<Screen, "active" | "complete" | "pricing">;
  const pricingReturnScreen = useRef<PricingReturnScreen>("profile");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rewardScale = useRef(new Animated.Value(0.92)).current;
  const rewardGlow = useRef(new Animated.Value(0)).current;

  const nowIso = new Date().toISOString();

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics({
        entries: history,
        nowIso,
        dailyMinutesTarget: goalSettings.dailyMinutesTarget,
      }),
    [goalSettings.dailyMinutesTarget, history, nowIso],
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
  const comebackPrompt = useMemo(() => buildComebackPrompt(history, nowIso), [history, nowIso]);
  const streak = useMemo(
    () => calculateGoalTypeStreak(history, nowIso, goalType, goalTarget),
    [goalTarget, goalType, history, nowIso],
  );

  const levelState = useMemo(() => getLevelState(totalXp), [totalXp]);
  const completedSessions = useMemo(
    () => history.filter((entry) => entry.completed).length,
    [history],
  );
  const premiumContentGate = useMemo(
    () => (canAccessFeature("premium-content") ? null : getFeatureAvailability("premium-content")),
    [canAccessFeature, getFeatureAvailability],
  );
  const advancedPracticeGate = useMemo(
    () => (canAccessFeature("advanced-practice") ? null : getFeatureAvailability("advanced-practice")),
    [canAccessFeature, getFeatureAvailability],
  );
  const planManagementGate = useMemo(
    () => (canAccessFeature("plan-management") ? null : getFeatureAvailability("plan-management")),
    [canAccessFeature, getFeatureAvailability],
  );
  const songsPaywallEntryPoint = useMemo(
    () => buildPaywallEntryPoint({ surface: "songs", currentPlanId: entitlements.planId }),
    [entitlements.planId],
  );
  const overviewPaywallEntryPoint = useMemo(
    () => buildPaywallEntryPoint({ surface: "overview", currentPlanId: entitlements.planId }),
    [entitlements.planId],
  );
  const progressPaywallEntryPoint = useMemo(
    () =>
      buildPaywallEntryPoint({
        surface: "progress",
        currentPlanId: entitlements.planId,
        streak,
        completedSessions,
      }),
    [completedSessions, entitlements.planId, streak],
  );
  const sessionOverview = useMemo(
    () => buildSessionOverviewSummary(builderDrills),
    [builderDrills],
  );
  const activeRuntime = useActivePracticeRuntime({
    allDrills,
    screen,
    selectedTemplate,
    totalXp,
    onBuilderError: setBuilderError,
    onScreenChange: setScreen,
    onSessionFinished: ({ activeDrillIds, completedDrillIds, completedDurationSec, elapsedSec, sessionXp }) => {
      finishSession(activeDrillIds, completedDrillIds, completedDurationSec, elapsedSec, sessionXp);
    },
    onTotalXpChange: setTotalXp,
  });

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

  function finishSession(
    finalActiveDrillIds: string[],
    finalCompletedDrillIds: string[],
    finalCompletedDurationSec: number,
    finalElapsedSec: number,
    finalSessionXp: number,
  ): void {
    if (!selectedTemplate) {
      setScreen("complete");
      return;
    }

    const drillsSnapshot = finalActiveDrillIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill))
      .map(toSnapshot);

    const entry: PracticeHistoryEntry = {
      id: makeId("history"),
      sessionTemplateId: selectedTemplate.id,
      sessionNameSnapshot: selectedTemplate.name,
      drillsSnapshot,
      completedDrillIds: finalCompletedDrillIds,
      startedAt: new Date(Date.now() - finalElapsedSec * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationCompletedSeconds: finalCompletedDurationSec,
      completed: finalCompletedDrillIds.length === finalActiveDrillIds.length,
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

    trackSessionCompleted({
      template: selectedTemplate,
      completedDrillCount: finalCompletedDrillIds.length,
      totalDrillCount: finalActiveDrillIds.length,
      durationCompletedSec: finalCompletedDurationSec,
      elapsedSec: finalElapsedSec,
      sessionXp: finalSessionXp,
    });

    setHistory(nextHistory);
    setBadges(buildBadgeState(nextUnlockedBadgeIds));
    setScreen("complete");
  }

  function forceCompleteActiveSession(): void {
    finishSession(
      activeRuntime.activeDrillIds,
      [...activeRuntime.completedDrillIds],
      activeRuntime.completedDurationSec,
      activeRuntime.elapsedSec,
      activeRuntime.sessionXp,
    );
  }

  function startSongNow(song: (typeof SONG_LIBRARY)[number]): void {
    addSongToBuilder(song);
  }

  function openPricingScreen(from: PricingReturnScreen): void {
    pricingReturnScreen.current = from;
    setScreen("pricing");
  }

  function closePricingScreen(): void {
    setScreen(pricingReturnScreen.current);
  }

  function selectPricingPlan(planId: EntitlementPlanId): void {
    setEntitlements(createLocalPlanSelection(planId, new Date().toISOString()));
    setRestoreMessage(null);
    closePricingScreen();
  }

  function restorePurchases(): void {
    const result = restoreLocalPurchases(entitlements);
    setRestoreMessage(result.message);
  }

  function resetToHome(): void {
    activeRuntime.resetSession();
    activeRuntime.disableMetronome();
    setScreen("home");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
          <StatusBar style="light" hidden />
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {screen === "home" ? (
              <HomeDashboard
                levelState={levelState}
                totalXp={totalXp}
                streak={streak}
                goalType={goalType}
                goalCurrentValue={goalCurrentValue}
                goalTarget={goalTarget}
                goalUnitLabel={goalUnit(goalType)}
                weeklySummary={weeklySummary}
                sessionInsights={recentSessionInsights}
                comebackPrompt={comebackPrompt}
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
                onOpenPricing={() => openPricingScreen("home")}
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
                paywallEntryPoint={songsPaywallEntryPoint}
                premiumContentGate={premiumContentGate}
                onOpenPricing={() => openPricingScreen("songs")}
              />
            ) : null}

            {screen === "progress" ? (
              <ProgressStats
                weeklySummary={weeklySummary}
                sessionInsights={recentSessionInsights}
                averageBpm={metrics.averageBpm}
                streak={streak}
                comebackPrompt={comebackPrompt}
                paywallEntryPoint={progressPaywallEntryPoint}
                onOpenPricing={() => openPricingScreen("progress")}
              />
            ) : null}

            {screen === "profile" ? (
              <ProfileAchievements
                levelState={levelState}
                totalXp={totalXp}
                badges={badges}
                onboardingState={onboardingState}
                entitlements={entitlements}
                onResetOnboarding={resetOnboardingQuestionnaire}
                onOpenPricing={() => openPricingScreen("profile")}
                onRestorePurchases={restorePurchases}
                restoreMessage={restoreMessage}
                planManagementGate={planManagementGate}
              />
            ) : null}

            {screen === "pricing" ? (
              <PricingScreen
                entitlements={entitlements}
                onBack={closePricingScreen}
                onSelectPlan={selectPricingPlan}
                onRestorePurchases={restorePurchases}
                restoreMessage={restoreMessage}
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
                onStartSessionDirect={activeRuntime.startSession}
                onStartSession={() => setScreen("overview")}
              />
            ) : null}

            {screen === "overview" ? (
              <SessionOverview
                templateName={selectedTemplate?.name ?? "Today’s Session"}
                drills={builderDrills}
                estimatedMinutes={sessionOverview.estimatedMinutes}
                totalXp={sessionOverview.totalXp}
                averageBpm={sessionOverview.averageBpm}
                bpmRangeLabel={sessionOverview.bpmRangeLabel}
                paywallEntryPoint={overviewPaywallEntryPoint}
                advancedPracticeGate={advancedPracticeGate}
                onBack={() => setScreen("builder")}
                onStartSession={activeRuntime.startSession}
                onOpenPricing={() => openPricingScreen("overview")}
              />
            ) : null}

            {screen === "active" && activeRuntime.activeDrill ? (
              <ActivePractice
                drill={activeRuntime.activeDrill}
                levelState={levelState}
                totalXp={totalXp}
                sessionXp={activeRuntime.sessionXp}
                drillProgress={activeRuntime.drillProgress}
                sessionProgress={activeRuntime.sessionProgress}
                remainingSec={activeRuntime.remainingSec}
                isPaused={activeRuntime.isPaused}
                microcopy={activeRuntime.currentMicrocopy}
                completionPulse={activeRuntime.completionPulse}
                drillCompletionTransition={activeRuntime.drillCompletionTransition}
                metronomeEnabled={activeRuntime.metronomeEnabled}
                metronomeBpm={activeRuntime.metronomeBpm}
                beatFlash={activeRuntime.beatFlash}
                randomCueLabel={activeRuntime.randomCueLabel}
                randomCueNextLabel={activeRuntime.randomCueNextLabel}
                randomCueBeatsRemaining={activeRuntime.randomCueBeatsRemaining}
                randomCuePulseWindowActive={activeRuntime.randomCuePulseWindowActive}
                randomCuePulse={activeRuntime.randomCuePulse}
                focusModeEnabled={activeRuntime.focusModeEnabled}
                beatPulseLocked={activeRuntime.beatPulseLocked}
                onMetronomeToggle={activeRuntime.toggleMetronome}
                onMetronomeStep={activeRuntime.stepMetronome}
                onToggleFocusMode={activeRuntime.toggleFocusMode}
                onToggleBeatPulseLocked={activeRuntime.toggleBeatPulseLocked}
                onPauseToggle={activeRuntime.togglePause}
                onSkip={activeRuntime.skipDrill}
                onForceComplete={forceCompleteActiveSession}
              />
            ) : null}

            {screen === "active" && !activeRuntime.activeDrill ? (
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
                sessionXp={activeRuntime.sessionXp}
                leveledUp={activeRuntime.leveledUp}
                levelState={levelState}
                totalXp={totalXp}
                streak={streak}
                badges={badges.filter((badge) => badge.unlocked)}
                rewardGlow={rewardGlow}
                rewardScale={rewardScale}
                onContinue={resetToHome}
              />
            ) : null}
          </Animated.View>
          {screen !== "builder" && screen !== "overview" && screen !== "pricing" ? (
            <AppTabBar screen={screen} onNavigate={navigateFromTab} />
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
