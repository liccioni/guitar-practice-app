import type { CreateDrillInput, Drill, UpdateDrillInput } from "../domain/exercises/types";
import type { PracticeHistoryEntry } from "../domain/history/types";
import type { SessionTemplate } from "../domain/sessions/sessionTemplate";

export interface PracticeRepository {
  createDrill(input: CreateDrillInput): Drill;
  updateDrill(id: string, input: UpdateDrillInput): Drill;
  deleteDrill(id: string): void;
  getDrillById(id: string): Drill | undefined;
  listDrills(): Drill[];

  saveSessionTemplate(template: SessionTemplate): void;
  updateSessionTemplate(template: SessionTemplate): void;
  deleteSessionTemplate(id: string): void;
  getSessionTemplateById(id: string): SessionTemplate | undefined;
  listSessionTemplates(): SessionTemplate[];

  saveHistory(entry: PracticeHistoryEntry): void;
  listHistory(): PracticeHistoryEntry[];
}
