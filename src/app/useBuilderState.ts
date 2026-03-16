import { useEffect, useMemo, useState } from "react";
import { appendDrillToTemplate } from "../application/sessionBuilder";
import { createDrillFromInput, updateDrillFromInput } from "../domain/exercises/drill";
import type { CreateDrillInput, Drill, DrillRandomizerKind } from "../domain/exercises/types";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
  type SessionTemplate,
} from "../domain/sessions/sessionTemplate";
import { DRILL_POOL, makeId } from "./practiceAppStateHelpers";
import type { Screen } from "./usePracticeAppState";

interface UseBuilderStateInput {
  activeTemplateId: string | null;
  allDrills: Drill[];
  setAllDrills: React.Dispatch<React.SetStateAction<Drill[]>>;
  setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  templates: SessionTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<SessionTemplate[]>>;
}

interface AddSongInput {
  title: string;
  artist: string;
  durationMinutes: number;
  targetBpm: number;
  tags: CreateDrillInput["tags"];
}

function pickRandomPoolDrill(): CreateDrillInput {
  return DRILL_POOL[Math.floor(Math.random() * DRILL_POOL.length)];
}

function buildDefaultDrillInput(index: number): CreateDrillInput {
  return {
    name: `New Drill ${index}`,
    durationMinutes: 5,
    targetBpm: 100,
    tags: ["warmup"],
  };
}

