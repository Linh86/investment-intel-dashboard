import { z } from "zod";

// Content contract for investor briefs. whatChanged/risksMonitored items carry
// the approved-claim id plus approval metadata so the published document is
// auditable back to the review queue — this is the transparency boundary.
export const briefClaimItemSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  approvedBy: z.string(),
  approvedAt: z.string(),
  sources: z.array(z.object({ name: z.string(), url: z.string() })).min(1),
});

export const briefContentSchema = z.object({
  segment: z.object({
    id: z.string(),
    name: z.string(),
    jurisdiction: z.string(),
  }),
  period: z.string(),
  generated: z.object({
    model: z.string(),
    promptVersion: z.string(),
    generatedAt: z.string(),
  }),
  exposure: z.object({
    asOf: z.string(),
    themes: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        weightPct: z.number(),
        tickers: z.array(z.string()),
        note: z.string(),
      }),
    ),
  }),
  themes: z.array(
    z.object({
      label: z.string(),
      tickers: z.array(z.string()),
      thesis: z.string(),
      authorship: z.literal("analyst-authored"),
    }),
  ),
  whatChanged: z.array(briefClaimItemSchema),
  risksMonitored: z.array(briefClaimItemSchema),
  disclosures: z.object({
    version: z.string(),
    blocks: z.array(z.object({ key: z.string(), text: z.string() })),
  }),
  compliance: z.object({
    passed: z.literal(true),
    rulesChecked: z.number(),
    checkedAt: z.string(),
  }),
});

export type BriefContent = z.infer<typeof briefContentSchema>;
export type BriefClaimItem = z.infer<typeof briefClaimItemSchema>;
