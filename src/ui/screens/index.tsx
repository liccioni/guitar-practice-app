import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import Svg, { Circle } from "react-native-svg";
import { buildDashboardFeedback } from "../../app/dashboardFeedback";
import type { ComebackPrompt } from "../../app/comebackPrompts";
import { buildCurrentPlanSummary } from "../../app/planManagement";
import { buildBeatPulseCopy, buildFocusAidCopy } from "../../app/practiceAids";
import { buildLockedStateCopy } from "../../app/lockedStates";
import type { PaywallEntryPoint } from "../../app/paywallEntryPoints";
import { buildPricingPlanCards, buildPricingScreenSummary } from "../../app/pricingPlans";
import { buildProgressMilestones } from "../../app/progressSignals";
import { buildSessionOverviewSummary } from "../../app/sessionOverview";
import type { Badge, Screen } from "../../app/usePracticeAppState";
import type { EntitlementPlanId, EntitlementState, FeatureGate } from "../../domain/monetization/entitlements";
import type { DrillCueMode } from "../../application/drillCueAudio";
import { buildPracticeOnboardingSuggestion, type GuitarLevel, type PracticeDurationMinutes, type PracticeFocus, type PracticeOnboardingAnswers, type PracticeOnboardingState, type PracticeOutcome, type PracticePreference, type WeeklyFrequencyDays } from "../../domain/profile/onboarding";
import type { Drill, DrillRandomizerKind, DrillTag } from "../../domain/exercises/types";
import type { GoalType } from "../../domain/goals/types";
import type { PracticeHistoryEntry } from "../../domain/history/types";
import type { SessionTemplate } from "../../domain/sessions/sessionTemplate";
import { AppButton, AppChip, GlowCard, SectionHeader } from "../primitives";
import { COLORS, RADII, SPACING } from "../theme";

export interface SongLibraryItem {
  id: string;
  title: string;
  artist: string;
  level: "beginner" | "intermediate" | "advanced";
  imageUri?: string;
  mastered?: boolean;
  isNew?: boolean;
  durationMinutes: number;
  targetBpm: number;
  tags: DrillTag[];
}

export interface WeeklySummary {
  weekMinutes: number;
  weekSessions: number;
  weekDrillsCompleted: number;
  completionRatePercent: number;
  avgSessionMinutes: number;
  weekMinutesDelta: number;
}

export interface SessionInsight {
  id: string;
  title: string;
  durationMinutes: number;
  averageBpm: number;
  completed: boolean;
  completedDrills: number;
  totalDrills: number;
}

