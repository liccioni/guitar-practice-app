import { describe, expect, it } from "vitest";
import { createDrillFromInput, updateDrillFromInput } from "../src/domain/exercises/drill";

describe("drill validation", () => {
  it("rejects invalid duration and bpm", () => {
    expect(() =>
      createDrillFromInput(
        "d1",
        { name: "", durationMinutes: 0, targetBpm: 300, tags: ["technique"] },
        "2026-03-02T00:00:00.000Z",
      ),
    ).toThrowError();
  });

  it("creates a valid drill", () => {
    const drill = createDrillFromInput(
      "d1",
      { name: "Alternate picking", durationMinutes: 10, targetBpm: 110, tags: ["technique"] },
      "2026-03-02T00:00:00.000Z",
    );

    expect(drill.name).toBe("Alternate picking");
    expect(drill.durationSeconds).toBe(600);
    expect(drill.targetBpm).toBe(110);
    expect(drill.tags).toEqual(["technique"]);
  });

  it("rejects out-of-range duration and bpm independently", () => {
    expect(() =>
      createDrillFromInput(
        "d2",
        { name: "Warmup", durationMinutes: 0, targetBpm: 120, tags: [] },
        "2026-03-02T00:00:00.000Z",
      ),
    ).toThrow("Drill duration must be between 1 and 30 minutes");

    expect(() =>
      createDrillFromInput(
        "d3",
        { name: "Warmup", durationMinutes: 5, targetBpm: 300, tags: [] },
        "2026-03-02T00:00:00.000Z",
      ),
    ).toThrow("Drill BPM must be between 40 and 240");
  });

  it("updates only provided fields and normalizes blank description", () => {
    const base = createDrillFromInput(
      "d4",
      {
        name: "Chord work",
        description: " desc ",
        durationMinutes: 8,
        targetBpm: 90,
        tags: ["chords"],
      },
      "2026-03-02T00:00:00.000Z",
    );

    const updated = updateDrillFromInput(
      base,
      { description: "   ", durationMinutes: 10 },
      "2026-03-03T00:00:00.000Z",
    );

    expect(updated.name).toBe(base.name);
    expect(updated.description).toBeUndefined();
    expect(updated.durationSeconds).toBe(600);
    expect(updated.targetBpm).toBe(base.targetBpm);
    expect(updated.tags).toEqual(base.tags);
  });

  it("allows partial updates and explicit bpm/tags replacement", () => {
    const base = createDrillFromInput(
      "d5",
      { name: "Sweep", durationMinutes: 6, targetBpm: 80, tags: ["technique"] },
      "2026-03-02T00:00:00.000Z",
    );

    const updated = updateDrillFromInput(
      base,
      { targetBpm: 140, tags: ["rhythm"] },
      "2026-03-04T00:00:00.000Z",
    );

    expect(updated.name).toBe(base.name);
    expect(updated.durationSeconds).toBe(base.durationSeconds);
    expect(updated.targetBpm).toBe(140);
    expect(updated.tags).toEqual(["rhythm"]);
  });

  it("validates and persists randomizer config", () => {
    const base = createDrillFromInput(
      "d6",
      {
        name: "Random cue drill",
        durationMinutes: 6,
        targetBpm: 100,
        tags: ["technique"],
        randomizer: { kind: "note", everyBars: 2 },
      },
      "2026-03-02T00:00:00.000Z",
    );

    expect(base.randomizer).toEqual({ kind: "note", everyBars: 2 });

    const updated = updateDrillFromInput(
      base,
      { randomizer: { kind: "triad", everyBars: 4 } },
      "2026-03-03T00:00:00.000Z",
    );
    expect(updated.randomizer).toEqual({ kind: "triad", everyBars: 4 });

    expect(() =>
      updateDrillFromInput(base, { randomizer: { kind: "note", everyBars: 0 } }, "2026-03-03T00:00:00.000Z"),
    ).toThrow("Random cue bars must be between 1 and 16");
  });

  it("supports the expanded cue config model", () => {
    const randomPulse = createDrillFromInput(
      "d7",
      {
        name: "Random pulse",
        durationMinutes: 8,
        tags: [],
        cue: { mode: "random-pulse", kind: "triad", everyBars: 3 },
      },
      "2026-03-02T00:00:00.000Z",
    );

    const fixedNote = createDrillFromInput(
      "d8",
      {
        name: "Fixed note",
        durationMinutes: 8,
        tags: [],
        cue: { mode: "fixed-note" },
      },
      "2026-03-02T00:00:00.000Z",
    );

    const circleOfFifths = createDrillFromInput(
      "d9",
      {
        name: "Fifths",
        durationMinutes: 8,
        tags: [],
        cue: { mode: "circle-of-fifths", everyBars: 4 },
      },
      "2026-03-02T00:00:00.000Z",
    );

    expect(randomPulse.cue).toEqual({ mode: "random-pulse", kind: "triad", everyBars: 3 });
    expect(randomPulse.randomizer).toEqual({ kind: "triad", everyBars: 3 });
    expect(fixedNote.cue).toEqual({ mode: "fixed-note" });
    expect(fixedNote.randomizer).toBeUndefined();
    expect(circleOfFifths.cue).toEqual({ mode: "circle-of-fifths", everyBars: 4 });
  });

  it("rejects malformed cue configs", () => {
    expect(() =>
      createDrillFromInput(
        "d10",
        {
          name: "Bad cue",
          durationMinutes: 8,
          tags: [],
          cue: { mode: "random-pulse", kind: "note" },
        },
        "2026-03-02T00:00:00.000Z",
      ),
    ).toThrow("Random pulse cue bars are required");

    expect(() =>
      createDrillFromInput(
        "d11",
        {
          name: "Bad cue",
          durationMinutes: 8,
          tags: [],
          cue: { mode: "circle-of-fourths" },
        },
        "2026-03-02T00:00:00.000Z",
      ),
    ).toThrow("Cue bars are required");
  });
});
