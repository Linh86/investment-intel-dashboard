import type { SignalType, Urgency, Relevance } from "../types";
import { DIMENSIONS, RUBRIC, type Dimension } from "./rubric";

// Deterministic DEMO_MODE risk scorer: severity-weighted keyword rules instead
// of an LLM call. A live LLM implementation lands behind the same shapes; the
// composite is always combined from subscores in plain code, never by a model.
export const RISK_MODEL = "demo-rules (DEMO_MODE)";
export const RISK_PROMPT_VERSION = "risk-rules.v0";

const DIMENSION_BY_TYPE: Record<SignalType, Dimension> = {
  regulatory: "regulatory",
  "supply-chain": "supply-chain",
  filing: "financial",
  analyst: "market",
  news: "execution",
};

const NEGATIVE_KEYWORDS = [
  "export",
  "restriction",
  "licensing requirements",
  "constraint",
  "tight",
  "headline risk",
  "delay",
  "shortfall",
  "investigation",
];

const POSITIVE_KEYWORDS = [
  "record",
  "ahead of schedule",
  "expanded",
  "signs",
  "partner",
  "order",
  "supports",
  "strength",
  "clears",
  "agreement",
];

const URGENCY_SEVERITY: Record<Urgency, number> = { high: 3, medium: 2, low: 1 };
const RELEVANCE_FACTOR: Record<Relevance, number> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};
const DELTA_UNIT = 15;
// Conservative posture: risk-reducing evidence moves scores at half strength —
// a single positive headline should not erase a regulatory shock.
const POSITIVE_DAMPENING = 0.5;

export interface ScoringSignal {
  id: string;
  type: SignalType;
  urgency: Urgency;
  relevance: Relevance;
  confidence: number;
  headline: string;
  snippet: string;
}

export interface SubscoreResult {
  dimension: Dimension;
  baseline: number;
  score: number;
  confidence: number;
  rationale: string;
  evidence: { signalId: string; quote: string; delta: number }[];
}

export interface AssessmentResult {
  composite: number;
  previous: number;
  summary: string;
  subscores: SubscoreResult[];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// +1 raises risk, -1 lowers it, 0 is neutral (monitored, no score change).
function direction(text: string): { sign: number; keyword: string } {
  const lower = text.toLowerCase();
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) return { sign: 1, keyword };
  }
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) return { sign: -1, keyword };
  }
  return { sign: 0, keyword: "" };
}

export function assessCompany(input: {
  baseline: number;
  previousComposite: number | null;
  previousSubscores: Partial<Record<Dimension, number>> | null;
  signals: ScoringSignal[];
}): AssessmentResult {
  const startScores: Record<Dimension, number> = {} as Record<
    Dimension,
    number
  >;
  for (const dimension of DIMENSIONS) {
    startScores[dimension] =
      input.previousSubscores?.[dimension] ?? input.baseline;
  }

  const subscores: SubscoreResult[] = DIMENSIONS.map((dimension) => {
    const baseline = startScores[dimension];
    let score = baseline;
    const evidence: SubscoreResult["evidence"] = [];
    const notes: string[] = [];
    let confidenceSum = 0;

    for (const signal of input.signals) {
      if (DIMENSION_BY_TYPE[signal.type] !== dimension) continue;
      const { sign, keyword } = direction(
        `${signal.headline} ${signal.snippet}`,
      );
      const delta = Math.round(
        sign *
          URGENCY_SEVERITY[signal.urgency] *
          RELEVANCE_FACTOR[signal.relevance] *
          DELTA_UNIT *
          (sign < 0 ? POSITIVE_DAMPENING : 1),
      );
      score += delta;
      confidenceSum += signal.confidence;
      evidence.push({ signalId: signal.id, quote: signal.headline, delta });
      notes.push(
        delta === 0
          ? `${signal.id} noted for monitoring (neutral)`
          : `${delta > 0 ? "+" : ""}${delta} from ${signal.id} (${signal.urgency}-urgency ${signal.type}, "${keyword}")`,
      );
    }

    return {
      dimension,
      baseline,
      score: clamp(score),
      confidence:
        evidence.length > 0 ? confidenceSum / evidence.length : 0.5,
      rationale:
        evidence.length > 0
          ? `Started at ${baseline}; ${notes.join("; ")}.`
          : `No new evidence this run; holding at ${baseline}.`,
      evidence,
    };
  });

  const composite = clamp(
    DIMENSIONS.reduce(
      (sum, dimension) =>
        sum +
        RUBRIC.weights[dimension] *
          (subscores.find((s) => s.dimension === dimension)?.score ?? 0),
      0,
    ),
  );
  const previous = input.previousComposite ?? input.baseline;

  const driver = [...subscores].sort(
    (a, b) => Math.abs(b.score - b.baseline) - Math.abs(a.score - a.baseline),
  )[0];
  const change = composite - previous;
  const summary =
    change === 0
      ? `Composite unchanged at ${composite}.`
      : `${driver.dimension} risk drove the composite from ${previous} to ${composite} (${change > 0 ? "+" : ""}${change}), led by ${
          driver.evidence[0]?.signalId ?? "baseline drift"
        }.`;

  return { composite, previous, summary, subscores };
}