export interface LevelState {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

export const RANDOMIZER_KIND_OPTIONS: { value: "none" | DrillRandomizerKind; label: string }[] = [
  { value: "none", label: "No Random Cue" },
  { value: "note", label: "Random Note" },
  { value: "triad", label: "Random Triad" },
  { value: "fingers4", label: "Random 4 Fingers" },
];

export const DRILL_CARD_COMPACT_MAX_WIDTH = 430;

export const SONG_LIBRARY: SongLibraryItem[] = [
  {
    id: "song_wish_you_were_here",
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    level: "beginner",
    imageUri:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDLEfCCgZfR_qyR1JDHCjVvUOqQnyCOhkZP2Blfa_m-067uKtVFKLsYArmKUMmGCr_WW3GthVfATpP-veYRxs25aoCfQ61RokW_sYNRfoDmFCVOMARw6jHwZcyY-KLv7l7s_TxxT0KVu4uiX6F3G288Q5Y_eFU95jmxkrtstcFt5umUJ_4d2N5NhNts_3bCmkFuYKrlp-NiafEpaQK2h6bgClPwJHa7vCEL6v7uqcdo6fNkTGrbnCsmXEmnqe90UIqE03HvY9bv3cy1",
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
    imageUri:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuABe3yaUr0OwzdZM6UpREev204_pqYWneOR6hn7_iqGdovs10nJ8MfVzcTm9MfysAjvlzi1sUgQNU0KtwFqXu1XO0o-yPlCsp5Dl_cBbYHqmTUK6bRxsMq3YLk73fSJ8N0uBAojHlkvCkCLWr3gbzGYTXpIwD04L0yJcGm21uknTufPnXcy5kU04SJamag_ZLvfaVTP7j0cHF34qCunNU4LJNDgxyiJTgGyhU4IWJjrxl9-yDlPUv4GaBxZwDsOK0MxATwE_Avn1Cdr",
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
    imageUri:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAler45bVX_DvuVIJ-zCLHOZ2SaoEWx0oRo3nLI84cm9yg3K-5D5vCliBKQ1YhqJC2v8iBQ_zyVnruR0jJmRrWJrtCV4ZJEeiSJLuWyX3x5cZ6vyaJ0WUCq3isa44pswDSHRBZkdqohmwzQDtNKQIgCO0b4ptjIwSUJ_2J79EiHJBzKvSvODUWEXWhgBTpiCzz11g8nhHhAFLFOaSdtmTMB0dSXd8lYU8hNQpXl8wxLaCj_q6IwwPS4eVXRJ3s57wNhTAacD35FHcMe",
    durationMinutes: 8,
    targetBpm: 148,
    tags: ["technique", "improv"],
  },
  {
    id: "song_blackbird",
    title: "Blackbird",
    artist: "The Beatles",
    level: "intermediate",
    imageUri:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCJ79kmZyNNIT_g7FKtHCab8yVCUXVNMT5LHMIo0lQ8_soWJKahl7JCrS4go8kSXusEM_rDs8qC7FPtJ5E_1gzfrP5iHScx9BLKqs0CaMyEpiBvTPKgq3CbhlEX7FjyXLU2QIa9yxh5mAbSPqGuvMrIlvCmqdJYnDcLN4kb2xYDOg0BbmXE3MJ3vF_DvKRWRuLAHugoTSHoZ4ygPkElhGJty1xswr8kNrDGVAfDGmSKXcNs04m9jnDN9Ak6PNZzdjo76-6nMKC33GTn",
    durationMinutes: 7,
    targetBpm: 126,
    tags: ["technique", "scales"],
  },
];

export function goalUnit(goalType: GoalType): string {
  if (goalType === "minutes") return "m";
  if (goalType === "sessions") return "sessions";
  return "drills";
}

export function buildWeeklySummary(entries: PracticeHistoryEntry[], nowIso: string): WeeklySummary {
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

export function buildRecentSessionInsights(entries: PracticeHistoryEntry[], limit = 4): SessionInsight[] {
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

export function toXp(drill: Drill): number {
  const durationMinutes = Math.max(1, Math.round(drill.durationSeconds / 60));
  const bpmBonus = drill.targetBpm ? Math.round((drill.targetBpm - 40) / 10) : 0;
  return Math.max(25, durationMinutes * 10 + bpmBonus);
}

export function getLevelState(totalXp: number): LevelState {
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

export function HomeDashboard(props: {
  levelState: LevelState;
  streak: number;
  goalType: GoalType;
  goalCurrentValue: number;
  goalTarget: number;
  goalUnitLabel: string;
  weeklySummary: WeeklySummary;
  sessionInsights: SessionInsight[];
  comebackPrompt: ComebackPrompt;
  badges: Badge[];
  storageError: string | null;
  onboardingState: PracticeOnboardingState;
  onboardingSuggestion: ReturnType<typeof buildPracticeOnboardingSuggestion> | null;
  onSaveOnboardingAnswers: (answers: PracticeOnboardingAnswers) => void;
  onApplyOnboardingSuggestion: () => void;
  onResetOnboarding: () => void;
  onStartPractice: () => void;
  onOpenSessions: () => void;
  showDashboardFeedback: boolean;
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
    comebackPrompt,
    badges,
    storageError,
    onboardingState,
    onboardingSuggestion,
    onSaveOnboardingAnswers,
    onApplyOnboardingSuggestion,
    onResetOnboarding,
    onStartPractice,
    onOpenSessions,
    showDashboardFeedback,
  } = props;

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
  const dashboardFeedback = useMemo(
    () =>
      buildDashboardFeedback({
        goalType,
        goalCurrentValue,
        goalTarget,
        streak,
      }),
    [goalCurrentValue, goalTarget, goalType, streak],
  );

  useEffect(() => {
    if (!onboardingState.answers) return;
    setLevelInput(onboardingState.answers.level);
    setDurationInput(onboardingState.answers.durationMinutes);
    setFocusInput(onboardingState.answers.focus);
    setOutcomeInput(onboardingState.answers.outcome);
    setWeeklyFrequencyInput(onboardingState.answers.weeklyFrequencyDays);
    setPracticePreferenceInput(onboardingState.answers.practicePreference);
  }, [onboardingState.answers]);

  function submitOnboardingAnswers(nextLevel: GuitarLevel, nextDuration: PracticeDurationMinutes): void {
    onSaveOnboardingAnswers({
      level: nextLevel,
      durationMinutes: nextDuration,
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
      <View style={styles.stitchHeader}>
        <View>
          <Text style={styles.homeTitle}>Ready to play?</Text>
          <Text style={styles.homeSubtitle}>Welcome back to Fretline</Text>
        </View>
        <View style={styles.stitchLevelChip}>
          <Text style={styles.stitchLevelChipText}>Level {levelState.level}</Text>
        </View>
      </View>

      <View style={styles.stitchSessionHero}>
        <ImageBackground
          source={{
            uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDpz2k_t3PtCu8Fa2SUUwCP9K4EtLoXTLVc4lKeHKCDQJvKZOpXm3Auk_QllWvbL6HwUrz2v9SfvveKzqiHuG8safRE1k6TsWOntviSQJw_pMUGIttrsvkQM5huiOzuurlGxd74FS7EnbGEG_xr5yH8x5qQMzCNhgYjICEzCldEBfpXaNkPxRvl6QGOLq2SJDG-r_OboOUeqzd3xIGC4rjOu085kV_tGJ-QednC5PzB9sZkp56j-x5zdtcigU4831W52eC59qFiIMwl",
          }}
          style={styles.stitchHeroImage}
          imageStyle={styles.stitchHeroImageRound}
        >
          <View style={styles.stitchHeroOverlay} />
          <View style={styles.stitchHeroBottomText}>
            <Text style={styles.stitchHeroTitle}>Today&apos;s Session</Text>
            <Text style={styles.stitchHeroSubtitle}>{dashboardFeedback.heroSubtitle}</Text>
          </View>
        </ImageBackground>
        <View style={styles.stitchHeroBody}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.stitchMetaLabel}>Daily Practice Goal</Text>
            <Text style={styles.stitchMetaValue}>
              {goalCurrentValue}/{goalTarget}
              {goalUnitLabel}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                styles.homeGoalFill,
                { width: `${Math.max(2, Math.round((goalCurrentValue / Math.max(1, goalTarget)) * 100))}%` },
              ]}
            />
          </View>
          <AppButton
            style={styles.homePrimaryCta}
            variant="primary"
            size="large"
            shape="pill"
            onPress={onStartPractice}
            testID="home-start-practice"
          >
            <View style={styles.homePrimaryCtaRow}>
              <Text style={styles.homePrimaryCtaIcon}>▶</Text>
              <Text style={[styles.primaryCtaText, styles.homePrimaryCtaText]}>Start Practice</Text>
            </View>
          </AppButton>
          <AppButton
            style={styles.stitchSecondaryHeroButton}
            variant="secondary"
            size="chip"
            shape="pill"
            onPress={onOpenSessions}
            testID="home-quick-start-practice"
          >
            <Text style={styles.stitchSecondaryHeroButtonText}>Customize Session</Text>
          </AppButton>
        </View>
      </View>

      <View style={styles.homeStatStrip}>
        <View style={styles.stitchStatCard}>
          <View style={styles.stitchCardLabelRow}>
            <View style={styles.homeTinyIcon} />
            <Text style={styles.statChipLabel}>STREAK</Text>
          </View>
          <Text style={styles.statChipValue}>{streak} days</Text>
        </View>
        <View style={styles.stitchStatCard}>
          <View style={styles.stitchCardLabelRow}>
            <View style={styles.homeTinyIcon} />
            <Text style={styles.statChipLabel}>NEXT LEVEL</Text>
          </View>
          <Text style={styles.statChipValue}>
            {goalCurrentValue}/{goalTarget}
            {goalUnitLabel}
          </Text>
        </View>
      </View>

      {!onboardingState.completed ? (
        <GlowCard style={styles.stitchQuestionnaireCard}>
          <View style={styles.stitchCardLabelRow}>
            <View style={styles.homeQuestionIcon} />
            <SectionHeader title="Build Your First Session" titleStyle={styles.stitchSectionTitle} />
          </View>
          <>
            <Text style={styles.helperText}>
              Two quick choices are enough. Fretline will line up a starter session you can review before you play.
            </Text>
            <Text style={styles.stitchQuestionLabel}>Step 1 · Current level</Text>
            <View style={styles.stitchThreeCol}>
              {(
                [
                  { id: "beginner", label: "Beginner" },
                  { id: "intermediate", label: "Intermediate" },
                  { id: "expert", label: "Expert" },
                ] as const
              ).map((level) => (
                <AppChip
                  key={level.id}
                  style={styles.choiceChip}
                  tone="choice"
                  size="compact"
                  selected={levelInput === level.id}
                  onPress={() => {
                    setLevelInput(level.id);
                    submitOnboardingAnswers(level.id, durationInput);
                  }}
                  testID={`onboarding-level-${level.id}`}
                >
                  <Text style={[styles.stitchChoiceLabel, levelInput === level.id ? styles.stitchChoiceLabelActive : null]}>
                    {level.label}
                  </Text>
                </AppChip>
              ))}
            </View>

            <Text style={styles.stitchQuestionLabel}>Step 2 · Comfortable daily block</Text>
            <View style={styles.stitchThreeCol}>
              {([20, 30, 60] as const).map((minutes) => (
                <AppChip
                  key={minutes}
                  style={styles.choiceChip}
                  tone="choice"
                  size="compact"
                  selected={durationInput === minutes}
                  onPress={() => {
                    setDurationInput(minutes);
                    submitOnboardingAnswers(levelInput, minutes);
                  }}
                  testID={`onboarding-duration-${minutes}`}
                >
                  <Text style={[styles.stitchChoiceLabel, durationInput === minutes ? styles.stitchChoiceLabelActive : null]}>
                    {minutes} min
                  </Text>
                </AppChip>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.cardLabel}>Starter session ready</Text>
            <Text style={styles.helperText}>{onboardingSuggestion?.summary ?? "Your starter profile is saved."}</Text>
            <View style={styles.onboardingPlanRow}>
              <View style={styles.onboardingPlanChip}>
                <Text style={styles.onboardingPlanChipText}>
                  {onboardingSuggestion?.recommendedMinutes ?? goalTarget} min
                </Text>
              </View>
              <View style={styles.onboardingPlanChip}>
                <Text style={styles.onboardingPlanChipText}>
                  {onboardingSuggestion?.drillCount ?? 0} drills
                </Text>
              </View>
            </View>
            <Text style={styles.helperText}>
              {onboardingSuggestion?.sessionName ?? onboardingState.lastSuggestedTemplateName}
            </Text>
            <Text style={styles.helperText}>
              Review the plan first. You can still customize it before the session starts.
            </Text>
            <View style={styles.inlineRow}>
              <AppButton size="chip" shape="chip" variant="secondary" onPress={onApplyOnboardingSuggestion} testID="onboarding-apply-suggestion">
                <Text style={styles.smallActionText}>Review Starter Session</Text>
              </AppButton>
              <AppButton size="chip" shape="chip" variant="secondary" onPress={onResetOnboarding} testID="onboarding-retake">
                <Text style={styles.smallActionText}>Retake Answers</Text>
                </AppButton>
              </View>
          </>
        </GlowCard>
      ) : comebackPrompt.kind !== "active" ? (
        <GlowCard style={styles.dashboardComebackCard}>
          <Text style={styles.cardLabel}>{comebackPrompt.homeTitle}</Text>
          <Text style={styles.helperText}>{comebackPrompt.homeBody}</Text>
          <View style={styles.inlineRow}>
            <AppButton size="chip" shape="chip" variant="secondary" onPress={onStartPractice} testID="home-comeback-cta">
              <Text style={styles.smallActionText}>{comebackPrompt.homeActionLabel}</Text>
            </AppButton>
            <AppButton size="chip" shape="chip" variant="secondary" onPress={onOpenSessions} testID="home-comeback-sessions">
              <Text style={styles.smallActionText}>Open Sessions</Text>
            </AppButton>
          </View>
        </GlowCard>
      ) : showDashboardFeedback ? (
        <GlowCard style={styles.homeFocusCard}>
          <Text style={styles.cardLabel}>Today&apos;s Focus</Text>
          <Text style={styles.badgeLabel}>{dashboardFeedback.goalStatusLabel}</Text>
          <Text style={styles.helperText}>{dashboardFeedback.goalStatusBody}</Text>
          <Text style={styles.helperText}>{dashboardFeedback.streakStatusBody}</Text>
        </GlowCard>
      ) : null}

      {storageError ? <Text style={styles.errorText}>{storageError}</Text> : null}
      <View style={styles.hiddenCompatBlock}>
        <Text style={styles.cardLabel} testID="home-achievements-title">Achievements</Text>
        <Text style={styles.helperText}>
          {weeklySummary.weekMinutes} min this week • {sessionInsights.length} tracked sessions • {badges.filter((b) => b.unlocked).length} badges
        </Text>
      </View>
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
  onStartSessionDirect: () => void;
  onPreviewSession: () => void;
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
    onStartSessionDirect,
    onPreviewSession,
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
  const drillTitleLineLimit = useCompactDrillCard ? 4 : 2;
  const [showCueOptions, setShowCueOptions] = useState(drillRandomizerKindInput !== "none");
  const [showTemplateActions, setShowTemplateActions] = useState(false);

  useEffect(() => {
    setShowCueOptions(drillRandomizerKindInput !== "none");
  }, [drillRandomizerKindInput, selectedDrillId]);

  useEffect(() => {
    if (drillRandomizerKindInput !== "none") {
      setShowCueOptions(true);
    }
  }, [drillRandomizerKindInput]);

  function handleSaveTemplatePress(): void {
    if (!isTemplateNameValid) return;
    setShowTemplateActions(false);
    onSaveTemplate();
  }

  function handleCreateTemplatePress(): void {
    setShowTemplateActions(false);
    onCreateTemplate();
  }

  function handleDuplicateTemplatePress(): void {
    setShowTemplateActions(false);
    onDuplicateTemplate();
  }

  function handleDeleteTemplatePress(): void {
    setShowTemplateActions(false);
    onDeleteTemplate();
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

  function renderBuilderDrill({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<Drill>): React.JSX.Element {
    const index = getIndex() ?? drills.findIndex((drill) => drill.id === item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onSelectDrill(item.id)}
        testID={`builder-drill-card-${item.id}`}
        style={[
          styles.drillCard,
          selectedDrillId === item.id ? styles.drillCardSelected : null,
          isActive ? styles.drillCardDragging : null,
        ]}
      >
        {index === 0 ? (
          <View
            testID="builder-drill-first-id-probe"
            accessibilityLabel={item.id}
            style={styles.builderProbe}
          />
        ) : null}
        {index === 1 ? (
          <View
            testID="builder-drill-second-id-probe"
            accessibilityLabel={item.id}
            style={styles.builderProbe}
          />
        ) : null}
        <View style={styles.drillCardTopRow} testID={index === 0 ? "builder-drill-card-first" : undefined}>
          <View style={[styles.drillLeft, useCompactDrillCard ? styles.drillLeftCompact : null]}>
            <Text style={[styles.drillOrder, useCompactDrillCard ? styles.drillOrderCompact : null]}>#{index + 1}</Text>
            <View style={styles.drillTextBlock}>
              <Text
                style={[styles.drillName, useCompactDrillCard ? styles.drillNameCompact : null]}
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

        <View style={[styles.builderCardActions, useCompactDrillCard ? styles.builderCardActionsCompact : null]}>
          <TouchableOpacity
            style={[styles.dragChip, useCompactDrillCard ? styles.dragChipCompact : null]}
            onLongPress={drag}
            delayLongPress={120}
            testID={index === 0 ? "builder-drag-first-handle" : `builder-drag-handle-${item.id}`}
          >
            <Text style={styles.dragChipGlyph}>⋮⋮</Text>
            <Text style={styles.dragChipText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeChip, useCompactDrillCard ? styles.removeChipCompact : null]}
            onPress={() => onRemoveDrill(item.id)}
            testID={`builder-remove-${item.id}`}
          >
            <Text style={styles.removeChipText}>Remove</Text>
          </TouchableOpacity>
        </View>
        {selectedDrillId === item.id ? (
          <View style={styles.drillInlineEditor}>
            <Text style={styles.builderEditorSectionLabel}>Core setup</Text>
            <TextInput
              value={drillNameInput}
              onChangeText={onDrillNameInput}
              placeholder="Drill name"
              placeholderTextColor={COLORS.muted}
              style={styles.templateInput}
              testID="builder-drill-name-input"
            />
            <View style={styles.builderEditorGrid}>
              <View style={styles.builderEditorField}>
                <Text style={styles.builderEditorFieldLabel}>Duration</Text>
                <TextInput
                  value={drillDurationInput}
                  onChangeText={onDrillDurationInput}
                  keyboardType="number-pad"
                  placeholder="Minutes (1-30)"
                  placeholderTextColor={COLORS.muted}
                  style={styles.timeInput}
                  testID="builder-drill-duration-input"
                />
                <View style={styles.inlineRow}>
                  <TouchableOpacity
                    style={[styles.pillButton, styles.builderMiniPill]}
                    onPress={() => nudgeDuration(-1)}
                    testID="builder-drill-duration-decrement"
                  >
                    <Text style={styles.pillButtonText}>-1 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillButton, styles.builderMiniPill]}
                    onPress={() => nudgeDuration(1)}
                    testID="builder-drill-duration-increment"
                  >
                    <Text style={styles.pillButtonText}>+1 min</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.builderEditorField}>
                <Text style={styles.builderEditorFieldLabel}>Tempo</Text>
                <TextInput
                  value={drillBpmInput}
                  onChangeText={onDrillBpmInput}
                  keyboardType="number-pad"
                  placeholder="BPM (40-240)"
                  placeholderTextColor={COLORS.muted}
                  style={styles.timeInput}
                  testID="builder-drill-bpm-input"
                />
                <View style={styles.inlineRow}>
                  <TouchableOpacity
                    style={[styles.pillButton, styles.builderMiniPill]}
                    onPress={() => nudgeBpm(-5)}
                    testID="builder-drill-bpm-decrement"
                  >
                    <Text style={styles.pillButtonText}>-5 BPM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillButton, styles.builderMiniPill]}
                    onPress={() => nudgeBpm(5)}
                    testID="builder-drill-bpm-increment"
                  >
                    <Text style={styles.pillButtonText}>+5 BPM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.builderDisclosureRow}
              onPress={() => setShowCueOptions((current) => !current)}
              testID="builder-cue-options-toggle"
            >
              <View style={styles.builderDisclosureBody}>
                <Text style={styles.builderEditorSectionLabel}>Cue options</Text>
                <Text style={styles.builderCueSummaryText}>
                  {drillRandomizerKindInput === "none"
                    ? "Off"
                    : `${drillRandomizerKindInput} every ${drillRandomEveryBarsInput || "?"} bars`}
                </Text>
              </View>
              <Text style={styles.builderDisclosureGlyph}>{showCueOptions ? "−" : "+"}</Text>
            </TouchableOpacity>
            {showCueOptions ? (
              <View style={styles.builderSecondaryEditor}>
                <View style={styles.templatePillsRow}>
                  {RANDOMIZER_KIND_OPTIONS.map((option) => (
                    <AppChip
                      key={option.value}
                      selected={drillRandomizerKindInput === option.value}
                      onPress={() => onDrillRandomizerKindInput(option.value)}
                      testID={`builder-randomizer-${option.value}`}
                    >
                      <Text style={styles.templatePillText}>{option.label}</Text>
                    </AppChip>
                  ))}
                </View>
                {drillRandomizerKindInput !== "none" ? (
                  <>
                    <View style={styles.builderCueBarsRow}>
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
                        style={[styles.pillButton, styles.builderMiniPill]}
                        onPress={() => nudgeRandomBars(-1)}
                        testID="builder-random-bars-decrement"
                      >
                        <Text style={styles.pillButtonText}>-1 bar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pillButton, styles.builderMiniPill]}
                        onPress={() => nudgeRandomBars(1)}
                        testID="builder-random-bars-increment"
                    >
                      <Text style={styles.pillButtonText}>+1 bar</Text>
                    </TouchableOpacity>
                  </View>
                  </>
                ) : null}
              </View>
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
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.screenBody, styles.builderScreenBody]} testID="builder-screen">
      <TouchableOpacity
        style={styles.builderCompatStartControl}
        onPress={onStartSessionDirect}
        testID="builder-start-session-control"
        disabled={drills.length === 0}
      >
        <Text style={styles.smallActionText}>Start Practicing</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.builderHeader,
          Platform.OS === "android" ? styles.builderHeaderAndroidLayer : null,
        ]}
      >
        <View style={[styles.builderTopBar, useCompactDrillCard ? styles.builderTopBarCompact : null]}>
          <View style={styles.builderTopLead}>
            <Pressable onPress={onBack} style={styles.builderIconAction}>
              <Text style={styles.iconGlyph}>←</Text>
            </Pressable>
            <View style={styles.builderTopMeta}>
              <Text style={styles.builderTopTitle}>Build Your Chain</Text>
              <Text style={styles.builderTopSubtitle}>Daily Shred Routine</Text>
            </View>
          </View>
          <View style={[styles.builderTopActions, useCompactDrillCard ? styles.builderTopActionsCompact : null]}>
            <TouchableOpacity
              style={styles.builderTopActionSecondary}
              onPress={handleCreateTemplatePress}
              testID="builder-template-new"
            >
              <Text style={styles.builderTopActionSecondaryText}>New</Text>
            </TouchableOpacity>
            <View style={styles.builderTopUtilityMenu}>
              <TouchableOpacity
                style={styles.builderTopUtilityAction}
                onPress={() => setShowTemplateActions((current) => !current)}
                testID="builder-template-more"
              >
                <Text style={styles.iconGlyphMuted}>⋯</Text>
              </TouchableOpacity>
              {showTemplateActions ? (
                <View style={styles.builderTopUtilityPanel}>
                  <TouchableOpacity
                    style={styles.builderTopUtilityPanelAction}
                    onPress={handleDuplicateTemplatePress}
                    testID="builder-template-duplicate"
                  >
                    <Text style={styles.builderTopUtilityPanelText}>Duplicate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.builderTopUtilityPanelAction}
                    onPress={handleDeleteTemplatePress}
                    testID="builder-template-delete"
                  >
                    <Text style={styles.builderTopUtilityPanelText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={styles.builderTopUtilityGroup}>
              <TouchableOpacity
                style={[
                  styles.builderTopActionTertiary,
                  !isTemplateNameValid ? styles.actionButtonDisabled : null,
                ]}
                onPress={handleSaveTemplatePress}
                disabled={!isTemplateNameValid}
                testID="builder-template-save-button"
              >
                <Text style={styles.builderTopActionTertiaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <GlowCard style={styles.builderHeroCard}>
          <View style={styles.inlineRowSpace}>
            <View style={styles.builderSectionLead}>
              <Text style={styles.cardLabel}>Routine</Text>
              <Text style={styles.builderSectionTitle}>Drill Flow</Text>
            </View>
            <Text style={styles.builderMiniMeta} testID="builder-drill-count">
              {drills.length} drills
            </Text>
          </View>
          <View style={styles.templatePillsRow}>
            {templates.map((template) => (
              <AppChip
                key={template.id}
                selected={template.id === selectedTemplateId}
                onPress={() => onSelectTemplate(template.id)}
              >
                <Text style={styles.templatePillText}>{template.name}</Text>
              </AppChip>
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

        <Text style={styles.builderHint}>Tap a drill to edit. Hold to reorder.</Text>
        <View
          testID="builder-stats"
          accessibilityLabel={`${drills.length} drills ${totalXp} xp lineLimit:${drillTitleLineLimit}`}
          style={styles.builderStatsProbe}
        />
      </View>

      <DraggableFlatList
        testID="builder-drill-list"
        data={drills}
        style={[
          styles.builderList,
          Platform.OS === "android" ? styles.builderListAndroidLayer : null,
        ]}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.builderListContent,
          useCompactDrillCard ? styles.builderListContentCompact : null,
        ]}
        activationDistance={8}
        onDragEnd={({ data }) => onReorderDrills(data.map((drill) => drill.id))}
        ListEmptyComponent={
          <GlowCard>
            <Text style={styles.cardLabel} testID="builder-empty-title">No Drills Yet</Text>
            <Text style={styles.completeSubtext}>
              Add a drill with the + button, then start your session.
            </Text>
            <AppButton size="chip" shape="chip" variant="secondary" onPress={onAddDrill}>
              <Text style={styles.smallActionText}>Add Starter Drill</Text>
            </AppButton>
          </GlowCard>
        }
        renderItem={renderBuilderDrill}
        ListFooterComponent={
          <View style={styles.builderListFooter}>
            <TouchableOpacity style={styles.builderAddPlaceholder} onPress={onAddDrill} testID="builder-add-drill">
              <View style={styles.builderAddCircle}>
                <Text style={styles.builderAddPlus}>+</Text>
              </View>
              <Text style={styles.builderAddText}>Add Next Drill</Text>
            </TouchableOpacity>
            <View style={styles.builderTotalsBar}>
              <View>
                <Text style={styles.builderTotalsLabel}>Total Estimated Time</Text>
                <Text style={styles.builderTotalsValue}>
                  {Math.max(0, Math.round(drills.reduce((sum, drill) => sum + drill.durationSeconds, 0) / 60))} Minutes
                </Text>
              </View>
              <View style={styles.builderTotalsRight}>
                <Text style={styles.builderTotalsLabel}>Total Reward</Text>
                <Text style={styles.builderTotalsXp}>{totalXp} XP</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.hiddenCompatControl}
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
      />

      {drills.length === 0 ? (
        <GlowCard style={styles.builderEmptyCard}>
          <Text style={styles.cardLabel} testID="builder-empty-title-fallback">No Drills Yet</Text>
          <Text style={styles.completeSubtext}>Tap + to add your first drill to this template.</Text>
        </GlowCard>
      ) : null}

      <View style={[styles.builderFooterBar, useCompactDrillCard ? styles.builderFooterBarCompact : null]}>
        <AppButton
          style={[
            styles.builderPreviewButton,
            styles.builderFooterPreviewButton,
            useCompactDrillCard ? styles.builderPreviewButtonCompact : null,
          ]}
          variant="secondary"
          size="large"
          shape="pill"
          onPress={onPreviewSession}
        >
          <Text style={styles.secondaryCtaText}>Preview Routine</Text>
        </AppButton>
        <AppButton
          style={[
            styles.builderStartButton,
            styles.builderFooterStartButton,
            useCompactDrillCard ? styles.builderStartButtonCompact : null,
          ]}
          variant="primary"
          size="large"
          shape="pill"
          onPress={handleStartSessionPress}
          onPressIn={handleStartSessionPressIn}
          onPressOut={handleStartSessionPressOut}
          testID="builder-start-session"
        >
          <Text style={styles.primaryCtaText}>Start Practicing</Text>
        </AppButton>
      </View>
    </View>
  );
}

export function SessionOverview(props: {
  templateName: string;
  drills: Drill[];
  estimatedMinutes: number;
  totalXp: number;
  averageBpm: number | null;
  bpmRangeLabel: string;
  paywallEntryPoint: PaywallEntryPoint | null;
  advancedPracticeGate: FeatureGate | null;
  onBack: () => void;
  onStartSession: () => void;
  onOpenPricing: () => void;
}) {
  const {
    templateName,
    drills,
    estimatedMinutes,
    totalXp,
    averageBpm,
    bpmRangeLabel,
    paywallEntryPoint,
    advancedPracticeGate,
    onBack,
    onStartSession,
    onOpenPricing,
  } = props;
  const summary = buildSessionOverviewSummary(drills);

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.overviewScreenBody} testID="overview-screen">
      <View style={styles.completeTopBar}>
        <TouchableOpacity style={styles.builderIconAction} onPress={onBack} testID="overview-back">
          <Text style={styles.iconGlyph}>←</Text>
        </TouchableOpacity>
        <Text style={styles.completeTopTitle}>Session Preview</Text>
        <View style={styles.builderIconAction} />
      </View>

      <GlowCard style={[styles.homeHeroPanel, styles.overviewHeroCard]}>
        <Text style={styles.cardLabel}>Up Next</Text>
        <Text style={styles.heroHeadline}>{templateName}</Text>
        <Text style={styles.heroSubline}>
          {summary.drillCount} drills in sequence. A quick scan before the timer starts.
        </Text>
      </GlowCard>

      <View style={styles.homeStatStrip}>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Est. Time</Text>
          <Text style={styles.statChipValue}>{estimatedMinutes} min</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Reward</Text>
          <Text style={styles.statChipValue}>+{totalXp} XP</Text>
        </View>
      </View>

      <GlowCard>
        <Text style={styles.cardLabel}>Tempo Map</Text>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.heroHeadline}>{averageBpm ?? "--"} {averageBpm ? "BPM" : ""}</Text>
          <Text style={styles.helperText}>{bpmRangeLabel}</Text>
        </View>
      </GlowCard>

      <GlowCard>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.cardLabel}>Drill Order</Text>
          <Text style={styles.helperText}>{summary.drillCount} total</Text>
        </View>
        <View style={styles.overviewDrillList}>
          {drills.map((drill, index) => (
            <View key={drill.id} style={styles.overviewDrillRow}>
              <View style={styles.overviewDrillIndex}>
                <Text style={styles.overviewDrillIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.overviewDrillBody}>
                <Text style={styles.badgeLabel}>{drill.name}</Text>
                <Text style={styles.helperText}>
                  {Math.round(drill.durationSeconds / 60)} min
                  {drill.targetBpm ? ` • ${drill.targetBpm} BPM` : ""}
                  {drill.randomizer ? ` • cue every ${drill.randomizer.everyBars} bars` : ""}
                </Text>
              </View>
              <Text style={styles.drillXp}>+{toXp(drill)}</Text>
            </View>
          ))}
        </View>
      </GlowCard>

