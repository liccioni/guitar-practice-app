import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import Svg, { Circle } from "react-native-svg";

type Screen = "home" | "builder" | "active" | "complete";
type Difficulty = "Easy" | "Medium" | "Hard";

interface Drill {
  id: string;
  name: string;
  durationSec: number;
  difficulty: Difficulty;
  xp: number;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

const COLORS = {
  bg: "#121212",
  card: "#1d1f24",
  cardSoft: "#181a1f",
  text: "#f5f7ff",
  muted: "#9ba4b5",
  accent: "#00e5ff",
  accentAlt: "#39ff14",
  danger: "#ff6b6b",
  gold: "#ffd166",
};

const STARTER_DRILLS: Drill[] = [
  { id: "d1", name: "Chromatic Warmup", durationSec: 240, difficulty: "Easy", xp: 45 },
  { id: "d2", name: "Major Scale Ladder", durationSec: 360, difficulty: "Medium", xp: 70 },
  { id: "d3", name: "Chord Change Sprint", durationSec: 300, difficulty: "Medium", xp: 65 },
  { id: "d4", name: "Alternate Picking Burst", durationSec: 270, difficulty: "Hard", xp: 85 },
];

const DRILL_POOL: Drill[] = [
  { id: "p1", name: "Pentatonic Run", durationSec: 300, difficulty: "Medium", xp: 60 },
  { id: "p2", name: "Rhythm Pocket", durationSec: 240, difficulty: "Easy", xp: 40 },
  { id: "p3", name: "Arpeggio Climb", durationSec: 360, difficulty: "Hard", xp: 95 },
  { id: "p4", name: "String Skip Flow", durationSec: 300, difficulty: "Hard", xp: 90 },
  { id: "p5", name: "Legato Builder", durationSec: 270, difficulty: "Medium", xp: 55 },
];

const MOTIVATION = [
  "Lock in. Every rep makes you cleaner.",
  "Stay relaxed, stay precise.",
  "Small gains compound fast.",
  "You are one drill away from momentum.",
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [drills, setDrills] = useState<Drill[]>(STARTER_DRILLS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(STARTER_DRILLS[0].durationSec);
  const [isPaused, setIsPaused] = useState(false);

  const [totalXp, setTotalXp] = useState(1120);
  const [todayMinutes, setTodayMinutes] = useState(12);
  const [streak, setStreak] = useState(9);
  const [sessionXp, setSessionXp] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [currentMicrocopy, setCurrentMicrocopy] = useState(MOTIVATION[0]);

  const [badges, setBadges] = useState<Badge[]>([
    { id: "b1", label: "7-Day Streak", icon: "🔥", unlocked: true },
    { id: "b2", label: "Rhythm Keeper", icon: "🎵", unlocked: true },
    { id: "b3", label: "XP Hunter", icon: "⚡", unlocked: false },
    { id: "b4", label: "Session Beast", icon: "🏆", unlocked: false },
  ]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rewardScale = useRef(new Animated.Value(0.92)).current;
  const rewardGlow = useRef(new Animated.Value(0)).current;
  const completionPulse = useRef(new Animated.Value(0)).current;
  const handleDrillFinishedRef = useRef<() => void>(() => undefined);

  const activeDrill = drills[activeIndex];
  const sessionDurationSec = useMemo(
    () => drills.reduce((sum, d) => sum + d.durationSec, 0),
    [drills],
  );
  const elapsedSec = useMemo(() => {
    const doneBefore = drills
      .slice(0, activeIndex)
      .reduce((sum, drill) => sum + drill.durationSec, 0);
    if (!activeDrill) return doneBefore;
    return doneBefore + (activeDrill.durationSec - remainingSec);
  }, [activeDrill, activeIndex, drills, remainingSec]);

  const sessionProgress =
    sessionDurationSec === 0 ? 0 : Math.min(1, elapsedSec / sessionDurationSec);
  const drillProgress =
    !activeDrill || activeDrill.durationSec === 0
      ? 0
      : Math.min(1, (activeDrill.durationSec - remainingSec) / activeDrill.durationSec);

  const levelState = useMemo(() => getLevelState(totalXp), [totalXp]);
  const dailyGoalMinutes = 30;
  const dailyGoalProgress = Math.min(1, todayMinutes / dailyGoalMinutes);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
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
    if (screen !== "complete") return;

    rewardScale.setValue(0.9);
    rewardGlow.setValue(0);
    Animated.parallel([
      Animated.timing(rewardScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rewardGlow, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rewardGlow, rewardScale, screen]);

  function triggerCompletionPulse(): void {
    completionPulse.setValue(0);
    Animated.sequence([
      Animated.timing(completionPulse, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(completionPulse, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleDrillFinished(): void {
    if (!activeDrill) return;

    triggerCompletionPulse();

    const gainedXp = activeDrill.xp;
    const nextTotalXp = totalXp + gainedXp;
    const oldLevel = getLevelState(totalXp).level;
    const newLevel = getLevelState(nextTotalXp).level;

    setSessionXp((current) => current + gainedXp);
    setTotalXp(nextTotalXp);
    setLeveledUp(newLevel > oldLevel);

    if (activeIndex < drills.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      setRemainingSec(drills[nextIndex].durationSec);
      setCurrentMicrocopy(MOTIVATION[nextIndex % MOTIVATION.length]);
      return;
    }

    finishSession();
  }

  handleDrillFinishedRef.current = handleDrillFinished;

  function finishSession(): void {
    const totalSec = drills.reduce((sum, drill) => sum + drill.durationSec, 0);
    const earnedMinutes = Math.max(1, Math.round(totalSec / 60));

    setTodayMinutes((current) => current + earnedMinutes);
    setStreak((current) => current + 1);
    setBadges((current) =>
      current.map((badge) => {
        if (badge.id === "b3" && sessionXp >= 150) return { ...badge, unlocked: true };
        if (badge.id === "b4" && drills.length >= 4) return { ...badge, unlocked: true };
        return badge;
      }),
    );
    setScreen("complete");
  }

  function startPracticeFlow(): void {
    setScreen("builder");
  }

  function startSession(): void {
    if (drills.length === 0) return;
    setActiveIndex(0);
    setRemainingSec(drills[0].durationSec);
    setIsPaused(false);
    setSessionXp(0);
    setLeveledUp(false);
    setCurrentMicrocopy(MOTIVATION[0]);
    setScreen("active");
  }

  function skipDrill(): void {
    if (activeIndex >= drills.length - 1) {
      finishSession();
      return;
    }

    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    setRemainingSec(drills[nextIndex].durationSec);
    setCurrentMicrocopy(MOTIVATION[nextIndex % MOTIVATION.length]);
  }

  function addDrillFromPool(): void {
    const next = DRILL_POOL[Math.floor(Math.random() * DRILL_POOL.length)];
    const uniqueId = `${next.id}_${Date.now()}`;
    setDrills((current) => [...current, { ...next, id: uniqueId }]);
  }

  function resetToHome(): void {
    setScreen("home");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {screen === "home" ? (
            <HomeDashboard
              levelState={levelState}
              streak={streak}
              goalProgress={dailyGoalProgress}
              todayMinutes={todayMinutes}
              dailyGoalMinutes={dailyGoalMinutes}
              badges={badges}
              onStartPractice={startPracticeFlow}
            />
          ) : null}

          {screen === "builder" ? (
            <SessionBuilder
              drills={drills}
              onBack={resetToHome}
              onStartSession={startSession}
              onSetDrills={setDrills}
              onAddDrill={addDrillFromPool}
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
              onPauseToggle={() => setIsPaused((current) => !current)}
              onSkip={skipDrill}
            />
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
    </GestureHandlerRootView>
  );
}

function HomeDashboard(props: {
  levelState: LevelState;
  streak: number;
  goalProgress: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  badges: Badge[];
  onStartPractice: () => void;
}) {
  const {
    levelState,
    streak,
    goalProgress,
    todayMinutes,
    dailyGoalMinutes,
    badges,
    onStartPractice,
  } = props;

  return (
    <View style={styles.screenBody}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Level {levelState.level}</Text>
        <Text style={styles.levelChip}>
          {levelState.currentLevelXp}/{levelState.nextLevelXp} XP
        </Text>
      </View>

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
          <Text style={styles.cardLabel}>🔥 Streak</Text>
          <Text style={styles.bigValue}>{streak} days</Text>
        </GlowCard>

        <GlowCard style={styles.flexCard}>
          <Text style={styles.cardLabel}>Today Goal</Text>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ProgressRing
              size={84}
              strokeWidth={8}
              progress={goalProgress}
              color={COLORS.accentAlt}
            />
            <Text style={styles.ringText}>
              {todayMinutes}/{dailyGoalMinutes}m
            </Text>
          </View>
        </GlowCard>
      </View>

      <GlowCard>
        <Text style={styles.cardLabel}>Achievements</Text>
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[styles.badge, !badge.unlocked ? styles.badgeLocked : null]}
            >
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      </GlowCard>

      <TouchableOpacity
        style={styles.primaryCta}
        onPress={onStartPractice}
        accessibilityRole="button"
      >
        <Text style={styles.primaryCtaText}>Start Practice</Text>
      </TouchableOpacity>
    </View>
  );
}

function SessionBuilder(props: {
  drills: Drill[];
  onBack: () => void;
  onStartSession: () => void;
  onSetDrills: (drills: Drill[]) => void;
  onAddDrill: () => void;
}) {
  const { drills, onBack, onStartSession, onSetDrills, onAddDrill } = props;
  const totalXp = drills.reduce((sum, drill) => sum + drill.xp, 0);

  return (
    <View style={styles.screenBody}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.topActionButton}>
          <Text style={styles.topActionText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Session Builder</Text>
        <Text style={styles.levelChip}>{totalXp} XP</Text>
      </View>

      <Text style={styles.helperText}>Long-press a drill card and drag to reorder.</Text>

      <DraggableFlatList
        data={drills}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => onSetDrills(data)}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item, drag, isActive, getIndex }) => (
          <ScaleDecorator>
            <TouchableOpacity
              onLongPress={drag}
              activeOpacity={0.9}
              style={[styles.drillCard, isActive ? styles.drillCardActive : null]}
            >
              <View style={styles.drillLeft}>
                <Text style={styles.drillOrder}>#{(getIndex?.() ?? 0) + 1}</Text>
                <View>
                  <Text style={styles.drillName}>{item.name}</Text>
                  <Text style={styles.drillMeta}>
                    {item.durationSec / 60} min • {item.difficulty}
                  </Text>
                </View>
              </View>
              <View style={styles.drillReward}>
                <Text style={styles.drillXp}>+{item.xp} XP</Text>
              </View>
            </TouchableOpacity>
          </ScaleDecorator>
        )}
      />

      <TouchableOpacity style={styles.primaryCta} onPress={onStartSession}>
        <Text style={styles.primaryCtaText}>Start This Session</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fab} onPress={onAddDrill} accessibilityRole="button">
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
    onPauseToggle,
    onSkip,
  } = props;

  const pulseScale = completionPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  return (
    <View style={styles.screenBody}>
      <Text style={styles.cardLabel}>Session Progress</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, sessionProgress * 100)}%` }]} />
      </View>

      <Animated.View style={[styles.activeCard, { transform: [{ scale: pulseScale }] }]}>
        <ProgressRing size={240} strokeWidth={14} progress={drillProgress} color={COLORS.accent} />
        <View style={styles.timerOverlay}>
          <Text style={styles.timerValue}>{formatClock(remainingSec)}</Text>
          <Text style={styles.timerLabel}>{drill.name}</Text>
          <Text style={styles.xpInline}>Reward +{drill.xp} XP</Text>
        </View>
      </Animated.View>

      <Text style={styles.microcopy}>{microcopy}</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={onPauseToggle}>
          <Text style={styles.controlButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.controlButtonSecondary]}
          onPress={onSkip}
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
  const { sessionXp, leveledUp, level, streak, badges, rewardGlow, rewardScale, onContinue } =
    props;

  const glowOpacity = rewardGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={styles.screenBody}>
      <Animated.View style={[styles.rewardGlow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.completeCard, { transform: [{ scale: rewardScale }] }]}>
        <Text style={styles.completeTitle}>Session Complete</Text>
        <Text style={styles.completeXp}>+{sessionXp} XP</Text>
        <Text style={styles.completeSubtext}>
          Great work. You moved your playing forward today.
        </Text>

        {leveledUp ? (
          <Text style={styles.levelUp}>Level Up! You are now Level {level}.</Text>
        ) : null}
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

      <TouchableOpacity style={styles.primaryCta} onPress={onContinue}>
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
      easing: Easing.out(Easing.quad),
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
        stroke="#2a2d35"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <AnimatedCircle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
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

function xpForNextLevel(level: number): number {
  return 220 + (level - 1) * 90;
}

function getLevelState(totalXp: number): LevelState {
  let level = 1;
  let remaining = totalXp;
  let needed = xpForNextLevel(level);

  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpForNextLevel(level);
  }

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: needed,
  };
}

function formatClock(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 16,
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
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  levelChip: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  glowCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  rowTwoCol: {
    flexDirection: "row",
    gap: 12,
  },
  flexCard: {
    flex: 1,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bigValue: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginTop: 2,
  },
  progressTrack: {
    marginTop: 8,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#282c34",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ringText: {
    color: COLORS.text,
    marginTop: -48,
    fontSize: 13,
    fontWeight: "700",
  },
  badgeRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    minWidth: 88,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: "#30333b",
    gap: 4,
  },
  badgeLocked: {
    opacity: 0.45,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "600",
  },
  primaryCta: {
    marginTop: "auto",
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryCtaText: {
    color: COLORS.bg,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  topActionButton: {
    minHeight: 44,
    minWidth: 70,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  topActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  drillCard: {
    minHeight: 88,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#2d323a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  drillCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: "#1a242c",
  },
  drillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  drillOrder: {
    color: COLORS.accentAlt,
    fontWeight: "700",
    fontSize: 14,
    width: 28,
  },
  drillName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  drillMeta: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
  },
  drillReward: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#102936",
  },
  drillXp: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 92,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentAlt,
    shadowColor: COLORS.accentAlt,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: COLORS.bg,
    fontSize: 30,
    marginTop: -2,
    fontWeight: "500",
  },
  activeCard: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    gap: 4,
  },
  timerValue: {
    color: COLORS.text,
    fontSize: 54,
    fontWeight: "700",
    letterSpacing: 1,
  },
  timerLabel: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  xpInline: {
    color: COLORS.accentAlt,
    fontSize: 14,
    fontWeight: "700",
  },
  microcopy: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
  },
  controlsRow: {
    marginTop: "auto",
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  controlButtonSecondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#2f333b",
  },
  controlButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  rewardGlow: {
    position: "absolute",
    top: 130,
    left: 80,
    right: 80,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accent,
  },
  completeCard: {
    marginTop: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2d323a",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  completeTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
  },
  completeXp: {
    color: COLORS.accentAlt,
    fontSize: 44,
    fontWeight: "700",
  },
  completeSubtext: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  levelUp: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: "700",
  },
  streakLine: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
