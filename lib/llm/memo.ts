import { memoContentSchema, type MemoContent } from "../drafting/memo";
import type { AssessmentResult } from "../scoring/score";
import { completeJson } from "./claude";

export const MEMO_CLAUDE_MODEL = "claude-cli (Claude Code)";
export const MEMO_CLAUDE_PROMPT_VERSION = "memo-claude.v1";

// Claude writes the IC memo, validated against the SAME zod schema the
// deterministic drafter satisfies — citations must reference the signal ids
// that actually moved the score, so provenance still holds.
export async function draftMemoWithClaude(input: {
  company: { ticker: string; name: string; watchReason: string };
  assessment: AssessmentResult;
}): Promise<MemoContent> {
  const { company, assessment } = input;
  const evidence = assessment.subscores
    .flatMap((subscore) =>
      subscore.evidence.map((item) => ({
        dimension: subscore.dimension,
        signalId: item.signalId,
        delta: item.delta,
        quote: item.quote,
      })),
    )
    .filter((item) => item.delta !== 0);
  const validIds = evidence.map((item) => item.signalId);
  const evidenceList = evidence
    .map(
      (item) =>
        `- ${item.signalId} (${item.dimension}, risk ${item.delta > 0 ? "+" : ""}${item.delta}): "${item.quote}"`,
    )
    .join("\n");
  const subscoreList = assessment.subscores
    .map((s) => `${s.dimension}: ${s.baseline} -> ${s.score}`)
    .join(", ");

  const prompt = `You are the memo writer in an investment research pipeline. Write a balanced, IC-ready memo for ${company.name} (${company.ticker}). This is informational research, not advice — no price targets, no buy/sell recommendations.

Why we watch it: ${company.watchReason}
Composite risk this run: ${assessment.previous} -> ${assessment.composite} (0-100, higher = more risk).
Subscores: ${subscoreList}.
Evidence (cite ONLY these signal ids):
${evidenceList}

Return strict JSON only, no prose, no markdown, exactly:
{"ticker": "${company.ticker}", "thesis": "<2-3 sentences>", "keyChanges": [{"text": "<what changed>", "signalIds": ["<id from the list>"]}], "scenarios": {"bull": "<sentence>", "base": "<sentence>", "bear": "<sentence>"}, "catalysts": [{"text": "<catalyst>", "signalIds": ["<id>"]}], "risks": [{"text": "<risk being monitored>", "signalIds": ["<id>"]}], "icQuestions": ["<question>"], "whatWouldChangeOurMind": ["<condition>"]}

Every signalIds entry must be one of: ${validIds.join(", ")}. keyChanges and risks must each have at least one item with at least one cited id.`;

  return completeJson(prompt, memoContentSchema, { timeoutMs: 120_000 });
}
