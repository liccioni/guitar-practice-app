export const BADGE_IDS = ["b1", "b2", "b3", "b4"] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export interface BadgeUnlockInput {
  currentUnlockedBadgeIds: string[];
  sessionXp: number;
  completedDrillCount: number;
  streakDays: number;
  sessionsCompleted: number;
  averageBpm: number;
}

function sanitizeBadgeIds(input: string[]): BadgeId[] {
  const valid = new Set(BADGE_IDS);
  return Array.from(
    new Set(input.filter((id): id is BadgeId => valid.has(id as BadgeId))),
  );
}

export function computeUnlockedBadgeIds(input: BadgeUnlockInput): BadgeId[] {
  const unlocked = new Set<BadgeId>(sanitizeBadgeIds(input.currentUnlockedBadgeIds));

  if (input.streakDays >= 7) unlocked.add("b1");
  if (input.sessionsCompleted >= 5 && input.averageBpm >= 100) unlocked.add("b2");
  if (input.sessionXp >= 150) unlocked.add("b3");
  if (input.completedDrillCount >= 4) unlocked.add("b4");

  return BADGE_IDS.filter((id) => unlocked.has(id));
}
