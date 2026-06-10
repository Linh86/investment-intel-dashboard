import { z } from "zod";

// Deterministic DEMO_MODE triage: keyword rules instead of an LLM call, so the
// demo runs offline with no API keys. A live LLM implementation lands behind
// the same schema in M2+.
export const TRIAGE_MODEL = "demo-rules (DEMO_MODE)";
export const TRIAGE_PROMPT_VERSION = "triage-rules.v0";

export const classificationSchema = z.object({
  ticker: z.string().min(1),
  type: z.enum(["news", "filing", "regulatory", "analyst", "supply-chain"]),
  urgency: z.enum(["high", "medium", "low"]),
  relevance: z.enum(["high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
});

export type Classification = z.infer<typeof classificationSchema>;

// Alias map rather than company-name matching: headlines say "TSMC", not
// "Taiwan Semiconductor Manufacturing Company".
const TICKER_ALIASES: Record<string, string[]> = {
  NVDA: ["nvidia"],
  TSM: ["tsmc", "taiwan semiconductor"],
  ASML: ["asml"],
  VRT: ["vertiv"],
  CEG: ["constellation"],
};

const TYPE_RULES: { type: Classification["type"]; keywords: string[] }[] = [
  { type: "regulatory", keywords: ["export", "regulat", "licens", "policy", "uprate"] },
  { type: "filing", keywords: ["filing", "files", "disclosure", "10-q", "revenue report"] },
  { type: "analyst", keywords: ["analyst", "commentary", "checks", "sell-side"] },
  { type: "supply-chain", keywords: ["capacity", "supply", "packaging", "backlog", "allocation"] },
];

const URGENCY_BY_TYPE: Record<Classification["type"], Classification["urgency"]> = {
  regulatory: "high",
  "supply-chain": "medium",
  filing: "medium",
  news: "medium",
  analyst: "low",
};

export interface TriageInput {
  title: string;
  snippet: string;
}

// Returns null when no watchlist company matches; the pipeline records the
// item as skipped instead of inventing a classification.
export function classifyRawItem(
  item: TriageInput,
  watchlistTickers: string[],
): Classification | null {
  const title = item.title.toLowerCase();
  const snippet = item.snippet.toLowerCase();

  let ticker: string | null = null;
  let matchedAlias = "";
  let inTitle = false;
  for (const candidate of watchlistTickers) {
    for (const alias of TICKER_ALIASES[candidate] ?? [candidate.toLowerCase()]) {
      if (title.includes(alias)) {
        ticker = candidate;
        matchedAlias = alias;
        inTitle = true;
        break;
      }
      if (!ticker && snippet.includes(alias)) {
        ticker = candidate;
        matchedAlias = alias;
      }
    }
    if (inTitle) break;
  }
  if (!ticker) return null;

  let type: Classification["type"] = "news";
  let matchedKeyword = "";
  outer: for (const rule of TYPE_RULES) {
    for (const keyword of rule.keywords) {
      if (title.includes(keyword) || snippet.includes(keyword)) {
        type = rule.type;
        matchedKeyword = keyword;
        break outer;
      }
    }
  }

  const urgency =
    title.includes("export") || snippet.includes("export")
      ? "high"
      : URGENCY_BY_TYPE[type];
  const relevance = type === "analyst" ? "medium" : inTitle ? "high" : "medium";

  return classificationSchema.parse({
    ticker,
    type,
    urgency,
    relevance,
    confidence: inTitle ? 0.9 : 0.7,
    rationale: `Matched ${ticker} via "${matchedAlias}" in the ${inTitle ? "title" : "snippet"}; classified ${type}${matchedKeyword ? ` due to "${matchedKeyword}"` : " by default"}.`,
  });
}