      {paywallEntryPoint ? <PaywallEntryCard entryPoint={paywallEntryPoint} onOpenPricing={onOpenPricing} /> : null}

      {advancedPracticeGate ? (
        <LockedStateCard
          gate={advancedPracticeGate}
          variant="action"
          onOpenPricing={onOpenPricing}
          testID="overview-locked-advanced-practice"
        />
      ) : null}

      <View style={styles.overviewFooter}>
        <AppButton style={styles.builderPreviewButton} variant="secondary" size="large" shape="pill" onPress={onBack}>
          <Text style={styles.secondaryCtaText}>Back to Builder</Text>
        </AppButton>
        <AppButton style={styles.builderStartButton} variant="primary" size="large" shape="pill" onPress={onStartSession} testID="overview-start-session">
          <Text style={styles.primaryCtaText}>Start Practicing</Text>
        </AppButton>
      </View>
    </ScrollView>
  );
}

export function SessionsLibrary(props: {
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
      <Text style={styles.headerSubline}>Choose a routine, then refine it in Session Builder.</Text>

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
          <AppButton variant="primary" onPress={() => onOpenBuilder(featuredTemplate.id)}>
            <Text style={styles.primaryCtaText}>Edit Featured Preset</Text>
          </AppButton>
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
              <AppButton variant="primary" onPress={() => onOpenBuilder(template.id)}>
                <Text style={styles.primaryCtaText}>Open Builder</Text>
              </AppButton>
            </GlowCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ProgressStats(props: {
  weeklySummary: WeeklySummary;
  sessionInsights: SessionInsight[];
  averageBpm: number;
  streak: number;
  comebackPrompt: ComebackPrompt;
  paywallEntryPoint: PaywallEntryPoint | null;
  onOpenPricing: () => void;
}) {
  const { weeklySummary, sessionInsights, averageBpm, streak, comebackPrompt, paywallEntryPoint, onOpenPricing } = props;
  const milestones = buildProgressMilestones({ weeklySummary, streak, averageBpm });

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      testID="progress-screen"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>Progress</Text>
      </View>
      <GlowCard style={styles.stitchProgressHeroCard}>
        <Text style={styles.cardLabel}>This Week In Practice</Text>
        <Text style={styles.heroHeadline}>{weeklySummary.weekMinutes} min</Text>
        <Text style={styles.heroSubline}>
          {weeklySummary.weekSessions} completed sessions • {weeklySummary.weekDrillsCompleted} drills finished
        </Text>
        <Text style={styles.stitchMetaValue}>
          {weeklySummary.weekMinutesDelta >= 0 ? "+" : ""}
          {weeklySummary.weekMinutesDelta} min vs last 7 days
        </Text>
      </GlowCard>

      {comebackPrompt.kind !== "active" ? (
        <GlowCard style={styles.dashboardComebackCard}>
          <Text style={styles.cardLabel}>{comebackPrompt.progressTitle}</Text>
          <Text style={styles.helperText}>{comebackPrompt.progressBody}</Text>
        </GlowCard>
      ) : null}

      <GlowCard>
        <Text style={styles.cardLabel}>Trusted Signals</Text>
        <View style={styles.skillRow}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.badgeLabel}>Goal completion rate</Text>
            <Text style={styles.helperText}>{weeklySummary.completionRatePercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(4, weeklySummary.completionRatePercent)}%` }]} />
          </View>
        </View>
        <View style={styles.skillRow}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.badgeLabel}>Average session length</Text>
            <Text style={styles.helperText}>{weeklySummary.avgSessionMinutes} min</Text>
          </View>
        </View>
        <View style={styles.skillRow}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.badgeLabel}>Current streak</Text>
            <Text style={styles.helperText}>{streak} days</Text>
          </View>
        </View>
        <View style={styles.skillRow}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.badgeLabel}>Average tracked tempo</Text>
            <Text style={styles.helperText}>{averageBpm > 0 ? `${averageBpm} BPM` : "Not enough BPM history yet"}</Text>
          </View>
        </View>
      </GlowCard>
      <GlowCard>
        <Text style={styles.cardLabel}>Next Milestones</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneRow}>
          {milestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneCard}>
              <Text style={styles.badgeLabel}>{milestone.title}</Text>
              <Text style={styles.helperText}>{milestone.detail}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(4, milestone.progress)}%` }]} />
              </View>
              <Text style={styles.helperText}>{milestone.progress}% toward this milestone</Text>
            </View>
          ))}
        </ScrollView>
      </GlowCard>
      <GlowCard>
        <Text style={styles.cardLabel}>Recent Form</Text>
        {sessionInsights.length === 0 ? (
          <Text style={styles.helperText}>{comebackPrompt.recentFormEmptyBody}</Text>
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

      {paywallEntryPoint ? <PaywallEntryCard entryPoint={paywallEntryPoint} onOpenPricing={onOpenPricing} /> : null}
    </ScrollView>
  );
}

