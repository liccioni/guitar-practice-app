import { createDrillFromInput, updateDrillFromInput } from "../domain/exercises/drill";
import type { CreateDrillInput, Drill, UpdateDrillInput } from "../domain/exercises/types";
import type { PracticeHistoryEntry } from "../domain/history/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";
import type { PracticeRepository } from "./PracticeRepository";

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class InMemoryPracticeRepository implements PracticeRepository {
  private readonly drills = new Map<string, Drill>();
  private readonly templates = new Map<string, SessionTemplate>();
  private readonly history: PracticeHistoryEntry[] = [];

  createDrill(input: CreateDrillInput): Drill {
    const nowIso = new Date().toISOString();
    const drill = createDrillFromInput(makeId("drill"), input, nowIso);
    this.drills.set(drill.id, drill);
    return drill;
  }

  updateDrill(id: string, input: UpdateDrillInput): Drill {
    const existing = this.drills.get(id);
    if (!existing) throw new Error("Drill not found");

    const updated = updateDrillFromInput(existing, input, new Date().toISOString());
    this.drills.set(updated.id, updated);
    return updated;
  }

  deleteDrill(id: string): void {
    this.drills.delete(id);

    for (const [templateId, template] of this.templates.entries()) {
      if (!template.drillIds.includes(id)) continue;

      const nextDrillIds = template.drillIds.filter((drillId) => drillId !== id);
      const nextTotalDurationSeconds = nextDrillIds.reduce((sum, drillId) => {
        const drill = this.drills.get(drillId);
        return sum + (drill?.durationSeconds ?? 0);
      }, 0);

      this.templates.set(templateId, {
        ...template,
        drillIds: nextDrillIds,
        totalDurationSeconds: nextTotalDurationSeconds,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  getDrillById(id: string): Drill | undefined {
    return this.drills.get(id);
  }

  listDrills(): Drill[] {
    return Array.from(this.drills.values());
  }

  saveSessionTemplate(template: SessionTemplate): void {
    this.templates.set(template.id, template);
  }

  updateSessionTemplate(template: SessionTemplate): void {
    if (!this.templates.has(template.id)) throw new Error("Template not found");
    this.templates.set(template.id, template);
  }

  deleteSessionTemplate(id: string): void {
    this.templates.delete(id);
  }

  getSessionTemplateById(id: string): SessionTemplate | undefined {
    return this.templates.get(id);
  }

  listSessionTemplates(): SessionTemplate[] {
    return Array.from(this.templates.values());
  }

  saveHistory(entry: PracticeHistoryEntry): void {
    this.history.unshift(entry);
  }

  listHistory(): PracticeHistoryEntry[] {
    return [...this.history];
  }

  exportState(): {
    drills: Drill[];
    templates: SessionTemplate[];
    history: PracticeHistoryEntry[];
  } {
    return {
      drills: this.listDrills(),
      templates: this.listSessionTemplates(),
      history: this.listHistory(),
    };
  }

  importState(state: {
    drills: Drill[];
    templates: SessionTemplate[];
    history: PracticeHistoryEntry[];
  }): void {
    this.drills.clear();
    this.templates.clear();
    this.history.splice(0, this.history.length);

    for (const drill of state.drills) this.drills.set(drill.id, drill);
    for (const template of state.templates) this.templates.set(template.id, template);
    this.history.push(...state.history);
  }
}
