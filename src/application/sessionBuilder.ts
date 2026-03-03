import type { Drill } from "../domain/exercises/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";

export interface AppendDrillResult {
  templates: SessionTemplate[];
  targetTemplateId: string;
}

export interface ReorderDrillResult {
  templates: SessionTemplate[];
}

export function appendDrillToTemplate(input: {
  templates: SessionTemplate[];
  activeTemplateId: string | null;
  drill: Drill;
  nowIso: string;
}): AppendDrillResult {
  const { templates, activeTemplateId, drill, nowIso } = input;
  const targetTemplateId = activeTemplateId ?? templates[0]?.id ?? null;
  if (!targetTemplateId) {
    throw new Error("No session template available. Create a template first.");
  }

  let updated = false;
  const nextTemplates = templates.map((template) => {
    if (template.id !== targetTemplateId) return template;
    updated = true;
    return {
      ...template,
      drillIds: [...template.drillIds, drill.id],
      totalDurationSeconds: Math.max(0, template.totalDurationSeconds) + drill.durationSeconds,
      updatedAt: nowIso,
    };
  });

  if (!updated) {
    throw new Error("Selected template could not be found.");
  }

  return {
    templates: nextTemplates,
    targetTemplateId,
  };
}

export function reorderDrillInTemplate(input: {
  templates: SessionTemplate[];
  activeTemplateId: string | null;
  drillId: string;
  direction: "up" | "down";
  nowIso: string;
}): ReorderDrillResult {
  const { templates, activeTemplateId, drillId, direction, nowIso } = input;
  const targetTemplateId = activeTemplateId ?? templates[0]?.id ?? null;
  if (!targetTemplateId) {
    throw new Error("No session template available. Create a template first.");
  }

  let foundTemplate = false;
  const nextTemplates = templates.map((template) => {
    if (template.id !== targetTemplateId) return template;
    foundTemplate = true;

    const currentIndex = template.drillIds.indexOf(drillId);
    if (currentIndex < 0) return template;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= template.drillIds.length) return template;

    const nextIds = [...template.drillIds];
    const [moved] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, moved);

    return {
      ...template,
      drillIds: nextIds,
      updatedAt: nowIso,
    };
  });

  if (!foundTemplate) {
    throw new Error("Selected template could not be found.");
  }

  return { templates: nextTemplates };
}
