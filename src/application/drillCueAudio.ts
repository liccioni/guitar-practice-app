import * as Speech from "expo-speech";
import { playMetronomeTick } from "./metronomeAudio";

export type DrillCueMode = "off" | "chime" | "spoken";

export async function playDrillTransitionCue(
  mode: DrillCueMode,
  nextDrillName: string | null,
): Promise<void> {
  if (mode === "off" || !nextDrillName) return;

  if (mode === "chime") {
    await playChimeCue();
    return;
  }

  try {
    await Speech.stop();
    Speech.speak(`Next drill: ${nextDrillName}`, {
      pitch: 1.02,
      rate: 0.95,
      language: "en-US",
    });
  } catch {
    await playChimeCue();
  }
}

async function playChimeCue(): Promise<void> {
  try {
    await playMetronomeTick();
    setTimeout(() => {
      void playMetronomeTick();
    }, 180);
  } catch {
    // Best-effort cue only.
  }
}