export function useBuilderState({
  activeTemplateId,
  allDrills,
  setAllDrills,
  setActiveTemplateId,
  setScreen,
  templates,
  setTemplates,
}: UseBuilderStateInput) {
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [drillNameInput, setDrillNameInput] = useState("");
  const [drillDurationInput, setDrillDurationInput] = useState("");
  const [drillBpmInput, setDrillBpmInput] = useState("");
  const [drillRandomizerKindInput, setDrillRandomizerKindInput] = useState<"none" | DrillRandomizerKind>("none");
  const [drillRandomEveryBarsInput, setDrillRandomEveryBarsInput] = useState("2");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId) ?? templates[0],
    [activeTemplateId, templates],
  );

  const builderDrills = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.drillIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill));
  }, [allDrills, selectedTemplate]);

  const selectedBuilderDrill = useMemo(
    () => builderDrills.find((drill) => drill.id === selectedDrillId) ?? builderDrills[0],
    [builderDrills, selectedDrillId],
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateNameInput(selectedTemplate.name);
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const exists = selectedTemplate.drillIds.includes(selectedDrillId ?? "");
    if (!exists) {
      setSelectedDrillId(selectedTemplate.drillIds[0] ?? null);
    }
  }, [selectedDrillId, selectedTemplate]);

  useEffect(() => {
    if (!selectedBuilderDrill) {
      setDrillNameInput("");
      setDrillDurationInput("");
      setDrillBpmInput("");
      setDrillRandomizerKindInput("none");
      setDrillRandomEveryBarsInput("2");
      return;
    }
    setDrillNameInput(selectedBuilderDrill.name);
    setDrillDurationInput(String(Math.max(1, Math.round(selectedBuilderDrill.durationSeconds / 60))));
    setDrillBpmInput(selectedBuilderDrill.targetBpm ? String(selectedBuilderDrill.targetBpm) : "");
    setDrillRandomizerKindInput(selectedBuilderDrill.randomizer?.kind ?? "none");
    setDrillRandomEveryBarsInput(String(selectedBuilderDrill.randomizer?.everyBars ?? 2));
  }, [selectedBuilderDrill]);

  function addSongToBuilder(song: AddSongInput): void {
    try {
      const nowIso = new Date().toISOString();
      const created = createDrillFromInput(
        makeId("drill"),
        {
          name: `${song.title} (${song.artist})`,
          durationMinutes: song.durationMinutes,
          targetBpm: song.targetBpm,
          tags: song.tags,
        },
        nowIso,
      );
      const result = appendDrillToTemplate({
        templates,
        activeTemplateId: activeTemplateId ?? null,
        drill: created,
        nowIso,
      });

      setAllDrills((current) => [...current, created]);
      setTemplates(result.templates);
      setActiveTemplateId(result.targetTemplateId);
      setSelectedDrillId(created.id);
      setBuilderError(null);
      setScreen("builder");
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not add song drill");
      setScreen("builder");
    }
  }

  function addDrillToTemplate(): void {
    try {
      const nowIso = new Date().toISOString();
      const nextIndex = builderDrills.length + 1;
      const created = createDrillFromInput(makeId("drill"), buildDefaultDrillInput(nextIndex), nowIso);
      const result = appendDrillToTemplate({
        templates,
        activeTemplateId: activeTemplateId ?? null,
        drill: created,
        nowIso,
      });

      setAllDrills((current) => [...current, created]);
      setTemplates(result.templates);
      setActiveTemplateId(result.targetTemplateId);
      setSelectedDrillId(created.id);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not add drill");
    }
  }

  function reorderDrillsInTemplate(nextDrillIds: string[]): void {
    if (!selectedTemplate) return;

    const normalizedIds = nextDrillIds.filter((id) => selectedTemplate.drillIds.includes(id));
    const reorderedDrills = normalizedIds
      .map((id) => allDrills.find((drill) => drill.id === id))
      .filter((drill): drill is Drill => Boolean(drill));

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              drillIds: normalizedIds,
              totalDurationSeconds: calculateTotalDurationSeconds(reorderedDrills),
              updatedAt: new Date().toISOString(),
            }
          : template,
      ),
    );
    setBuilderError(null);
  }

  function removeDrillFromTemplate(drillId: string): void {
    if (!selectedTemplate) return;

    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;
        const nextDrillIds = template.drillIds.filter((id) => id !== drillId);
        const nextDrills = nextDrillIds
          .map((id) => allDrills.find((drill) => drill.id === id))
          .filter((drill): drill is Drill => Boolean(drill));

        return {
          ...template,
          drillIds: nextDrillIds,
          totalDurationSeconds: calculateTotalDurationSeconds(nextDrills),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    if (selectedDrillId === drillId) {
      const nextId = selectedTemplate.drillIds.find((id) => id !== drillId) ?? null;
      setSelectedDrillId(nextId);
    }
  }

  function createTemplate(): void {
    try {
      const now = new Date().toISOString();
      const createdDrills: Drill[] = [createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now)];

      while (calculateTotalDurationSeconds(createdDrills) < 5 * 60) {
        createdDrills.push(createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now));
      }

      const template = createSessionTemplate({
        id: makeId("template"),
        name: `Session ${templates.length + 1}`,
        drillIds: createdDrills.map((drill) => drill.id),
        totalDurationSeconds: calculateTotalDurationSeconds(createdDrills),
        nowIso: now,
      });

      setAllDrills((current) => [...current, ...createdDrills]);
      setTemplates((current) => [...current, template]);
      setActiveTemplateId(template.id);
      setTemplateNameInput(template.name);
      setSelectedDrillId(createdDrills[0]?.id ?? null);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not create template");
    }
  }

  function duplicateTemplate(): void {
    if (!selectedTemplate) return;
    try {
      const now = new Date().toISOString();
      const duplicated = createSessionTemplate({
        id: makeId("template"),
        name: `${selectedTemplate.name} Copy`,
        drillIds: [...selectedTemplate.drillIds],
        totalDurationSeconds: selectedTemplate.totalDurationSeconds,
        isPreset: false,
        nowIso: now,
      });

      setTemplates((current) => [...current, duplicated]);
      setActiveTemplateId(duplicated.id);
      setTemplateNameInput(duplicated.name);
      setSelectedDrillId(duplicated.drillIds[0] ?? null);
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not duplicate template");
    }
  }

  function saveTemplate(): void {
    if (!selectedTemplate) return;

    try {
      const now = new Date().toISOString();
      const selectedDrills = selectedTemplate.drillIds
        .map((id) => allDrills.find((drill) => drill.id === id))
        .filter((drill): drill is Drill => Boolean(drill));

      const validated = createSessionTemplate({
        id: selectedTemplate.id,
        name: templateNameInput,
        drillIds: selectedTemplate.drillIds,
        totalDurationSeconds: calculateTotalDurationSeconds(selectedDrills),
        isPreset: selectedTemplate.isPreset,
        nowIso: now,
      });

      setTemplates((current) =>
        current.map((template) =>
          template.id === selectedTemplate.id
            ? {
                ...validated,
                createdAt: template.createdAt,
                updatedAt: now,
              }
            : template,
        ),
      );

      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save template");
    }
  }

  function deleteTemplate(): void {
    if (!selectedTemplate) return;

    const remaining = templates.filter((template) => template.id !== selectedTemplate.id);
    setTemplates(remaining);
    setActiveTemplateId(remaining[0]?.id ?? null);
    setTemplateNameInput(remaining[0]?.name ?? "");
    setSelectedDrillId(remaining[0]?.drillIds[0] ?? null);
    setBuilderError(null);
  }

  function maybeAutoSaveDrillEdits(input: {
    name: string;
    duration: string;
    bpm: string;
    randomKind: "none" | DrillRandomizerKind;
    randomBars: string;
  }): void {
    if (!selectedBuilderDrill || !selectedTemplate) return;

    const durationMinutes = Number(input.duration.trim());
    const bpmRaw = input.bpm.trim();
    const randomBarsRaw = input.randomBars.trim();
    const parsedBpm = bpmRaw.length === 0 ? null : Number(bpmRaw);
    const parsedEveryBars = Number(randomBarsRaw);

    const hasValidName = input.name.trim().length > 0;
    const hasValidDuration = Number.isFinite(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 30;
    const hasValidBpm = parsedBpm === null || (Number.isFinite(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 240);
    const hasValidRandomBars =
      input.randomKind === "none" ||
      (Number.isFinite(parsedEveryBars) && parsedEveryBars >= 1 && parsedEveryBars <= 16);
    if (!hasValidName || !hasValidDuration || !hasValidBpm || !hasValidRandomBars) return;

    const randomizer =
      input.randomKind === "none"
        ? undefined
        : {
            kind: input.randomKind,
            everyBars: parsedEveryBars,
          };
    const nextBpm = parsedBpm === null ? undefined : parsedBpm;

    if (
      selectedBuilderDrill.name === input.name &&
      Math.round(selectedBuilderDrill.durationSeconds / 60) === durationMinutes &&
      selectedBuilderDrill.targetBpm === nextBpm &&
      selectedBuilderDrill.randomizer?.kind === randomizer?.kind &&
      selectedBuilderDrill.randomizer?.everyBars === randomizer?.everyBars
    ) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const updated = updateDrillFromInput(
        selectedBuilderDrill,
        {
          name: input.name,
          durationMinutes,
          targetBpm: nextBpm,
          randomizer,
        },
        nowIso,
      );

      setAllDrills((current) => current.map((drill) => (drill.id === selectedBuilderDrill.id ? updated : drill)));
      setTemplates((current) =>
        current.map((template) => {
          if (template.id !== selectedTemplate.id) return template;
          const nextDrills = template.drillIds
            .map((id) => (id === updated.id ? updated : allDrills.find((drill) => drill.id === id)))
            .filter((drill): drill is Drill => Boolean(drill));

          return {
            ...template,
            totalDurationSeconds: calculateTotalDurationSeconds(nextDrills),
            updatedAt: nowIso,
          };
        }),
      );
      setBuilderError(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not update drill");
    }
  }

  function handleDrillNameInput(value: string): void {
    setDrillNameInput(value);
    maybeAutoSaveDrillEdits({
      name: value,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillDurationInput(value: string): void {
    setDrillDurationInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: value,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillBpmInput(value: string): void {
    setDrillBpmInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: value,
      randomKind: drillRandomizerKindInput,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillRandomizerKindInput(value: "none" | DrillRandomizerKind): void {
    setDrillRandomizerKindInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: value,
      randomBars: drillRandomEveryBarsInput,
    });
  }

  function handleDrillRandomEveryBarsInput(value: string): void {
    setDrillRandomEveryBarsInput(value);
    maybeAutoSaveDrillEdits({
      name: drillNameInput,
      duration: drillDurationInput,
      bpm: drillBpmInput,
      randomKind: drillRandomizerKindInput,
      randomBars: value,
    });
  }

  function applySuggestedSession(params: {
    sessionName: string;
    suggestedInputs: CreateDrillInput[];
    destinationScreen?: "builder" | "overview";
  }): void {
    const now = new Date().toISOString();
    const createdDrills = params.suggestedInputs.map((input) =>
      createDrillFromInput(makeId("drill"), input, now),
    );

    while (calculateTotalDurationSeconds(createdDrills) < 5 * 60) {
      createdDrills.push(createDrillFromInput(makeId("drill"), pickRandomPoolDrill(), now));
    }

    const template = createSessionTemplate({
      id: makeId("template"),
      name: params.sessionName,
      drillIds: createdDrills.map((drill) => drill.id),
      totalDurationSeconds: calculateTotalDurationSeconds(createdDrills),
      nowIso: now,
    });

    setAllDrills((current) => [...current, ...createdDrills]);
    setTemplates((current) => [...current, template]);
    setActiveTemplateId(template.id);
    setTemplateNameInput(template.name);
    setSelectedDrillId(createdDrills[0]?.id ?? null);
    setBuilderError(null);
    setScreen(params.destinationScreen ?? "builder");
  }

  return {
    addDrillToTemplate,
    addSongToBuilder,
    applySuggestedSession,
    builderDrills,
    builderError,
    createTemplate,
    deleteTemplate,
    drillBpmInput,
    drillDurationInput,
    drillNameInput,
    drillRandomEveryBarsInput,
    drillRandomizerKindInput,
    duplicateTemplate,
    handleDrillBpmInput,
    handleDrillDurationInput,
    handleDrillNameInput,
    handleDrillRandomEveryBarsInput,
    handleDrillRandomizerKindInput,
    removeDrillFromTemplate,
    reorderDrillsInTemplate,
    saveTemplate,
    selectedBuilderDrill,
    selectedDrillId,
    selectedTemplate,
    setBuilderError,
    setSelectedDrillId,
    setTemplateNameInput,
    templateNameInput,
  };
}
