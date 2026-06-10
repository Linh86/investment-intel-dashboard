import type { BriefContent } from "./schema";

// Deterministic compliance lint — plain code, no LLM. Every rule runs at
// generation time and again at publish time; a brief never ships unchecked.
export const FORBIDDEN_PHRASES = [
  "will outperform",
  "guaranteed",
  "you should buy",
  "you should sell",
  "expect returns",
  "risk-free",
  "cannot lose",
  "act now",
  "sure thing",
  "we recommend",
  "overweight",
  "underweight",
] as const;

// Collapse whitespace (incl. NBSP and line breaks) and hyphens so that
// "will  outperform", "will-outperform" and "will\noutperform" all match.
// Applied to phrases and scanned text alike, so "risk-free" still matches.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s -]+/g, " ");
}

export const BRIEF_LINT_RULES_COUNT = 5;

export interface LintViolation {
  rule: string;
  detail: string;
}

export interface LintResult {
  ok: boolean;
  violations: LintViolation[];
}

export function lintBriefContent(content: BriefContent): LintResult {
  const violations: LintViolation[] = [];

  // Rule 1: no promissory or advice language anywhere in client-visible text —
  // including source names and disclosure copy, which render on the client page.
  const claimTexts = (
    section: string,
    items: BriefContent["whatChanged"],
  ): { where: string; text: string }[] =>
    items.flatMap((item) => [
      { where: `${section} (${item.claimId})`, text: item.text },
      ...item.sources.map((source) => ({
        where: `${section} source name (${item.claimId})`,
        text: source.name,
      })),
    ]);
  const texts: { where: string; text: string }[] = [
    { where: "period", text: content.period },
    ...content.exposure.themes.map((theme) => ({
      where: `exposure note (${theme.key})`,
      text: theme.note,
    })),
    ...content.themes.map((theme) => ({
      where: `theme thesis (${theme.label})`,
      text: theme.thesis,
    })),
    ...claimTexts("whatChanged", content.whatChanged),
    ...claimTexts("risksMonitored", content.risksMonitored),
    ...content.disclosures.blocks.map((block) => ({
      where: `disclosure (${block.key})`,
      text: block.text,
    })),
  ];
  for (const { where, text } of texts) {
    const normalized = normalize(text);
    for (const phrase of FORBIDDEN_PHRASES) {
      if (normalized.includes(normalize(phrase))) {
        violations.push({
          rule: "forbidden-phrases",
          detail: `Forbidden phrase "${phrase}" in ${where}.`,
        });
      }
    }
  }

  // Rule 2: required disclosure blocks, including the segment's jurisdiction.
  const present = new Set(content.disclosures.blocks.map((block) => block.key));
  const required = [
    "informational",
    "ai-assistance",
    "demo-synthetic",
    content.segment.jurisdiction,
  ];
  for (const key of required) {
    if (!present.has(key)) {
      violations.push({
        rule: "required-disclosures",
        detail: `Missing disclosure block "${key}".`,
      });
    }
  }

  // Rule 3: balance — reported changes must come with monitored risks.
  if (content.whatChanged.length > 0 && content.risksMonitored.length === 0) {
    violations.push({
      rule: "balance",
      detail: "whatChanged has items but risksMonitored is empty.",
    });
  }

  // Rule 4: every client-facing statement traces to a claim and a source.
  const sections: [string, BriefContent["whatChanged"]][] = [
    ["whatChanged", content.whatChanged],
    ["risksMonitored", content.risksMonitored],
  ];
  for (const [section, items] of sections) {
    items.forEach((item, index) => {
      if (item.claimId.trim().length === 0) {
        violations.push({
          rule: "claim-provenance",
          detail: `${section}[${index}] has no claimId.`,
        });
      }
      if (item.sources.length === 0) {
        violations.push({
          rule: "claim-provenance",
          detail: `${section}[${index}] has no sources.`,
        });
      }
    });
  }

  // Rule 5: every theme carries an analyst-authored thesis.
  for (const theme of content.themes) {
    if (theme.thesis.trim().length === 0) {
      violations.push({
        rule: "theme-thesis",
        detail: `Theme "${theme.label}" has an empty thesis.`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
