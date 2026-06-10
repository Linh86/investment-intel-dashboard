export type Sector = "Semiconductors" | "AI Infrastructure" | "Energy";

export interface Company {
  ticker: string;
  name: string;
  sector: Sector;
  subSector: string;
  country: string;
  watchReason: string;
  /** Seeded rubric placeholder (0-100). Live scoring with provenance lands in M2. */
  baselineRisk: number;
  addedAt: string;
}

export type SignalType =
  | "news"
  | "filing"
  | "regulatory"
  | "analyst"
  | "supply-chain";
export type Urgency = "high" | "medium" | "low";
export type Relevance = "high" | "medium" | "low";

export interface Signal {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  type: SignalType;
  urgency: Urgency;
  relevance: Relevance;
  source: { name: string; url: string };
  publishedAt: string;
}

export type RunTrigger = "manual" | "cron" | "webhook";
export type RunStatus = "completed" | "failed" | "running";

export interface RunRecord {
  id: string;
  trigger: RunTrigger;
  kind: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string;
  signalsIngested: number;
  companiesTouched: number;
  model: string;
  promptVersion: string;
  costUsd: number;
  note: string;
}
