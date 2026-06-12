import { z } from "zod";
import { completeJson } from "./claude";

// One live Claude call that does what triage + the risk analyst do on the
// canned pipeline, but on a headline the user just typed.
export const tryAnalysisSchema = z.object({
  ticker: z.string().nullable(),
  onWatchlist: z.boolean(),
  type: z
    .enum(["news", "filing", "regulatory", "analyst", "supply-chain"])
    .nullable(),
  urgency: z.enum(["high", "medium", "low"]).nullable(),
  relevance: z.enum(["high", "medium", "low"]).nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  riskDirection: z.enum(["up", "down", "flat"]),
  riskRationale: z.string(),
  analystNote: z.string(),
});

export type TryAnalysis = z.infer<typeof tryAnalysisSchema>;

export async function analyzeHeadline(input: {
  headline: string;
  detail?: string;
  companies: { ticker: string; name: string }[];
}): Promise<TryAnalysis> {
  const roster = input.companies
    .map((c) => `${c.ticker} (${c.name})`)
    .join(", ");
  const prompt = `You are the triage and risk analyst in an investment research pipeline for a fund focused on AI infrastructure, energy, and semiconductors.

Watchlist: ${roster}.

Classify and assess this public headline. If it concerns one of the watchlist companies, set ticker to that symbol and onWatchlist true. If it is relevant to the sectors but about a non-watchlist company, set ticker to your best symbol guess (or a short name) and onWatchlist false. If it is off-topic, set ticker null, onWatchlist false, and type/urgency/relevance null.

Headline: "${input.headline}"${input.detail ? `\nContext: "${input.detail}"` : ""}

Return strict JSON only, no prose, no markdown, exactly this shape:
{"ticker": <symbol or null>, "onWatchlist": <bool>, "type": "news|filing|regulatory|analyst|supply-chain" or null, "urgency": "high|medium|low" or null, "relevance": "high|medium|low" or null, "confidence": <0..1>, "rationale": "<one sentence on the classification>", "riskDirection": "up|down|flat", "riskRationale": "<one sentence: does this raise, lower, or not move the company's risk, and why>", "analystNote": "<2-3 sentence balanced IC-style note: what changed and what to watch, no advice, no price targets>"}`;

  return completeJson(prompt, tryAnalysisSchema, { timeoutMs: 90_000 });
}
