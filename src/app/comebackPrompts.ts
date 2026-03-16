import type { PracticeHistoryEntry } from "../domain/history/types";

export interface ComebackPrompt {
  kind: "new" | "finish_loop" | "restart" | "active";
  homeTitle: string;
  homeBody: string;
  homeActionLabel: string;
  progressTitle: string;
  progressBody: string;
  recentFormEmptyBody: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildComebackPrompt(entries: PracticeHistoryEntry[], nowIso: string): ComebackPrompt {
  if (entries.length === 0) {
    return {
      kind: "new",
      homeTitle: "Start your first tracked session",
      homeBody: "One focused session is enough to build your baseline and unlock more useful coaching across the app.",
      homeActionLabel: "Start First Session",
      progressTitle: "No tracked practice yet",
      progressBody: "Finish one full session to unlock recent form, weekly trends, and more reliable progress signals.",
      recentFormEmptyBody: "Your first completed session will turn this into a real trendline instead of a placeholder.",
    };
  }

  const sorted = [...entries].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const lastEntry = sorted[0];
  const completedEntries = sorted.filter((entry) => entry.completed);
  const lastCompleted = completedEntries[0] ?? null;
  const hasRecentCompletedSession = completedEntries.some((entry) => daysSince(entry.startedAt, nowIso) <= 7);

  if (completedEntries.length === 0 && lastEntry) {
    return {
      kind: "finish_loop",
      homeTitle: "Finish the loop you already started",
      homeBody: `You already opened ${lastEntry.sessionNameSnapshot}. Complete one short session to give Fretline a real starting point.`,
      homeActionLabel: "Finish A Session",
      progressTitle: "You have warm-up data, not a trend yet",
      progressBody: "Right now the app only knows what you started. One completed session will unlock trustworthy recent-form feedback.",
      recentFormEmptyBody: "Complete your first full session to turn practice attempts into something worth measuring.",
    };
  }

  if (!hasRecentCompletedSession && lastCompleted) {
    const gapDays = daysSince(lastCompleted.startedAt, nowIso);
    const gapLabel = gapDays === 0 ? "today" : gapDays === 1 ? "1 day ago" : `${gapDays} days ago`;

    return {
      kind: "restart",
      homeTitle: "Time for a comeback session",
      homeBody: `Your last completed session was ${gapLabel} (${lastCompleted.sessionNameSnapshot}). A short reset session today is enough to get momentum back.`,
      homeActionLabel: "Start Comeback Session",
      progressTitle: "Your recent trend needs a fresh data point",
      progressBody: `The last completed session landed ${gapLabel}. Finish one session today to make the dashboard feel current again.`,
      recentFormEmptyBody: "Your next completed session will make this trend feel alive again.",
    };
  }

  return {
    kind: "active",
    homeTitle: "Practice momentum is active",
    homeBody: "Keep stacking consistent sessions and the dashboard will stay grounded in fresh history.",
    homeActionLabel: "Keep Practicing",
    progressTitle: "Recent form is current",
    progressBody: "Your tracked sessions are fresh enough to support weekly trends and milestone coaching.",
    recentFormEmptyBody: "Recent sessions will keep showing up here as long as you keep logging practice.",
  };
}

function daysSince(iso: string, nowIso: string): number {
  const diffMs = Date.parse(nowIso) - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / DAY_MS);
}
