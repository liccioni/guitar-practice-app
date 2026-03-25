import { describe, expect, it } from "vitest";
import { buildBeatPulseCopy, buildFocusAidCopy } from "../src/app/practiceAids";

describe("practiceAids", () => {
  it("describes focused view in plain language", () => {
    expect(buildFocusAidCopy(true)).toEqual({
      title: "Focus view",
      description: "Keeps the current drill and timer front and center so you can stay on the rep.",
      statusLabel: "Focused",
    });
  });

  it("describes full layout mode in plain language", () => {
    expect(buildFocusAidCopy(false)).toEqual({
      title: "Focus view",
      description: "Shows the full practice layout when you want more context around the current rep.",
      statusLabel: "Full layout",
    });
  });

  it("describes beat pulse when synced to the click", () => {
    expect(buildBeatPulseCopy(true, true)).toEqual({
      title: "Beat pulse",
      description: "The visual pulse lands with each click so your eyes and ears lock onto the same beat.",
      statusLabel: "Click synced",
    });
  });

  it("describes beat pulse when it runs free", () => {
    expect(buildBeatPulseCopy(false, true)).toEqual({
      title: "Beat pulse",
      description: "The visual pulse keeps moving independently, which can feel looser for silent counting.",
      statusLabel: "Free pulse",
    });
  });

  it("describes beat pulse when the metronome is muted", () => {
    expect(buildBeatPulseCopy(true, false)).toEqual({
      title: "Beat pulse",
      description: "The visual pulse is ready to sync up again as soon as you turn the click back on.",
      statusLabel: "Sync ready",
    });
  });
});
