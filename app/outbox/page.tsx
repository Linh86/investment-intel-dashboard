import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { PageHeader, Pill } from "@/components/ui";
import { getArtifacts } from "@/lib/data";
import type { ArtifactView } from "@/lib/data";
import { crmDraftContentSchema } from "@/lib/drafting/crm";
import type { CrmDraftContent } from "@/lib/drafting/crm";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "CRM Outbox" };
export const dynamic = "force-dynamic";

// HubSpot-task-shaped payload. No live push — the outbox is the deliverable;
// a webhook/n8n step can pick these up in a real deployment.
function hubspotShaped(artifact: ArtifactView, content: CrmDraftContent) {
  return {
    source: "investment-intel-dashboard (demo)",
    hubspot: {
      engagement: { type: "TASK" },
      task: {
        subject: content.task.subject,
        body: content.task.body,
        priority: content.task.priority.toUpperCase(),
        dueDate: content.task.dueDate,
        status: "NOT_STARTED",
      },
      associations: {
        companyTicker: content.ticker,
        clientSegment: content.segmentName,
      },
    },
    emailDraft: content.emailDraft,
    governance: {
      linkedMemo: content.linkedMemoId,
      sourceSignals: content.sourceSignalIds,
      approvedBy: artifact.approval?.reviewer ?? null,
      approvedAt: artifact.approval?.decidedAt ?? null,
      disclaimer:
        "Synthetic demo data - fictional client. Not investment advice.",
    },
  };
}

export default function OutboxPage() {
  const approved = getArtifacts({ status: "approved", type: "crm-draft" });
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="CRM Outbox"
        description="Human-approved CRM follow-ups as HubSpot-shaped JSON. Only approved drafts ever appear here — rejected ones never leave the review queue."
      />

      {approved.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
          Nothing approved yet. Approve a CRM follow-up in the review queue and
          it lands here as CRM-ready JSON.
        </section>
      ) : (
        <ol className="flex flex-col gap-4">
          {approved.map((artifact) => {
            const content = crmDraftContentSchema.parse(
              JSON.parse(artifact.contentJson),
            );
            const payload = JSON.stringify(
              hubspotShaped(artifact, content),
              null,
              2,
            );
            return (
              <li
                key={artifact.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="emerald">Approved</Pill>
                  <span className="font-mono text-xs text-slate-500">
                    {artifact.id}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {artifact.title}
                  </span>
                  <span className="ml-auto text-xs text-slate-600">
                    {artifact.approval
                      ? `by ${artifact.approval.reviewer} · ${formatDateTime(artifact.approval.decidedAt)}`
                      : ""}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-slate-800/70 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
                    {payload}
                  </pre>
                  <CopyButton text={payload} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
