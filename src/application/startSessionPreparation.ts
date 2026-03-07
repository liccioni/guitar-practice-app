import { isValidBpm } from "../domain/metronome/metronome";
import type { Drill } from "../domain/exercises/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";

export type StartSessionPreparationResult =
  | {
      ok: true;
      resolvedDrills: Drill[];
      nextMetronomeBpm: number;
    }
  | {
      ok: false;
      error: string;
    };

function isValidRuntimeDrill(drill: Drill): boolean {
  return drill.name.trim().length > 0 && Number.isFinite(drill.durationSeconds) && drill.durationSeconds > 0;
}

export function prepareSessionStart(input: {
  selectedTemplate: SessionTemplate | null;
  allDrills: Drill[];
  currentMetronomeBpm: number;
}): StartSessionPreparationResult {
  const { selectedTemplate, allDrills, currentMetronomeBpm } = input;

  if (!selectedTemplate) {
    return { ok: false, error: "No session template available. Create a template first." };
  }

  const resolvedDrills = selectedTemplate.drillIds.reduce<Drill[]>((acc, id) => {
    const drill = allDrills.find((item) => item.id === id);
    if (drill && isValidRuntimeDrill(drill)) {
      acc.push(drill);
    }
    return acc;
  }, []);

  if (resolvedDrills.length === 0) {
    return {
      ok: false,
      error: "Selected template has no valid drills. Edit drills and try again.",
    };
  }

  const firstDrillBpm = resolvedDrills[0].targetBpm;
  const nextMetronomeBpm =
    firstDrillBpm !== undefined && isValidBpm(firstDrillBpm) ? firstDrillBpm : currentMetronomeBpm;

  return {
    ok: true,
    resolvedDrills,
    nextMetronomeBpm,
  };
}
