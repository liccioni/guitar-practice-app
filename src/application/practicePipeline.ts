import type { Drill } from "../domain/exercises/types";
import type { DrillSnapshot, PracticeHistoryEntry } from "../domain/history/types";
import {
  calculateTotalDurationSeconds,
  createSessionTemplate,
  type SessionTemplate,
} from "../domain/sessions/sessionTemplate";
import type { PracticeRepository } from "../persistence/PracticeRepository";

interface ActiveSession {
  entry: PracticeHistoryEntry;
  template: SessionTemplate;
}

export class PracticePipeline {
  private activeSession: ActiveSession | null = null;

  constructor(private readonly repository: PracticeRepository) {}

  createSessionTemplateFromDrills(input: {
    id: string;
    name: string;
    drills: Drill[];
    isPreset?: boolean;
    nowIso?: string;
  }): SessionTemplate {
    const nowIso = input.nowIso ?? new Date().toISOString();
    const template = createSessionTemplate({
      id: input.id,
      name: input.name,
      drillIds: input.drills.map((drill) => drill.id),
      totalDurationSeconds: calculateTotalDurationSeconds(input.drills),
      isPreset: input.isPreset,
      nowIso,
    });

    this.repository.saveSessionTemplate(template);
    return template;
  }

  updateSessionTemplateFromDrills(input: {
    id: string;
    name: string;
    drills: Drill[];
    isPreset?: boolean;
    nowIso?: string;
  }): SessionTemplate {
    const existing = this.repository.getSessionTemplateById(input.id);
    if (!existing) throw new Error("Template not found");

    const nowIso = input.nowIso ?? new Date().toISOString();
    const updated: SessionTemplate = {
      ...existing,
      ...createSessionTemplate({
        id: input.id,
        name: input.name,
        drillIds: input.drills.map((drill) => drill.id),
        totalDurationSeconds: calculateTotalDurationSeconds(input.drills),
        isPreset: input.isPreset ?? existing.isPreset,
        nowIso,
      }),
      createdAt: existing.createdAt,
      updatedAt: nowIso,
    };

    this.repository.updateSessionTemplate(updated);
    return updated;
  }

  deleteSessionTemplate(id: string): void {
    this.repository.deleteSessionTemplate(id);
  }

  startSession(templateId: string, nowIso: string = new Date().toISOString()): void {
    const template = this.repository.getSessionTemplateById(templateId);
    if (!template) throw new Error("Template not found");

    const drills = this.repository
      .listDrills()
      .filter((drill) => template.drillIds.includes(drill.id));

    const entry: PracticeHistoryEntry = {
      id: `history_${nowIso}`,
      sessionTemplateId: template.id,
      sessionNameSnapshot: template.name,
      drillsSnapshot: drills.map(toDrillSnapshot),
      completedDrillIds: [],
      startedAt: nowIso,
      durationCompletedSeconds: 0,
      completed: false,
    };

    this.activeSession = { entry, template };
  }

  markDrillComplete(drillId: string): void {
    if (!this.activeSession) throw new Error("No active session");

    const drill = this.activeSession.entry.drillsSnapshot.find((item) => item.id === drillId);
    if (!drill) throw new Error("Drill not found in active session");

    if (!this.activeSession.entry.completedDrillIds.includes(drillId)) {
      this.activeSession.entry.completedDrillIds.push(drillId);
      this.activeSession.entry.durationCompletedSeconds += drill.durationSeconds;
    }
  }

  finishSession(nowIso: string = new Date().toISOString()): PracticeHistoryEntry {
    if (!this.activeSession) throw new Error("No active session");

    const entry = this.activeSession.entry;
    entry.endedAt = nowIso;
    entry.completed =
      entry.completedDrillIds.length === this.activeSession.template.drillIds.length;

    this.repository.saveHistory(entry);
    this.activeSession = null;
    return entry;
  }
}

function toDrillSnapshot(drill: Drill): DrillSnapshot {
  return {
    id: drill.id,
    name: drill.name,
    durationSeconds: drill.durationSeconds,
    targetBpm: drill.targetBpm,
  };
}