function PaywallEntryCard(props: {
  entryPoint: PaywallEntryPoint;
  onOpenPricing: () => void;
}) {
  const { entryPoint, onOpenPricing } = props;

  return (
    <GlowCard style={styles.paywallEntryCard}>
      <Text style={styles.cardLabel}>Premium Upgrade</Text>
      <Text style={styles.heroSubline}>{entryPoint.title}</Text>
      <Text style={styles.helperText}>{entryPoint.body}</Text>
      <AppButton
        size="chip"
        shape="pill"
        variant="secondary"
        onPress={onOpenPricing}
        testID={`paywall-entry-${entryPoint.surface}`}
      >
        <Text style={styles.smallActionText}>{entryPoint.ctaLabel}</Text>
      </AppButton>
    </GlowCard>
  );
}

function LockedStateCard(props: {
  gate: FeatureGate;
  variant?: "card" | "action";
  onOpenPricing: () => void;
  testID?: string;
}) {
  const { gate, variant = "card", onOpenPricing, testID } = props;
  const copy = buildLockedStateCopy(gate, variant);

  return (
    <GlowCard style={variant === "card" ? styles.lockedCard : styles.lockedActionCard}>
      <Text style={styles.cardLabel}>{copy.eyebrow}</Text>
      <Text style={styles.heroSubline}>{copy.title}</Text>
      <Text style={styles.helperText}>{copy.body}</Text>
      <AppButton
        size="chip"
        shape="pill"
        variant="secondary"
        onPress={onOpenPricing}
        testID={testID}
      >
        <Text style={styles.smallActionText}>{copy.ctaLabel}</Text>
      </AppButton>
    </GlowCard>
  );
}

