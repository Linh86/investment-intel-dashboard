import { z } from "zod";
import { completeJson } from "./claude";
import type { Classification } from "../pipeline/triage";

export const TRIAGE_CLAUDE_MODEL = "claude-cli (Claude Code)";
export const TRIAGE_CLAUDE_PROMPT_VERSION = "triage-claude.v1";

const batchItemSchema = z.object({
  id: z.string(),
  ticker: z.string().nullable(),
  type: z
    .enum(["news", "filing", "regulatory", "analyst", "supply-chain"])
    .nullable(),
  urgency: z.enum(["high", "medium", "low"]).nullable(),
  relevance: z.enum(["high", "medium", "low"]).nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export interface BatchInput {
  id: string;
  title: string;
  snippet: string;
}

// One Claude call classifies the whole pending batch. Items with no watchlist
// match come back with ticker null and are mapped to a skip (null), matching
// the deterministic classifier's contract exactly.
export async function classifyBatchWithClaude(
  items: BatchInput[],
  watchlistTickers: string[],
): Promise<Map<string, Classification | null>> {
  const list = items
    .map((item) => `- id ${item.id}: "${item.title}" — ${item.snippet}`)
    .join("\n");
  const prompt = `You are the triage agent in an investment research pipeline for a fund focused on AI infrastructure, energy, and semiconductors.

Watchlist tickers: ${watchlistTickers.join(", ")}.

Classify each item below. If an item concerns a watchlist company, set its ticker. If it does not concern any watchlist company, set ticker null (it will be skipped). type, urgency, relevance reflect a research desk's view; confidence is 0..1; rationale is one sentence.

Items:
${list}

Return strict JSON only — an array with one object per item, no prose, no markdown:
[{"id": "<the id>", "ticker": "<watchlist symbol or null>", "type": "news|filing|regulatory|analyst|supply-chain" or null, "urgency": "high|medium|low" or null, "relevance": "high|medium|low" or null, "confidence": <0..1>, "rationale": "<one sentence>"}]`;

  const rows = await completeJson(prompt, z.array(batchItemSchema), {
    timeoutMs: 120_000,
  });

  const allowed = new Set(watchlistTickers);
  const byId = new Map<string, Classification | null>();
  for (const row of rows) {
    if (!row.ticker || !allowed.has(row.ticker) || !row.type) {
      byId.set(row.id, null);
      continue;
    }
    byId.set(row.id, {
      ticker: row.ticker,
      type: row.type,
      urgency: row.urgency ?? "medium",
      relevance: row.relevance ?? "medium",
      confidence: row.confidence,
      rationale: row.rationale,
    });
  }
  return byId;
}
