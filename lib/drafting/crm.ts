import { z } from "zod";
import { riskBandLabel } from "../scoring/score";

// Deterministic DEMO_MODE CRM drafter. Output is informational client-service
// preparation — balanced language, no advice, no predictions.
export const CRM_MODEL = "demo-rules (DEMO_MODE)";
export const CRM_PROMPT_VERSION = "crm-rules.v0";

export const crmDraftContentSchema = z.object({
  ticker: z.string(),
  segmentId: z.string(),
  segmentName: z.string(),
  jurisdiction: z.string(),
  linkedMemoId: z.string(),
  sourceSignalIds: z.array(z.string()).min(1),
  task: z.object({
    subject: z.string(),
    body: z.string(),
    priority: z.enum(["high", "medium"]),
    dueDate: z.string(),
  }),
  emailDraft: z.object({
    subject: z.string(),
    body: z.string(),
  }),
});

export type CrmDraftContent = z.infer<typeof crmDraftContentSchema>;

export function draftCrmFollowUp(input: {
  company: { ticker: string; name: string; sector: string };
  composite: number;
  previous: number;
  driverSignalId: string;
  driverHeadline: string;
  segment: { id: string; name: string; jurisdiction: string };
  linkedMemoId: string;
  now: Date;
}): CrmDraftContent {
  const { company, composite, previous, segment } = input;
  const direction = composite > previous ? "increased" : "decreased";
  const dueDate = new Date(input.now.getTime() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return crmDraftContentSchema.parse({
    ticker: company.ticker,
    segmentId: segment.id,
    segmentName: segment.name,
    jurisdiction: segment.jurisdiction,
    linkedMemoId: input.linkedMemoId,
    sourceSignalIds: [input.driverSignalId],
    task: {
      subject: `Prepare ${segment.name} update on ${company.ticker} risk change`,
      body: `Composite risk for ${company.name} ${direction} from ${previous} to ${composite} (${riskBandLabel(composite)}) following: "${input.driverHeadline}" [${input.driverSignalId}]. Review the linked IC memo (${input.linkedMemoId}) and prepare balanced talking points covering both the monitored risk and the unchanged elements of the position rationale.`,
      priority: composite > previous ? "high" : "medium",
      dueDate,
    },
    emailDraft: {
      subject: `Portfolio note: recent developments relevant to ${company.ticker} exposure`,
      body:
        `Dear ${segment.name} team,\n\n` +
        `As part of our ongoing monitoring, we wanted to flag recent developments relevant to the portfolio's ${company.sector.toLowerCase()} exposure (${company.name}). Our internal risk view ${direction} this week; the position rationale and our monitoring focus are summarized in the attached note, with sources cited for each point.\n\n` +
        `We are happy to walk through the details on our next scheduled call.\n\n` +
        `This message is for informational purposes only and is not investment advice.\n\n` +
        `— Research Desk (demo)`,
    },
  });
}
