import { describe, expect, it } from "vitest";
import {
  clampBpm,
  getBeatIntervalMs,
  MAX_BPM,
  MIN_BPM,
  stepBpm,
} from "../src/domain/metronome/metronome";

describe("metronome bpm rules", () => {
  it("clamps bpm into 40-240", () => {
    expect(clampBpm(10)).toBe(MIN_BPM);
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(400)).toBe(MAX_BPM);
  });

  it("steps bpm within bounds", () => {
    expect(stepBpm(100, 5)).toBe(105);
    expect(stepBpm(40, -10)).toBe(40);
    expect(stepBpm(240, 10)).toBe(240);
  });

  it("derives beat interval from bpm", () => {
    expect(getBeatIntervalMs(60)).toBe(1000);
    expect(getBeatIntervalMs(120)).toBe(500);
  });
});
