import { beforeEach, describe, expect, it, vi } from "vitest";

const speakMock = vi.fn();
const stopMock = vi.fn();
const playMetronomeTickMock = vi.fn();

vi.mock("expo-speech", () => ({
  default: {
    speak: speakMock,
    stop: stopMock,
  },
  speak: speakMock,
  stop: stopMock,
}));

vi.mock("../src/application/metronomeAudio", () => ({
  playMetronomeTick: playMetronomeTickMock,
}));

describe("drillCueAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("does nothing when cue mode is off", async () => {
    const { playDrillTransitionCue } = await import("../src/application/drillCueAudio");
    await playDrillTransitionCue("off", "Scales");

    expect(speakMock).not.toHaveBeenCalled();
    expect(playMetronomeTickMock).not.toHaveBeenCalled();
  });

  it("speaks the next drill in spoken mode", async () => {
    const { playDrillTransitionCue } = await import("../src/application/drillCueAudio");
    await playDrillTransitionCue("spoken", "Scales");

    expect(stopMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledWith(
      "Next drill: Scales",
      expect.objectContaining({ language: "en-US" }),
    );
  });

  it("plays a two-hit chime in chime mode", async () => {
    vi.useFakeTimers();
    const { playDrillTransitionCue } = await import("../src/application/drillCueAudio");

    await playDrillTransitionCue("chime", "Scales");
    expect(playMetronomeTickMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(180);
    expect(playMetronomeTickMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the chime when spoken cueing fails", async () => {
    vi.useFakeTimers();
    speakMock.mockImplementationOnce(() => {
      throw new Error("speech failed");
    });

    const { playDrillTransitionCue } = await import("../src/application/drillCueAudio");
    await playDrillTransitionCue("spoken", "Scales");

    expect(playMetronomeTickMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(180);
    expect(playMetronomeTickMock).toHaveBeenCalledTimes(2);
  });
});
