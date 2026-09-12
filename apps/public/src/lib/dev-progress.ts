export interface StatusCounts {
  total: number;
  completed: number;
  review: number;
  inProgress: number;
  blocked: number;
  prepared: number;
  notStarted: number;
  strictCompletionPercent: number;
}

export interface PhaseProgress extends StatusCounts {
  id: string;
  name: string;
}

export interface DevProgressSnapshot extends StatusCounts {
  source: string;
  sourceDatabase: string;
  generatedAt: string;
  phases: PhaseProgress[];
}