export function SongsLibrary(props: {
  songs: SongLibraryItem[];
  onAddToBuilder: (song: SongLibraryItem) => void;
  onStartNow: (song: SongLibraryItem) => void;
  paywallEntryPoint: PaywallEntryPoint | null;
  premiumContentGate: FeatureGate | null;
  onOpenPricing: () => void;
}) {
  const { songs, onAddToBuilder, onStartNow, paywallEntryPoint, premiumContentGate, onOpenPricing } = props;
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
  const beginnerSongs = visibleSongs.filter((song) => song.level === "beginner");
  const intermediateSongs = visibleSongs.filter((song) => song.level !== "beginner");

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
      testID="songs-screen"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>Songs</Text>
      </View>
      <Text style={styles.headerSubline}>Build your song library and launch practice instantly.</Text>

      <GlowCard>
        <Text style={styles.cardLabel}>Find Songs</Text>
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
            <AppChip
              key={level}
              selected={levelFilter === level}
              onPress={() => setLevelFilter(level)}
              testID={`songs-filter-${level}`}
            >
              <Text style={styles.templatePillText}>{level === "all" ? "All Levels" : level}</Text>
            </AppChip>
          ))}
        </View>
      </GlowCard>

      {featuredSong ? (
        <GlowCard style={styles.homeHeroPanel}>
          <Text style={styles.cardLabel}>Featured Challenge</Text>
          <ImageBackground
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4JX7KrbNuWh7sUwcCTTMh1QUnjYipKXfuVdKMtk8yIDnlLhQLSeLM69bGOhM2ZRr1UF41_Bx_LmOVr0Syl6TMMx0IiHL2KWmGxEREP5-7ixYgodnJLoSdZ1q_8xTXzksopryPKmzhhDtaI049XhncPQ6ap8A9VE0-fOftvWKi8vwft0HyoGW7Vs8tkikWZYgy_SVvnh1Wgmi4JQsgUGcqfYNgaik3I8p-idyxfAcYaIN4inhELGp39UYbqD0F_B9tpJftoi6OfutG",
            }}
            style={styles.stitchFeaturedImage}
            imageStyle={styles.stitchFeaturedImageRound}
          >
            <View style={styles.stitchHeroOverlay} />
            <View style={styles.stitchFeaturedBottom}>
              <Text style={styles.stitchFeaturedEyebrow}>Daily Masterclass</Text>
              <Text style={styles.stitchFeaturedTitle}>Neon Moon</Text>
              <View style={styles.inlineRowSpace}>
                <View>
                  <Text style={styles.stitchFeaturedArtist}>Brooks & Dunn</Text>
                  <Text style={styles.stitchFeaturedDifficulty}>Difficulty: Intermediate</Text>
                </View>
                <AppButton
                  style={styles.stitchFeaturedStart}
                  size="chip"
                  shape="chip"
                  variant="secondary"
                  onPress={() => onStartNow(featuredSong)}
                  testID="songs-featured-start"
                >
                  <Text style={styles.smallActionText}>Start Now</Text>
                </AppButton>
              </View>
            </View>
          </ImageBackground>
          <View style={styles.homeStatStrip}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Est. Time</Text>
              <Text style={styles.statChipValue}>{featuredSong.durationMinutes} min</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Target BPM</Text>
              <Text style={styles.statChipValue}>{featuredSong.targetBpm}</Text>
            </View>
          </View>
          <View style={styles.inlineRow}>
            <AppButton
              size="chip"
              shape="chip"
              variant="secondary"
              onPress={() => onAddToBuilder(featuredSong)}
              testID="songs-featured-add"
            >
              <Text style={styles.smallActionText}>Add to Chain</Text>
            </AppButton>
          </View>
        </GlowCard>
      ) : null}

      <GlowCard>
        <Text style={styles.cardLabel}>Beginner Favorites</Text>
        {beginnerSongs.length === 0 ? <Text style={styles.helperText}>No beginner songs matched.</Text> : null}
        {beginnerSongs.map((song) => (
          <View key={song.id} style={styles.stitchSongRow}>
            <Image source={{ uri: song.imageUri }} style={styles.stitchSongThumb} />
            <View style={styles.songMeta}>
              <View style={styles.inlineRow}>
                <Text style={styles.songTitle}>{song.title}</Text>
                {song.mastered ? <Text style={styles.songTagMastered}>Mastered</Text> : null}
                {song.isNew ? <Text style={styles.songTagNew}>New</Text> : null}
              </View>
              <Text style={styles.helperText}>
                {song.artist} • {song.level}
              </Text>
            </View>
            <View style={styles.songActions}>
              <TouchableOpacity style={styles.smallActionButton} onPress={() => onAddToBuilder(song)} testID={`songs-add-${song.id}`}>
                <Text style={styles.smallActionText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stitchPlayButton} onPress={() => onStartNow(song)} testID={`songs-start-${song.id}`}>
                <Text style={styles.smallActionText}>Play</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>Intermediate Tracks</Text>
        {visibleSongs.length === 0 ? (
          <Text style={styles.helperText}>No songs matched this filter.</Text>
        ) : (
          intermediateSongs.map((song) => (
            <View key={song.id} style={styles.stitchSongRow}>
              <Image source={{ uri: song.imageUri }} style={styles.stitchSongThumb} />
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
                  <Text style={styles.smallActionText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stitchPlayButton}
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

      {paywallEntryPoint ? <PaywallEntryCard entryPoint={paywallEntryPoint} onOpenPricing={onOpenPricing} /> : null}

      {premiumContentGate ? (
        <LockedStateCard
          gate={premiumContentGate}
          onOpenPricing={onOpenPricing}
          testID="songs-locked-premium-content"
        />
      ) : null}
    </ScrollView>
  );
}

export function ProfileAchievements(props: {
  levelState: LevelState;
  totalXp: number;
  badges: Badge[];
  onboardingState: PracticeOnboardingState;
  entitlements: EntitlementState;
  onResetOnboarding: () => void;
  onOpenPricing: () => void;
  onRestorePurchases: () => void;
  restoreMessage: string | null;
  planManagementGate: FeatureGate | null;
  drillCueMode: DrillCueMode;
  onDrillCueModeChange: (mode: DrillCueMode) => void;
  showDrillCueSettings?: boolean;
}) {
  const {
    levelState,
    totalXp,
    badges,
    onboardingState,
    entitlements,
    onResetOnboarding,
    onOpenPricing,
    onRestorePurchases,
    restoreMessage,
    planManagementGate,
    drillCueMode,
    onDrillCueModeChange,
    showDrillCueSettings = true,
  } = props;
  const unlocked = badges.filter((badge) => badge.unlocked).length;
  const xpProgressPercent = Math.max(
    6,
    Math.round((levelState.currentLevelXp / Math.max(1, levelState.nextLevelXp)) * 100),
  );
  const currentPlanSummary = buildCurrentPlanSummary(entitlements);

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeScrollContent} testID="profile-screen">
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
        <Text style={styles.cardLabel}>Plan</Text>
        <Text style={styles.heroSubline}>{currentPlanSummary.title}</Text>
        <Text style={styles.helperText}>{currentPlanSummary.statusLabel}</Text>
        <Text style={styles.helperText}>{currentPlanSummary.detail}</Text>
        {currentPlanSummary.renewalLabel ? (
          <Text style={styles.helperText}>{currentPlanSummary.renewalLabel}</Text>
        ) : null}
        {restoreMessage ? <Text style={styles.helperText}>{restoreMessage}</Text> : null}
        <View style={styles.inlineRow}>
          <AppButton size="chip" shape="chip" variant="secondary" onPress={onOpenPricing} testID="profile-open-pricing">
            <Text style={styles.smallActionText}>Open Pricing</Text>
          </AppButton>
          <AppButton size="chip" shape="chip" variant="secondary" onPress={onRestorePurchases} testID="profile-restore-purchases">
            <Text style={styles.smallActionText}>Restore Purchases</Text>
          </AppButton>
        </View>
      </GlowCard>

      {planManagementGate ? (
        <LockedStateCard
          gate={planManagementGate}
          variant="action"
          onOpenPricing={onOpenPricing}
          testID="profile-locked-plan-management"
        />
      ) : null}

      <GlowCard>
        <Text style={styles.cardLabel}>Starter Plan</Text>
        <Text style={styles.helperText}>
          {onboardingState.completed ? "Questionnaire completed and ready to apply." : "Questionnaire not completed yet."}
        </Text>
        <AppButton size="chip" shape="chip" variant="secondary" onPress={onResetOnboarding}>
          <Text style={styles.smallActionText}>Reset Questionnaire</Text>
        </AppButton>
      </GlowCard>

      {showDrillCueSettings ? (
        <GlowCard>
          <Text style={styles.cardLabel}>Upcoming Drill Cue</Text>
          <Text style={styles.helperText}>
            Choose how the app prepares you for the next drill during the transition window.
          </Text>
          <View style={styles.inlineRow}>
            {(["off", "chime", "spoken"] as const).map((mode) => (
              <AppButton
                key={mode}
                size="chip"
                shape="chip"
                variant={drillCueMode === mode ? "primary" : "secondary"}
                onPress={() => onDrillCueModeChange(mode)}
                testID={`profile-drill-cue-${mode}`}
              >
                <Text style={drillCueMode === mode ? styles.primaryCtaText : styles.smallActionText}>
                  {mode === "off" ? "Off" : mode === "chime" ? "Chime" : "Spoken"}
                </Text>
              </AppButton>
            ))}
          </View>
        </GlowCard>
      ) : null}
    </ScrollView>
  );
}

export function PricingScreen(props: {
  entitlements: EntitlementState;
  onBack: () => void;
  onSelectPlan: (planId: EntitlementPlanId) => void;
  onRestorePurchases: () => void;
  restoreMessage: string | null;
}) {
  const { entitlements, onBack, onSelectPlan, onRestorePurchases, restoreMessage } = props;
  const summary = buildPricingScreenSummary(entitlements.planId);
  const planCards = buildPricingPlanCards(entitlements.planId);
  const currentPlanSummary = buildCurrentPlanSummary(entitlements);

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
      testID="pricing-screen"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>Pricing</Text>
        <AppButton size="chip" shape="pill" variant="secondary" onPress={onBack} testID="pricing-back">
          <Text style={styles.smallActionText}>Back</Text>
        </AppButton>
      </View>

      <GlowCard style={styles.pricingHeroCard}>
        <Text style={styles.cardLabel}>{summary.eyebrow}</Text>
        <Text style={styles.heroHeadline}>{summary.title}</Text>
        <Text style={styles.heroSubline}>{summary.subtitle}</Text>
      </GlowCard>

      <GlowCard style={styles.pricingCurrentPlanCard}>
        <View style={styles.inlineRowSpace}>
          <View style={styles.dashboardActionBlock}>
            <Text style={styles.cardLabel}>Current Plan</Text>
            <Text style={styles.heroSubline}>{currentPlanSummary.title}</Text>
          </View>
          <Text style={styles.levelChip}>{currentPlanSummary.statusLabel}</Text>
        </View>
        <Text style={styles.helperText}>{currentPlanSummary.detail}</Text>
        {currentPlanSummary.renewalLabel ? <Text style={styles.helperText}>{currentPlanSummary.renewalLabel}</Text> : null}
        {restoreMessage ? <Text style={styles.helperText}>{restoreMessage}</Text> : null}
        <AppButton
          size="chip"
          shape="pill"
          variant="secondary"
          onPress={onRestorePurchases}
          testID="pricing-restore-purchases"
        >
          <Text style={styles.smallActionText}>Restore Purchases</Text>
        </AppButton>
      </GlowCard>

      <GlowCard>
        <Text style={styles.cardLabel}>At a Glance</Text>
        <View style={styles.pricingComparisonList}>
          {summary.comparisonRows.map((row) => (
            <View key={row.label} style={styles.pricingComparisonRow}>
              <Text style={styles.badgeLabel}>{row.label}</Text>
              <View style={styles.pricingComparisonValues}>
                <Text style={styles.helperText}>Free: {row.free}</Text>
                <Text style={styles.helperText}>Premium: {row.premium}</Text>
              </View>
            </View>
          ))}
        </View>
      </GlowCard>

      {planCards.map((plan) => (
        <GlowCard
          key={plan.planId}
          style={[styles.pricingPlanCard, plan.featured ? styles.pricingPlanCardFeatured : null]}
        >
          <View style={styles.inlineRowSpace}>
            <View style={styles.dashboardActionBlock}>
              <Text style={styles.cardLabel}>{plan.name}</Text>
              <Text style={styles.pricingPriceLabel}>
                {plan.priceLabel} <Text style={styles.pricingBillingLabel}>{plan.billingLabel}</Text>
              </Text>
            </View>
            {plan.savingsLabel ? <Text style={styles.pricingFeaturedChip}>{plan.savingsLabel}</Text> : null}
            {plan.isCurrent ? <Text style={styles.levelChip}>Current</Text> : null}
          </View>
          <Text style={styles.helperText}>{plan.kicker}</Text>
          <View style={styles.pricingFeatureList}>
            {plan.highlights.map((highlight) => (
              <Text key={highlight} style={styles.pricingFeatureItem}>
                • {highlight}
              </Text>
            ))}
          </View>
          <AppButton
            variant={plan.featured ? "primary" : "secondary"}
            onPress={() => onSelectPlan(plan.planId)}
            disabled={plan.isCurrent}
            testID={`pricing-select-${plan.planId}`}
          >
            <Text style={plan.featured ? styles.primaryCtaText : styles.secondaryCtaText}>{plan.ctaLabel}</Text>
          </AppButton>
        </GlowCard>
      ))}

      <GlowCard>
        <Text style={styles.cardLabel}>Current Setup</Text>
        <Text style={styles.helperText}>
          This first version uses local plan state only. Billing, restore purchases, and locked premium flows land in later issues.
        </Text>
      </GlowCard>
    </ScrollView>
  );
}

export function AppTabBar(props: {
  screen: Screen;
  onNavigate: (screen: "home" | "sessions" | "progress" | "profile") => void;
}) {
  const { screen, onNavigate } = props;
  const tabs: {
    id: "home" | "sessions" | "progress" | "profile";
    label: string;
    icon: string;
  }[] = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "sessions", label: "Sessions", icon: "♪" },
    { id: "progress", label: "Progress", icon: "▮" },
    { id: "profile", label: "Profile", icon: "◉" },
  ];
  const selectedTab = screen === "active" || screen === "complete" ? "home" : screen === "pricing" ? "profile" : screen;

  return (
    <View style={[styles.tabBar, selectedTab === "home" ? styles.homeTabBar : null]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => onNavigate(tab.id)}
          testID={`tab-${tab.id}`}
        >
          <Text style={[styles.tabIcon, selectedTab === tab.id ? styles.tabIconActive : null]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, selectedTab === tab.id ? styles.tabLabelActive : null]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ActivePractice(props: {
  drill: Drill;
  levelState: LevelState;
  totalXp: number;
  sessionXp: number;
  drillProgress: number;
  sessionProgress: number;
  remainingSec: number;
  isPaused: boolean;
  microcopy: string;
  completionPulse: Animated.Value;
  drillCompletionTransition: {
    completedDrillName: string;
    gainedXp: number;
    nextDrillName: string | null;
    nextDrillDurationSec: number | null;
    nextDrillTargetBpm: number | null;
    nextDrillCueLine: string | null;
    preparationCountdownSec: number;
    isSessionFinisher: boolean;
  } | null;
  transitionCountdownSec: number;
  drillCueMode: DrillCueMode;
  showDrillCompletionTransition: boolean;
  showSessionXp: boolean;
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
  onForceComplete: () => void;
}) {
  const {
    drill,
    levelState,
    totalXp,
    sessionXp,
    drillProgress,
    sessionProgress,
    remainingSec,
    isPaused,
    microcopy,
    completionPulse,
    drillCompletionTransition,
    transitionCountdownSec,
    drillCueMode,
    showDrillCompletionTransition,
    showSessionXp,
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
    onForceComplete,
  } = props;

  const pulseScale = completionPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const cueScale = randomCuePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const focusAidCopy = buildFocusAidCopy(focusModeEnabled);
  const beatPulseCopy = buildBeatPulseCopy(beatPulseLocked, metronomeEnabled);

  return (
    <View style={styles.screenBody} testID="active-screen">
      <TouchableOpacity
        style={styles.activeCompatCompleteControl}
        onPress={onForceComplete}
        testID="active-force-complete"
      >
        <Text style={styles.smallActionText}>Complete Session</Text>
      </TouchableOpacity>
      <View style={styles.activeTopRow}>
        <View>
          <Text style={styles.cardLabel}>Practice Mode</Text>
          <Text style={styles.helperText}>Level {levelState.level} • {totalXp} total XP</Text>
        </View>
        <Text style={styles.metronomeStatusText}>Session {Math.max(1, Math.round(sessionProgress * 100))}% complete</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, sessionProgress * 100)}%` }]} />
      </View>
      {showSessionXp ? (
        <GlowCard style={styles.activeXpCard}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.cardLabel}>Session XP</Text>
            <Text style={styles.drillTransitionXp}>+{sessionXp} XP</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(6, Math.round((levelState.currentLevelXp / Math.max(1, levelState.nextLevelXp)) * 100))}%` },
              ]}
            />
          </View>
          <Text style={styles.helperText}>
            {levelState.currentLevelXp}/{levelState.nextLevelXp} XP toward Level {levelState.level + 1}
          </Text>
        </GlowCard>
      ) : null}

      <Animated.View style={[styles.activeCard, styles.activeCardHighlight, { transform: [{ scale: pulseScale }] }]}>
        <ProgressRing size={272} strokeWidth={16} progress={drillProgress} color={COLORS.accent} />
        <View style={styles.timerOverlay}>
          <Text style={styles.timerValue}>{formatClock(remainingSec)}</Text>
          <Text style={styles.timerNowLabel}>Now Playing</Text>
          <Text style={styles.timerLabel}>{drill.name}</Text>
          <Text style={styles.xpInline}>Reward +{toXp(drill)} XP</Text>
        </View>
      </Animated.View>

      {showDrillCompletionTransition && drillCompletionTransition ? (
        <View testID="active-drill-complete-transition">
          <GlowCard style={styles.drillTransitionCard}>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.cardLabel}>Drill Complete</Text>
            <Text style={styles.drillTransitionXp}>+{drillCompletionTransition.gainedXp} XP</Text>
          </View>
          <Text style={styles.drillTransitionTitle}>{drillCompletionTransition.completedDrillName}</Text>
          <Text style={styles.helperText}>
            {drillCompletionTransition.isSessionFinisher
              ? "Final drill complete. Session summary is up next."
              : "Locked in. Here is what comes next."}
          </Text>
          {!drillCompletionTransition.isSessionFinisher && drillCompletionTransition.nextDrillName ? (
            <View style={styles.drillTransitionNextCard}>
              <Text style={styles.cardLabel}>Next Drill</Text>
              <Text style={styles.badgeLabel}>{drillCompletionTransition.nextDrillName}</Text>
              <Text style={styles.helperText}>
                {Math.max(1, Math.round((drillCompletionTransition.nextDrillDurationSec ?? 0) / 60))} min
                {drillCompletionTransition.nextDrillTargetBpm
                  ? ` • ${drillCompletionTransition.nextDrillTargetBpm} BPM`
                  : ""}
              </Text>
              {drillCompletionTransition.nextDrillCueLine ? (
                <Text style={styles.helperText}>{drillCompletionTransition.nextDrillCueLine}</Text>
              ) : null}
              <Text style={styles.helperText}>
                Prepare in {Math.max(0, transitionCountdownSec)}s
                {drillCueMode !== "off" ? ` • ${drillCueMode} cue` : ""}
              </Text>
            </View>
          ) : null}
          </GlowCard>
        </View>
      ) : null}

      <GlowCard>
        <View style={styles.inlineRowSpace}>
          <View>
            <Text style={styles.cardLabel}>Metronome Rig</Text>
            <Text style={styles.helperText}>
              {metronomeEnabled ? "Click track is live and ready." : "Click track is muted."}
            </Text>
          </View>
          <AppChip
            selected={metronomeEnabled}
            style={metronomeEnabled ? styles.metronomeToggleOn : styles.metronomeToggleOff}
            onPress={onMetronomeToggle}
          >
            <Text style={styles.pillButtonText}>{metronomeEnabled ? "Live" : "Muted"}</Text>
          </AppChip>
        </View>

        <View style={styles.metronomeDeck}>
          <TouchableOpacity
            style={[styles.metronomeStepButton, styles.metronomeStepButtonAccent]}
            onPress={() => onMetronomeStep(-5)}
          >
            <Text style={styles.metronomeStepSymbol}>−</Text>
            <Text style={styles.metronomeStepLabel}>5 BPM</Text>
          </TouchableOpacity>
          <View style={styles.bpmPill}>
            <Text style={styles.metronomeBpmLabel}>{metronomeBpm}</Text>
            <Text style={styles.metronomeBpmUnit}>BPM</Text>
            <Text style={styles.helperText}>
              {drill.targetBpm ? `Drill target ${drill.targetBpm} BPM` : "Use the tempo that keeps the rep clean"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.metronomeStepButton, styles.metronomeStepButtonAccent]}
            onPress={() => onMetronomeStep(5)}
          >
            <Text style={styles.metronomeStepSymbol}>+</Text>
            <Text style={styles.metronomeStepLabel}>5 BPM</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metronomeStatusRow}>
          <Text style={styles.helperText}>
            {metronomeEnabled ? "Click is active for steady time." : "Click is muted for silent rehearsal."}
          </Text>
          <Text style={styles.metronomeStatusText}>{metronomeEnabled ? "Tap tempo feel" : "Silent rehearsal"}</Text>
        </View>
        {randomCueLabel ? (
          <Animated.View style={[styles.randomCueCard, { transform: [{ scale: cueScale }] }]}>
            <Text style={styles.randomCueLabel}>Now: {randomCueLabel}</Text>
            {randomCueNextLabel ? (
              <Text style={styles.helperText}>Upcoming: {randomCueNextLabel}</Text>
            ) : null}
            {randomCuePulseWindowActive ? <Text style={styles.helperText}>Cue incoming</Text> : null}
            <Text style={styles.helperText}>Next trigger in {Math.max(0, randomCueBeatsRemaining)} beats</Text>
          </Animated.View>
        ) : null}
      </GlowCard>

      <GlowCard style={styles.practiceAidCard}>
        <View style={styles.inlineRowSpace}>
          <Text style={styles.cardLabel}>Practice Aids</Text>
          <Text style={styles.helperText}>Tap to toggle</Text>
        </View>
        <TouchableOpacity
          style={styles.practiceAidRow}
          onPress={onToggleFocusMode}
          testID="active-focus-toggle"
        >
          <View style={styles.practiceAidBody}>
            <Text style={styles.badgeLabel}>{focusAidCopy.title}</Text>
            <Text style={styles.helperText}>{focusAidCopy.description}</Text>
          </View>
          <AppChip selected={focusModeEnabled}>
            <Text style={styles.pillButtonText}>{focusAidCopy.statusLabel}</Text>
          </AppChip>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.practiceAidRow}
          onPress={onToggleBeatPulseLocked}
          testID="active-beat-pulse-toggle"
        >
          <View style={styles.practiceAidLead}>
            <View style={[styles.beatDot, beatFlash && metronomeEnabled && beatPulseLocked ? styles.beatDotActive : null]} />
            <View style={styles.practiceAidBody}>
              <Text style={styles.badgeLabel}>{beatPulseCopy.title}</Text>
              <Text style={styles.helperText}>{beatPulseCopy.description}</Text>
            </View>
          </View>
          <AppChip selected={beatPulseLocked && metronomeEnabled}>
            <Text style={styles.pillButtonText}>{beatPulseCopy.statusLabel}</Text>
          </AppChip>
        </TouchableOpacity>
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

