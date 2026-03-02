import { describe, expect, it } from "vitest";
import { createDrillFromInput } from "../src/domain/exercises/drill";

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
});
