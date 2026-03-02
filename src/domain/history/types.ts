export interface DrillSnapshot {
  id: string;
  name: string;
  durationSeconds: number;
  targetBpm?: number;
}

export interface PracticeHistoryEntry {
  id: string;
  sessionTemplateId?: string;
  sessionNameSnapshot: string;
  drillsSnapshot: DrillSnapshot[];
  completedDrillIds: string[];
  startedAt: string;
  endedAt?: string;
  durationCompletedSeconds: number;
  completed: boolean;
}