export function SessionComplete(props: {
  sessionXp: number;
  leveledUp: boolean;
  levelState: LevelState;
  totalXp: number;
  streak: number;
  badges: Badge[];
  rewardGlow: Animated.Value;
  rewardScale: Animated.Value;
  onReplay: () => void;
  onOpenBuilder: () => void;
  onContinue: () => void;
  showXpProgress?: boolean;
}) {
  const { sessionXp, leveledUp, levelState, totalXp, streak, badges, rewardGlow, rewardScale, onReplay, onOpenBuilder, onContinue, showXpProgress = true } = props;
  const [shared, setShared] = useState(false);
  const unlockedBadges = badges.filter((badge) => badge.unlocked).length;
  const xpProgressPercent = Math.max(
    6,
    Math.round((levelState.currentLevelXp / Math.max(1, levelState.nextLevelXp)) * 100),
  );

  const glowOpacity = rewardGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.completeScreenBody} testID="complete-screen">
      <View style={styles.completeTopBar}>
        <TouchableOpacity style={styles.builderIconAction} onPress={onContinue}>
          <Text style={styles.iconGlyph}>×</Text>
        </TouchableOpacity>
        <Text style={styles.completeTopTitle}>Session Summary</Text>
        <View style={styles.builderIconAction} />
      </View>

      <Animated.View style={[styles.rewardGlow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.stitchSummaryHero, { transform: [{ scale: rewardScale }] }]}>
        <View style={styles.stitchSummaryBadge}>
          <Text style={styles.stitchSummaryBadgeIcon}>✪</Text>
        </View>
        <Text style={styles.completeTitle}>Session Crushed!</Text>
        <Text style={styles.completeSubtext}>
          {leveledUp
            ? `Level up complete. You reached Level ${levelState.level}.`
            : "Your practice XP moved forward this session."}
        </Text>
      </Animated.View>

      <View style={styles.stitchSummaryGrid}>
        <View style={styles.stitchSummaryStatCard}>
          <Text style={styles.stitchSummaryMiniLabel}>XP Earned</Text>
          <Text style={styles.stitchSummaryStatValue}>+{sessionXp} XP</Text>
          <Text style={styles.stitchGreenText}>{totalXp} total XP</Text>
        </View>
        <View style={styles.stitchSummaryStatCard}>
          <Text style={styles.stitchSummaryMiniLabel}>Current Level</Text>
          <Text style={styles.stitchSummaryStatValue}>Level {levelState.level}</Text>
          <Text style={styles.stitchGreenText}>{unlockedBadges} badges unlocked</Text>
        </View>
        <View style={styles.stitchSummaryStatCard}>
          <Text style={styles.stitchSummaryMiniLabel}>Streak</Text>
          <Text style={styles.stitchSummaryStatValue}>{streak} Days</Text>
          <Text style={styles.stitchGreenText}>Showed up again today</Text>
        </View>
      </View>

      {showXpProgress ? (
        <GlowCard style={styles.completeProgressCard}>
          <Text style={styles.stitchSummaryMiniLabel}>Progress to Level {levelState.level + 1}</Text>
          <View style={styles.inlineRowSpace}>
            <Text style={styles.helperText}>Your XP bar carries across every practice moment now.</Text>
            <Text style={styles.stitchMetaValue}>{levelState.currentLevelXp}/{levelState.nextLevelXp} XP</Text>
          </View>
          {leveledUp ? <Text style={styles.levelUp}>Level Up! Welcome to Level {levelState.level}.</Text> : null}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${xpProgressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.helperText}>Badges unlocked: {unlockedBadges}</Text>
        </GlowCard>
      ) : null}

      <GlowCard style={styles.completeNextCard}>
        <Text style={styles.cardLabel}>Next Move</Text>
        <Text style={styles.helperText}>
          Keep the momentum with another pass, or jump back into Builder if you want to tune the routine first.
        </Text>
        <AppButton variant="primary" onPress={onReplay} testID="complete-replay-button">
          <Text style={styles.primaryCtaText}>Replay Session</Text>
        </AppButton>
        <AppButton style={styles.secondaryCta} variant="secondary" onPress={onContinue} testID="complete-continue-button">
          <Text style={styles.secondaryCtaText}>Back to Practice Hub</Text>
        </AppButton>
        <View style={styles.completeSecondaryActions}>
          <AppButton
            style={styles.completeChipAction}
            variant="secondary"
            size="chip"
            shape="pill"
            onPress={onOpenBuilder}
            testID="complete-open-builder-button"
          >
            <Text style={styles.smallActionText}>Edit Session</Text>
          </AppButton>
          <AppButton
            style={styles.completeChipAction}
            variant="secondary"
            size="chip"
            shape="pill"
            onPress={() => setShared(true)}
            testID="complete-share-button"
          >
            <Text style={styles.smallActionText}>{shared ? "Summary copied" : "Share Summary"}</Text>
          </AppButton>
        </View>
      </GlowCard>
    </ScrollView>
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

