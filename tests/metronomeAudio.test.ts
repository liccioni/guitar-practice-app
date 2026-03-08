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

  it("swallows initialization and replay failures", async () => {
    setAudioModeAsync.mockRejectedValueOnce(new Error("audio mode failed"));
    replayAsync.mockRejectedValueOnce(new Error("replay failed"));
    const service = await import("../src/application/metronomeAudio");

    await expect(service.primeMetronomeAudio()).resolves.toBeUndefined();
    await expect(service.playMetronomeTick()).resolves.toBeUndefined();
  });

  it("swallows unload failures and resets state", async () => {
    unloadAsync.mockRejectedValueOnce(new Error("unload failed"));
    const service = await import("../src/application/metronomeAudio");

    await service.primeMetronomeAudio();
    await expect(service.releaseMetronomeAudio()).resolves.toBeUndefined();
    await service.primeMetronomeAudio();

    expect(createAsync).toHaveBeenCalledTimes(2);
  });

  it("is safe to play/release before initialization", async () => {
    const service = await import("../src/application/metronomeAudio");
    await expect(service.releaseMetronomeAudio()).resolves.toBeUndefined();
    await expect(service.playMetronomeTick()).resolves.toBeUndefined();
  });

  it("shares in-flight initialization promise", async () => {
    createAsync.mockImplementationOnce(
      async () =>
        await new Promise((resolve) =>
          setTimeout(() => resolve({ sound: { unloadAsync, replayAsync } }), 10),
        ),
    );
    const service = await import("../src/application/metronomeAudio");

    await Promise.all([service.primeMetronomeAudio(), service.primeMetronomeAudio()]);
    expect(createAsync).toHaveBeenCalledTimes(1);
  });

  it("handles a created sound object missing replay handle", async () => {
    createAsync.mockResolvedValueOnce({ sound: null } as any);
    const service = await import("../src/application/metronomeAudio");
    await expect(service.playMetronomeTick()).resolves.toBeUndefined();
  });
});
