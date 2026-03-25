export function buildFocusAidCopy(focusModeEnabled: boolean) {
  return focusModeEnabled
    ? {
        title: "Focus view",
        description: "Keeps the current drill and timer front and center so you can stay on the rep.",
        statusLabel: "Focused",
      }
    : {
        title: "Focus view",
        description: "Shows the full practice layout when you want more context around the current rep.",
        statusLabel: "Full layout",
      };
}

export function buildBeatPulseCopy(beatPulseLocked: boolean, metronomeEnabled: boolean) {
  if (metronomeEnabled && beatPulseLocked) {
    return {
      title: "Beat pulse",
      description: "The visual pulse lands with each click so your eyes and ears lock onto the same beat.",
      statusLabel: "Click synced",
    };
  }

  if (metronomeEnabled) {
    return {
      title: "Beat pulse",
      description: "The visual pulse keeps moving independently, which can feel looser for silent counting.",
      statusLabel: "Free pulse",
    };
  }

  return {
    title: "Beat pulse",
    description: beatPulseLocked
      ? "The visual pulse is ready to sync up again as soon as you turn the click back on."
      : "The visual pulse stays free-running while you rehearse without the click.",
    statusLabel: beatPulseLocked ? "Sync ready" : "Free pulse",
  };
}
