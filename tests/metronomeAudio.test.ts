import { beforeEach, describe, expect, it, vi } from "vitest";

const unloadAsync = vi.fn(async () => undefined);
const replayAsync = vi.fn(async () => undefined);
const createAsync = vi.fn(async () => ({ sound: { unloadAsync, replayAsync } }));
const setAudioModeAsync = vi.fn(async () => undefined);

vi.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync,
    Sound: {
      createAsync,
    },
  },
}));

describe("metronome audio service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initializes audio mode and sound once", async () => {
    const service = await import("../src/application/metronomeAudio");

    await service.primeMetronomeAudio();
    await service.primeMetronomeAudio();

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(createAsync).toHaveBeenCalledTimes(1);
  });

  it("plays tick using replayAsync", async () => {
    const service = await import("../src/application/metronomeAudio");

    await service.playMetronomeTick();

    expect(replayAsync).toHaveBeenCalledTimes(1);
  });

  it("unloads and can reinitialize after release", async () => {
    const service = await import("../src/application/metronomeAudio");

    await service.primeMetronomeAudio();
    await service.releaseMetronomeAudio();
    await service.primeMetronomeAudio();

    expect(unloadAsync).toHaveBeenCalledTimes(1);
    expect(createAsync).toHaveBeenCalledTimes(2);
  });
});
