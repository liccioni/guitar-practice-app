import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const runtimeHookSource = readFileSync(
  resolve(process.cwd(), "src/app/useActivePracticeRuntime.ts"),
  "utf8",
);

describe("useActivePracticeRuntime cue integration", () => {
  it("prefers activeDrill.cue and falls back to activeDrill.randomizer", () => {
    expect(runtimeHookSource).toContain("const cue = activeDrill?.cue ?? activeDrill?.randomizer;");
    expect(runtimeHookSource).toContain("setRandomCueState(createRandomCueState(cue));");
    expect(runtimeHookSource).toContain("const next = advanceRandomCueState(current, cue);");
  });

  it("resets to the empty cue state when no usable cue is present", () => {
    expect(runtimeHookSource).toContain("if (screen !== \"active\" || !cue) {");
    expect(runtimeHookSource).toContain("setRandomCueState(createEmptyRandomCueState());");
  });
});
