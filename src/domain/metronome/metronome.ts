export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function clampBpm(bpm: number): number {
  if (bpm < MIN_BPM) return MIN_BPM;
  if (bpm > MAX_BPM) return MAX_BPM;
  return Math.round(bpm);
}

export function isValidBpm(bpm: number): boolean {
  return bpm >= MIN_BPM && bpm <= MAX_BPM;
}

export function stepBpm(currentBpm: number, delta: number): number {
  return clampBpm(currentBpm + delta);
}

export function getBeatIntervalMs(bpm: number): number {
  const normalized = clampBpm(bpm);
  return Math.round(60000 / normalized);
}
