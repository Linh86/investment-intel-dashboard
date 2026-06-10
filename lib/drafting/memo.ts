import { z } from "zod";
import { riskBandLabel, type AssessmentResult } from "../scoring/score";

// Deterministic DEMO_MODE memo writer. Citations are structured data
// (signalIds per statement), not markers parsed out of prose — claim
// extraction on approval reads them directly.
export const MEMO_MODEL = "demo-rules (DEMO_MODE)";
export const MEMO_PROMPT_VERSION = "memo-rules.v0";

const citedStatementSchema = z.object({
  text: z.string().min(1),
  signalIds: z.array(z.string()).min(1),
});

export const memoContentSchema = z.object({
  ticker: z.string(),
  thesis: z.string(),
  keyChanges: z.array(citedStatementSchema).min(1),
  scenarios: z.object({
    bull: z.string(),
    base: z.string(),
    bear: z.string(),
  }),
  catalysts: z.array(citedStatementSchema),
  risks: z.array(citedStatementSchema).min(1),
  icQuestions: z.array(z.string()).min(1),
  whatWouldChangeOurMind: z.array(z.string()).min(1),
});

export type MemoContent = z.infer<typeof memoContentSchema>;
export type CitedStatement = z.infer<typeof citedStatementSchema>;

const DIMENSION_LABELS: Record<string, string> = {
  market: "Market",
  execution: "Execution",
  regulatory: "Regulatory/geopolitical",
  "supply-chain": "Supply-chain",
  financial: "Financial",
};

export function draftMemo(input: {
  company: { ticker: string; name: string; watchReason: string };
  assessment: AssessmentResult;
}): MemoContent {
  const { company, assessment } = input;
  const moved = assessment.subscores
    .flatMap((subscore) =>
      subscore.evidence
        .filter((evidence) => evidence.delta !== 0)
        .map((evidence) => ({ ...evidence, dimension: subscore.dimension })),
    )
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const driver = [...assessment.subscores].sort(
    (a, b) => Math.abs(b.score - b.baseline) - Math.abs(a.score - a.baseline),
  )[0];
  const driverLabel = DIMENSION_LABELS[driver.dimension] ?? driver.dimension;
  const driverSignal = driver.evidence[0];

  const keyChanges: CitedStatement[] = moved.slice(0, 4).map((evidence) => ({
    text: `${DIMENSION_LABELS[evidence.dimension] ?? evidence.dimension} risk ${
      evidence.delta > 0 ? "rose" : "eased"
    } ${Math.abs(evidence.delta)} points on: "${evidence.quote}"`,
    signalIds: [evidence.signalId],
  }));

  const elevated = assessment.subscores
    .filter(
      (subscore) => subscore.score >= 50 || subscore.score > subscore.baseline,
    )
    .sort((a, b) => b.score - a.score);
  const risks: CitedStatement[] = elevated.slice(0, 3).map((subscore) => ({
    text: `${DIMENSION_LABELS[subscore.dimension] ?? subscore.dimension} subscore at ${subscore.score}/100 (from ${subscore.baseline}). ${subscore.rationale}`,
    signalIds:
      subscore.evidence.length > 0
        ? subscore.evidence.map((evidence) => evidence.signalId)
        : driverSignal
          ? [driverSignal.signalId]
          : [],
  }));

  return memoContentSchema.parse({
    ticker: company.ticker,
    thesis: `${company.name} (${company.ticker}) stays on the watchlist: ${company.watchReason} Composite risk moved ${assessment.previous} → ${assessment.composite} (${riskBandLabel(assessment.composite)}) this run, driven primarily by ${driverLabel.toLowerCase()} developments.`,
    keyChanges,
    scenarios: {
      bull: `${driverLabel} pressure resolves without material operational impact; demand-side signals stay intact and the composite drifts back toward the ${assessment.previous} baseline.`,
      base: `The composite holds near ${assessment.composite} while ${driverLabel.toLowerCase()} developments play out; monitoring continues at the current cadence.`,
      bear: `${driverLabel} risk escalates (subscore ${driver.score}/100 and rising); the composite breaks above ${Math.min(assessment.composite + 10, 100)} and position review is warranted.`,
    },
    catalysts: moved.slice(0, 2).map((evidence) => ({
      text: `Resolution or escalation of: "${evidence.quote}"`,
      signalIds: [evidence.signalId],
    })),
    risks,
    icQuestions: [
      `What is our effective exposure if ${driverSignal ? `the development behind ${driverSignal.signalId}` : "the primary driver"} proceeds as currently drafted?`,
      `Does current position sizing reflect a composite of ${assessment.composite} (${riskBandLabel(assessment.composite)})?`,
    ],
    whatWouldChangeOurMind: [
      `${driverLabel} subscore back below ${Math.min(driver.baseline + 10, 100)} for two consecutive runs.`,
      driverSignal
        ? `The development behind ${driverSignal.signalId} resolves without scope expansion.`
        : "No new adverse evidence across two consecutive runs.",
    ],
  });
}
