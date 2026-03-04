import { Audio, type AVPlaybackSource, type AudioMode } from "expo-av";

let sound: Audio.Sound | null = null;
let initialized = false;
let initializing: Promise<void> | null = null;

const METRONOME_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  staysActiveInBackground: false,
};

function resolveTickSound(): AVPlaybackSource {
  try {
    return require("../../assets/audio/metronome-tick.wav");
  } catch {
    // Test/runtime fallback outside Metro asset handling.
    return { uri: "metronome-tick-fallback" };
  }
}

async function ensureMetronomeSoundLoaded(): Promise<void> {
  if (initialized && sound) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = (async () => {
    await Audio.setAudioModeAsync(METRONOME_AUDIO_MODE);
    const { sound: created } = await Audio.Sound.createAsync(resolveTickSound(), {
      shouldPlay: false,
      volume: 1,
    });
    sound = created;
    initialized = true;
  })();

  try {
    await initializing;
  } finally {
    initializing = null;
  }
}

export async function primeMetronomeAudio(): Promise<void> {
  try {
    await ensureMetronomeSoundLoaded();
  } catch {
    // Keep app flow usable even if audio init fails on a device/simulator.
  }
}

export async function playMetronomeTick(): Promise<void> {
  try {
    await ensureMetronomeSoundLoaded();
    if (!sound) return;
    await sound.replayAsync();
  } catch {
    // Audio output is best-effort; visual beat still indicates tempo.
  }
}

export async function releaseMetronomeAudio(): Promise<void> {
  if (!sound) return;
  try {
    await sound.unloadAsync();
  } catch {
    // Ignore cleanup failures.
  } finally {
    sound = null;
    initialized = false;
  }
}