function formatClock(totalSeconds: number): string {
  const safeTotalSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const min = Math.floor(safeTotalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (safeTotalSeconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  screenBody: { flex: 1, paddingHorizontal: SPACING.pageX, paddingTop: 16, paddingBottom: 100, gap: SPACING.sectionGap },
  homeScroll: { flex: 1, backgroundColor: "#231a0f" },
  homeScrollContent: { paddingHorizontal: SPACING.pageX, paddingTop: 0, paddingBottom: 24, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: COLORS.text, fontSize: 46, lineHeight: 50, fontWeight: "800", letterSpacing: 0 },
  headerSubline: { color: COLORS.muted, fontSize: 15, lineHeight: 20, marginTop: 6 },
  homeTitle: { color: COLORS.text, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: 0.2 },
  homeSubtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 20, marginTop: 2 },
  levelChip: { color: COLORS.xp, fontSize: 13, fontWeight: "700", paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "rgba(234,179,8,0.16)", borderRadius: RADII.pill, overflow: "hidden" },
  stitchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(230,126,0,0.1)", paddingBottom: 8, marginHorizontal: -SPACING.pageX, paddingHorizontal: SPACING.pageX },
  stitchLevelChip: { minHeight: 34, minWidth: 58, borderRadius: RADII.pill, backgroundColor: "rgba(230,126,0,0.2)", borderWidth: 1, borderColor: "rgba(230,126,0,0.3)", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  stitchLevelChipText: { color: COLORS.xp, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  stitchSessionHero: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(230,126,0,0.1)", backgroundColor: "rgba(230,126,0,0.05)", overflow: "hidden" },
  stitchHeroImage: { width: "100%", height: 164, justifyContent: "flex-end" },
  stitchHeroImageRound: { opacity: 0.82 },
  stitchHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.16)" },
  stitchHeroBottomText: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  stitchHeroTitle: { color: COLORS.text, fontSize: 22, lineHeight: 26, fontWeight: "800" },
  stitchHeroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600" },
  stitchHeroBody: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  stitchMetaLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.7, textTransform: "uppercase" },
  stitchMetaValue: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  stitchSecondaryHeroButton: { minHeight: 38, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "flex-start", justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 14 },
  stitchSecondaryHeroButtonText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  homeStatStrip: { flexDirection: "row", gap: 12 },
  statChip: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(230,126,0,0.1)", backgroundColor: "rgba(230,126,0,0.05)", paddingVertical: 8, paddingHorizontal: 16, gap: 2 },
  stitchStatCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(230,126,0,0.1)", backgroundColor: "rgba(230,126,0,0.05)", paddingVertical: 8, paddingHorizontal: 16, gap: 2 },
  stitchCardLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  homeTinyIcon: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  homeQuestionIcon: { width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.accent },
  statChipLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  statChipValue: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  stitchQuestionnaireCard: { borderRadius: 16, borderColor: "rgba(230,126,0,0.1)", backgroundColor: "rgba(230,126,0,0.05)", gap: 6, padding: 14, minHeight: 164 },
  dashboardActionCard: { gap: 12 },
  pricingEntryCard: { gap: 12, borderColor: "rgba(250,204,21,0.24)", backgroundColor: "rgba(250,204,21,0.08)" },
  paywallEntryCard: { gap: 12, borderColor: "rgba(230,126,0,0.32)", backgroundColor: "rgba(230,126,0,0.08)" },
  lockedCard: { gap: 12, borderColor: "rgba(229,62,62,0.28)", backgroundColor: "rgba(229,62,62,0.08)" },
  lockedActionCard: { gap: 12, borderColor: "rgba(230,126,0,0.28)", backgroundColor: "rgba(17,13,9,0.52)" },
  dashboardComebackCard: { gap: 10, borderColor: "rgba(29,63,120,0.32)", backgroundColor: "rgba(29,63,120,0.12)" },
  homeFocusCard: { gap: 8, borderColor: "rgba(230,126,0,0.18)", backgroundColor: "rgba(255,255,255,0.03)" },
  dashboardXpCard: { gap: 10 },
  dashboardActionBlock: { flex: 1, gap: 4 },
  dashboardActionDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.08)" },
  dashboardSettingsCard: { gap: 12 },
  dashboardSettingTextBlock: { flex: 1, gap: 4, paddingRight: 12 },
  dashboardSettingControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  dashboardTargetInput: { minWidth: 82 },
  dashboardSaveButton: { minHeight: 42, paddingHorizontal: 14 },
  dashboardReminderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dashboardReminderInput: { flex: 1 },
  settingsChip: { flex: 1 },
  stitchSectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  stitchQuestionLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.3, marginBottom: 4 },
  stitchThreeCol: { flexDirection: "row", gap: 6 },
  choiceChip: { flex: 1 },
  stitchChoicePill: { flex: 1, minHeight: 30, borderRadius: RADII.pill, borderWidth: 1, borderColor: "#334a73", backgroundColor: "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  stitchChoicePillActive: { borderColor: "rgba(230,126,0,0.9)", backgroundColor: "rgba(230,126,0,0.16)" },
  stitchChoiceLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  stitchChoiceLabelActive: { color: COLORS.accent },
  onboardingPlanRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 },
  onboardingPlanChip: { minHeight: 32, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(230,126,0,0.28)", backgroundColor: "rgba(230,126,0,0.12)", justifyContent: "center", paddingHorizontal: 12 },
  onboardingPlanChipText: { color: COLORS.accent, fontSize: 12, fontWeight: "800" },
  hiddenCompatBlock: { height: 0, opacity: 0, overflow: "hidden" },
  homeHeroPanel: { borderColor: "rgba(230,126,0,0.52)", shadowColor: COLORS.accent, shadowOpacity: 0.24, shadowRadius: 18 },
  builderHeroCard: { borderColor: COLORS.divider, gap: 10 },
  heroHeadline: { color: COLORS.text, fontSize: 32, fontWeight: "800", lineHeight: 36 },
  heroSubline: { color: COLORS.muted, fontSize: 15, lineHeight: 21 },
  cardLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  progressTrack: { width: "100%", height: 13, borderRadius: RADII.pill, backgroundColor: COLORS.divider, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 999, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 4 },
  homeGoalFill: { backgroundColor: "#1d3f78" },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  skillRow: { gap: 8 },
  badge: { backgroundColor: COLORS.cardSoft, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.divider, minWidth: 96 },
  badgeLocked: { opacity: 0.45, borderColor: COLORS.divider },
  badgeIcon: { fontSize: 18, marginBottom: 4 },
  badgeLabel: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  primaryCta: { backgroundColor: COLORS.accent, minHeight: 46, borderRadius: RADII.card, alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  homePrimaryCta: { minHeight: 58, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 2, shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  homePrimaryCtaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  homePrimaryCtaIcon: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  homePrimaryCtaText: { fontSize: 16, letterSpacing: 0.2 },
  primaryCtaText: { color: COLORS.text, fontSize: 14, fontWeight: "800", letterSpacing: 0.4 },
  secondaryCta: { minHeight: 46, borderRadius: RADII.chip, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center" },
  secondaryCtaText: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  helperText: { color: COLORS.muted, fontSize: 15, lineHeight: 21 },
  builderStatsProbe: { width: 1, height: 1, opacity: 0 },
  builderProbe: { width: 1, height: 1, position: "absolute", top: 0, left: 0 },
  builderList: { flex: 1 },
  builderListAndroidLayer: { zIndex: 1 },
  builderListContent: { gap: 12, paddingBottom: 180 },
  builderListContentCompact: { paddingBottom: 236 },
  builderHeader: { gap: 10, paddingBottom: 2, marginBottom: 8 },
  builderScreenBody: { gap: 0, paddingTop: 8, paddingBottom: 0 },
  builderHeaderAndroidLayer: { zIndex: 12, elevation: 12 },
  builderTopBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  builderTopBarCompact: { gap: 10, flexDirection: "column", alignItems: "stretch" },
  builderTopLead: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  builderTopMeta: { flex: 1, minWidth: 0 },
  builderTopTitle: { color: COLORS.text, fontSize: 26, lineHeight: 30, fontWeight: "800" },
  builderTopSubtitle: { color: COLORS.accentAlt, fontSize: 12, fontWeight: "700" },
  builderTopActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  builderTopActionsCompact: { justifyContent: "space-between" },
  builderIconAction: { width: 36, height: 36, borderRadius: RADII.pill, alignItems: "center", justifyContent: "center" },
  iconGlyph: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  iconGlyphMuted: { color: COLORS.muted, fontSize: 17, fontWeight: "700" },
  builderTopUtilityGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  builderTopUtilityMenu: { position: "relative" },
  builderTopActionSecondary: { minHeight: 34, borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderTopActionSecondaryText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  builderTopUtilityAction: { width: 34, height: 34, borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center" },
  builderTopUtilityPanel: { position: "absolute", top: 40, right: 0, minWidth: 128, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.card, paddingVertical: 6, zIndex: 30, elevation: 30, shadowColor: "#000000", shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  builderTopUtilityPanelAction: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
  builderTopUtilityPanelText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  builderTopActionTertiary: { minHeight: 34, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(230,126,0,0.22)", backgroundColor: "rgba(230,126,0,0.08)", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderTopActionTertiaryText: { color: COLORS.accent, fontSize: 13, fontWeight: "700" },
  builderSectionLead: { gap: 4, flex: 1, minWidth: 0 },
  builderSectionTitle: { color: COLORS.text, fontSize: 24, lineHeight: 28, fontWeight: "800" },
  builderMiniMeta: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  builderHint: { color: COLORS.muted, fontSize: 14, lineHeight: 18 },
  builderEmptyCard: { marginTop: 4 },
  builderListFooter: { gap: 14, paddingTop: 4 },
  builderAddPlaceholder: { minHeight: 134, borderRadius: RADII.card, borderWidth: 1, borderColor: "rgba(230,126,0,0.35)", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.02)" },
  builderAddCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  builderAddPlus: { color: COLORS.text, fontSize: 30, lineHeight: 34, marginTop: -2 },
  builderAddText: { color: COLORS.accent, fontSize: 14, lineHeight: 18, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  builderTotalsBar: { borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  builderTotalsLabel: { color: COLORS.muted, fontSize: 14, lineHeight: 16, fontWeight: "700", letterSpacing: 0.7, textTransform: "uppercase" },
  builderTotalsValue: { color: COLORS.text, fontSize: 34, lineHeight: 38, fontWeight: "800", marginTop: 2 },
  builderTotalsRight: { alignItems: "flex-end" },
  builderTotalsXp: { color: COLORS.accent, fontSize: 34, lineHeight: 38, fontWeight: "800", marginTop: 2 },
  hiddenCompatControl: { opacity: 0, height: 0, overflow: "hidden" },
  builderCompatStartControl: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 88,
    height: 48,
    opacity: 0.02,
    zIndex: 10,
  },
  activeCompatCompleteControl: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 88,
    height: 48,
    opacity: 0.02,
    zIndex: 10,
  },
  builderFooterBar: { position: "absolute", left: SPACING.pageX, right: SPACING.pageX, bottom: 94, flexDirection: "row", alignItems: "center", gap: 12 },
  builderFooterBarCompact: { flexDirection: "column-reverse", alignItems: "stretch", gap: 10, bottom: 88 },
  builderPreviewButton: { flex: 1, minHeight: 54, borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center" },
  builderFooterPreviewButton: { flex: 0, minHeight: 50, paddingHorizontal: 18 },
  builderPreviewButtonCompact: { width: "100%" },
  builderStartButton: { flex: 1, minHeight: 54, borderRadius: RADII.pill, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", shadowColor: COLORS.accent, shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  builderFooterStartButton: { minHeight: 58 },
  builderStartButtonCompact: { width: "100%", flex: 0 },
  overviewScreenBody: { paddingHorizontal: SPACING.pageX, paddingTop: 8, paddingBottom: 120, gap: 14 },
  overviewHeroCard: { gap: 10 },
  overviewDrillList: { gap: 12, marginTop: 12 },
  overviewDrillRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  overviewDrillIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(230,126,0,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  overviewDrillIndexText: { color: COLORS.accent, fontSize: 13, fontWeight: "800" },
  overviewDrillBody: { flex: 1, gap: 2 },
  overviewFooter: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
  drillCard: { minHeight: 126, borderRadius: RADII.card, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.divider, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 12 },
  drillCardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  drillCardSelected: { borderColor: COLORS.accent, shadowColor: COLORS.accent, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  drillCardDragging: { borderColor: COLORS.accent, backgroundColor: COLORS.cardSoft, shadowColor: COLORS.accent, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  drillLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  drillLeftCompact: { alignItems: "flex-start", gap: 10 },
  drillTextBlock: { flex: 1, minWidth: 0 },
  drillOrder: { color: COLORS.muted, fontWeight: "800", width: 28 },
  drillOrderCompact: { width: 22, fontSize: 15, marginTop: 2 },
  drillName: { color: COLORS.text, fontSize: 18, lineHeight: 23, fontWeight: "700", flexShrink: 1 },
  drillNameCompact: { fontSize: 17, lineHeight: 21 },
  drillMeta: { color: COLORS.muted, marginTop: 2, fontSize: 13 },
  drillRandomMeta: { color: COLORS.accentAlt, marginTop: 2, fontSize: 12, fontWeight: "700" },
  drillLineLimitProbe: { fontSize: 1, lineHeight: 1, height: 1, marginTop: 0, color: "transparent" },
  builderCardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0, paddingTop: 2 },
  builderCardActionsCompact: { gap: 6 },
  dragChip: { minHeight: 34, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(230,126,0,0.35)", backgroundColor: "rgba(230,126,0,0.1)", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  dragChipCompact: { paddingHorizontal: 10, gap: 6 },
  dragChipGlyph: { color: COLORS.accent, fontSize: 12, fontWeight: "900", letterSpacing: -1.2 },
  dragChipText: { color: COLORS.accent, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  drillInlineEditor: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10, gap: 8 },
  builderEditorSectionLabel: { color: COLORS.accentAlt, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  builderEditorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  builderEditorField: { flex: 1, minWidth: 140, gap: 8 },
  builderEditorFieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  builderMiniPill: { minWidth: 0, flex: 1, paddingHorizontal: 10 },
  builderDisclosureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 4 },
  builderDisclosureBody: { flex: 1, gap: 2 },
  builderCueSummaryText: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  builderDisclosureGlyph: { color: COLORS.accent, fontSize: 22, lineHeight: 22, fontWeight: "700" },
  builderSecondaryEditor: { gap: 8, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, padding: 12 },
  builderCueBarsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  drillXp: { color: COLORS.xp, fontWeight: "800", fontSize: 18, minWidth: 70, textAlign: "right", marginTop: 2 },
  drillXpCompact: { minWidth: 0, textAlign: "left", marginTop: 4 },
  activeCard: { alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  activeCardHighlight: { shadowColor: COLORS.accent, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  activeXpCard: { gap: 8 },
  drillTransitionCard: { gap: 10, borderColor: "rgba(230,126,0,0.3)", backgroundColor: "rgba(230,126,0,0.08)" },
  drillTransitionXp: { color: COLORS.accent, fontSize: 15, fontWeight: "800" },
  drillTransitionTitle: { color: COLORS.text, fontSize: 24, lineHeight: 28, fontWeight: "800" },
  drillTransitionNextCard: { borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, padding: 12, gap: 4 },
  timerOverlay: { position: "absolute", alignItems: "center", justifyContent: "center", gap: 4 },
  timerValue: { color: COLORS.text, fontSize: 72, fontWeight: "900", letterSpacing: 1.2 },
  timerNowLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  timerLabel: { color: COLORS.text, fontSize: 18, fontWeight: "700", textAlign: "center", maxWidth: 220 },
  xpInline: { color: COLORS.xp, fontWeight: "700" },
  microcopy: { color: COLORS.muted, textAlign: "center", fontSize: 14, lineHeight: 20, paddingHorizontal: 18 },
  controlsRow: { flexDirection: "row", gap: 12 },
  activeTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlButton: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, alignItems: "center", justifyContent: "center" },
  controlButtonSecondary: { backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider },
  controlButtonText: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  rewardGlow: { position: "absolute", top: 86, alignSelf: "center", width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.accent },
  completeTitle: { color: COLORS.text, fontSize: 32, fontWeight: "800", textAlign: "center" },
  completeSubtext: { color: COLORS.muted, lineHeight: 22, textAlign: "center", fontSize: 16 },
  completeScreenBody: { paddingHorizontal: SPACING.pageX, paddingTop: 8, paddingBottom: 122, gap: 8 },
  completeTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 46 },
  completeTopTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  completeProgressCard: { gap: 8 },
  completeNextCard: { gap: 12 },
  completeSecondaryActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  completeChipAction: { flexGrow: 1 },
  levelUp: { color: COLORS.text, fontWeight: "800", fontSize: 16, marginTop: 6 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineRowSpace: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pillButton: { minHeight: 36, minWidth: 64, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, borderRadius: RADII.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  pillButtonText: { color: COLORS.text, fontWeight: "800" },
  templatePillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templatePill: { minHeight: 36, borderRadius: RADII.pill, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, justifyContent: "center", paddingHorizontal: 12 },
  templatePillActive: { borderColor: COLORS.text, backgroundColor: COLORS.cardSoft },
  templatePillText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  templateInput: { minHeight: 44, borderRadius: RADII.chip, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, color: COLORS.text, paddingHorizontal: 12 },
  timeInput: { flex: 1, minHeight: 44, borderRadius: RADII.chip, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, color: COLORS.text, paddingHorizontal: 12 },
  smallActionButton: { minHeight: 38, borderRadius: RADII.chip, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  actionButtonDisabled: { opacity: 0.45 },
  goalTypeActive: { borderColor: COLORS.accentAlt, backgroundColor: COLORS.cardSoft },
  smallActionText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  removeChip: { minHeight: 30, borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, paddingHorizontal: 10, justifyContent: "center", backgroundColor: COLORS.cardSoft },
  removeChipCompact: { paddingHorizontal: 8 },
  removeChipText: { color: COLORS.muted, fontWeight: "700", fontSize: 11 },
  recentSessionRow: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 8 },
  sessionsList: { gap: 12, paddingBottom: 24 },
  songMeta: { flex: 1, minWidth: 0, gap: 4 },
  songTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", maxWidth: "78%" },
  songActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  songTagMastered: { color: "#22c55e", borderColor: "rgba(34,197,94,0.35)", borderWidth: 1, borderRadius: RADII.pill, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  songTagNew: { color: COLORS.text, backgroundColor: COLORS.accent, borderRadius: RADII.pill, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  milestoneRow: { gap: 10, paddingRight: 6 },
  milestoneCard: { width: 220, borderRadius: RADII.chip, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, padding: 12, gap: 8 },
  stitchProgressHeroCard: { gap: 14 },
  stitchAvatarWrap: { width: 86, height: 86, borderRadius: 43, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center", position: "relative" },
  stitchAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: COLORS.divider },
  stitchAvatarLevel: { position: "absolute", bottom: -4, right: -4, minHeight: 24, borderRadius: RADII.pill, paddingHorizontal: 8, backgroundColor: "rgba(234,179,8,0.2)", borderWidth: 1, borderColor: "rgba(234,179,8,0.32)", alignItems: "center", justifyContent: "center" },
  stitchAvatarLevelText: { color: COLORS.xp, fontSize: 11, fontWeight: "800" },
  stitchProgressHeroMeta: { flex: 1, minWidth: 0, gap: 4 },
  stitchProgressHeroName: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  stitchGreenPill: { color: "#22c55e", borderColor: "rgba(34,197,94,0.35)", borderWidth: 1, borderRadius: RADII.pill, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: "800", overflow: "hidden" },
  stitchGreenText: { color: "#22c55e", fontSize: 12, fontWeight: "700" },
  sessionsHeroCard: { gap: 10 },
  sessionsPresetChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sessionsPresetChip: { borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  sessionsPresetChipText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  sessionPresetCard: { gap: 10 },
  sessionPresetTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", flex: 1, paddingRight: 8 },
  sessionsPresetPreview: { color: COLORS.muted, fontSize: 13 },
  stitchFeaturedImage: { minHeight: 236, justifyContent: "flex-end" },
  stitchFeaturedImageRound: { opacity: 0.96 },
  stitchFeaturedBottom: { padding: 16, gap: 8 },
  stitchFeaturedEyebrow: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  stitchFeaturedTitle: { color: COLORS.text, fontSize: 32, lineHeight: 35, fontWeight: "800" },
  stitchFeaturedArtist: { color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: "600" },
  stitchFeaturedDifficulty: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  stitchFeaturedStart: { minHeight: 42, minWidth: 84, borderRadius: RADII.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(17,13,9,0.54)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  stitchSongRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, borderRadius: RADII.chip, padding: 10 },
  stitchSongThumb: { width: 68, height: 68, borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider },
  stitchPlayButton: { minHeight: 34, minWidth: 34, borderRadius: RADII.pill, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  stitchSummaryHero: { marginTop: 2, minHeight: 152, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", gap: 8 },
  stitchSummaryBadge: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: "rgba(234,179,8,0.35)", backgroundColor: "rgba(234,179,8,0.12)", alignItems: "center", justifyContent: "center" },
  stitchSummaryBadgeIcon: { fontSize: 30, color: COLORS.accent },
  stitchSummaryGrid: { gap: 10 },
  stitchSummaryStatCard: { borderRadius: RADII.chip, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  stitchSummaryMiniLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  stitchSummaryStatValue: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  pricingHeroCard: { gap: 10, borderColor: "rgba(250,204,21,0.24)", backgroundColor: "rgba(250,204,21,0.08)" },
  pricingCurrentPlanCard: { gap: 10 },
  pricingComparisonList: { gap: 10 },
  pricingComparisonRow: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pricingComparisonValues: { gap: 2 },
  pricingPlanCard: { gap: 12 },
  pricingPlanCardFeatured: { borderColor: "rgba(230,126,0,0.48)", shadowColor: COLORS.accent, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  pricingPriceLabel: { color: COLORS.text, fontSize: 30, lineHeight: 34, fontWeight: "800" },
  pricingBillingLabel: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
  pricingFeaturedChip: { color: COLORS.xp, fontSize: 12, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(234,179,8,0.16)", borderRadius: RADII.pill, overflow: "hidden" },
  pricingFeatureList: { gap: 6 },
  pricingFeatureItem: { color: COLORS.text, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 84, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2 },
  homeTabBar: { backgroundColor: "#231a0f", borderTopColor: "rgba(230,126,0,0.1)" },
  tabItem: { flex: 1, minHeight: 50, borderRadius: RADII.chip, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: "transparent" },
  tabLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  tabLabelActive: { color: COLORS.text },
  tabIcon: { color: COLORS.muted, fontSize: 20, lineHeight: 20, fontWeight: "700" },
  tabIconActive: { color: COLORS.accent },
  errorText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  metronomeBpmLabel: { color: COLORS.text, fontSize: 34, lineHeight: 36, fontWeight: "800" },
  metronomeBpmUnit: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  metronomeDeck: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 10 },
  metronomeStepButton: { width: 68, borderRadius: RADII.card, borderWidth: 1, borderColor: "rgba(230,126,0,0.25)", backgroundColor: "rgba(230,126,0,0.08)", alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 12 },
  metronomeStepButtonAccent: { shadowColor: COLORS.accent, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  metronomeStepSymbol: { color: COLORS.text, fontSize: 24, lineHeight: 24, fontWeight: "800" },
  metronomeStepLabel: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  bpmPill: { flex: 1, minHeight: 96, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, gap: 2 },
  metronomeToggleOn: { borderColor: "rgba(34,197,94,0.28)", backgroundColor: "rgba(34,197,94,0.16)" },
  metronomeToggleOff: { borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft },
  metronomeStatusRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  metronomeStatusText: { color: COLORS.accentAlt, fontSize: 12, fontWeight: "700" },
  practiceAidCard: { gap: 10 },
  practiceAidRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 2 },
  practiceAidLead: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  practiceAidBody: { flex: 1, gap: 2 },
  beatDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.cardSoft, borderWidth: 1, borderColor: COLORS.divider },
  beatDotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  randomCueCard: { marginTop: 10, borderRadius: RADII.chip, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.cardSoft, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  randomCueLabel: { color: COLORS.accentAlt, fontSize: 14, fontWeight: "800" },
});
